/**
 * server/services/clauseMatchService.js
 *
 * Given a CAR's description text and nonconformance flags, uses Gemini AI
 * (or a keyword-based fallback) to suggest the most relevant active ISO
 * standard clauses from the database.
 *
 * Returns an ordered array of:
 *   { clause_id, clause_number, title, confidence }
 */

import { supabase } from '../lib/supabase.js'

const MAX_SUGGESTIONS = 5

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Fetches all active ISO clauses with their group/standard context.
 */
async function fetchActiveClauses() {
  const { data, error } = await supabase
    .from('iso_clauses')
    .select('id, clause_number, title, description, group_id')
    .eq('is_active', true)
    .order('clause_number', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Keyword-based fallback scorer.
 * Splits description into tokens and counts how many appear in each clause's
 * title + description. Returns top MAX_SUGGESTIONS results.
 */
function keywordFallback(description, flags, clauses) {
  const descTokens = (description || '')
    .toLowerCase()
    .split(/\W+/)
    .filter(t => t.length > 3)

  // Augment tokens from boolean flags
  const flagKeywords = []
  if (flags?.internal_audit)                   flagKeywords.push('audit', 'internal', 'monitoring')
  if (flags?.quality_food_safety)              flagKeywords.push('quality', 'food', 'safety', 'product')
  if (flags?.environment_health_safety)        flagKeywords.push('environment', 'health', 'safety', 'hazard')
  if (flags?.security_issue)                   flagKeywords.push('security', 'access', 'control')
  if (flags?.customer_complaint)               flagKeywords.push('customer', 'satisfaction', 'complaint', 'feedback')
  if (flags?.vendor_nonconformance)            flagKeywords.push('supplier', 'vendor', 'external', 'procurement')
  if (flags?.government_agency_audit)          flagKeywords.push('regulatory', 'legal', 'compliance', 'government')
  if (flags?.customer_audit_nonconformance)    flagKeywords.push('customer', 'audit', 'nonconformance')

  const allTokens = [...descTokens, ...flagKeywords]

  const scored = clauses.map(clause => {
    const haystack = `${clause.clause_number} ${clause.title} ${clause.description || ''}`.toLowerCase()
    let hits = 0
    for (const token of allTokens) {
      if (haystack.includes(token)) hits++
    }
    const confidence = Math.min(1, hits / Math.max(allTokens.length, 1))
    return { clause_id: clause.id, clause_number: clause.clause_number, title: clause.title, confidence }
  })

  return scored
    .filter(s => s.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, MAX_SUGGESTIONS)
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Suggests ISO clauses that best match a CAR's non-conformance description.
 *
 * @param {string}  description  - The "details_of_nonconformance" text
 * @param {object}  flags        - Boolean flags from the CAR form
 * @returns {Array<{ clause_id, clause_number, title, confidence }>}
 */
export async function suggestClausesForCar({ description, flags = {} }) {
  const clauses = await fetchActiveClauses()

  if (!clauses.length) return []

  const apiKey = process.env.GEMINI_API_KEY

  if (!apiKey) {
    console.warn('[clauseMatchService] GEMINI_API_KEY not set — using keyword fallback.')
    return keywordFallback(description, flags, clauses)
  }

  // Build clause reference list for the prompt (cap at 80 to keep prompt manageable)
  const clauseList = clauses.slice(0, 80).map(c =>
    `{ "id": ${c.id}, "clause_number": "${c.clause_number}", "title": "${c.title}"${c.description ? `, "description": "${c.description.slice(0, 120)}"` : ''} }`
  ).join(',\n')

  const flagSummary = Object.entries(flags)
    .filter(([, v]) => v === true)
    .map(([k]) => k.replace(/_/g, ' '))
    .join(', ') || 'none'

  const prompt = `You are a quality management expert. Given the following Corrective Action Report (CAR) details, identify the top ${MAX_SUGGESTIONS} most relevant ISO standard clauses from the provided clause list.

CAR Details:
- Non-conformance description: "${description}"
- Non-conformance type flags: ${flagSummary}

Available ISO Clauses (JSON array):
[
${clauseList}
]

Return ONLY a JSON array of the top ${MAX_SUGGESTIONS} matching clauses, ordered from most to least relevant, with a confidence score between 0.0 and 1.0. Use this exact format with no preamble or markdown:
[{"clause_id": 5, "clause_number": "8.5.2", "title": "Corrective Action", "confidence": 0.95}, ...]`

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.statusText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Validate each result references an actual clause id we provided
    const validIds = new Set(clauses.map(c => c.id))
    return parsed
      .filter(s => validIds.has(s.clause_id) && typeof s.confidence === 'number')
      .slice(0, MAX_SUGGESTIONS)

  } catch (err) {
    console.error('[clauseMatchService] Gemini failed, using keyword fallback:', err.message)
    return keywordFallback(description, flags, clauses)
  }
}

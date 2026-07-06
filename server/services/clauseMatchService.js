import { supabase } from '../lib/supabase.js'
import { CAR_STATUS } from '../../shared/constants.js'
import { extractKeywords, jaccardSimilarity } from '../utils/cbr.js'

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
 * Semantic / Lexical Matching Engine
 * Splits description into tokens and counts how many appear in each clause's
 * title + description based on rule-based flags. Returns scored results.
 */
function computeLexicalMatch(description, flags, clauses) {
  const descTokens = (description || '')
    .toLowerCase()
    .split(/\W+/)
    .filter(t => t.length > 3)

  // Augment tokens from boolean flags
  const flagKeywords = []
  if (flags?.internal_audit) flagKeywords.push('audit', 'internal', 'monitoring')
  if (flags?.quality_food_safety) flagKeywords.push('quality', 'food', 'safety', 'product')
  if (flags?.environment_health_safety) flagKeywords.push('environment', 'health', 'safety', 'hazard')
  if (flags?.security_issue) flagKeywords.push('security', 'access', 'control')
  if (flags?.customer_complaint) flagKeywords.push('customer', 'satisfaction', 'complaint', 'feedback')
  if (flags?.vendor_nonconformance) flagKeywords.push('supplier', 'vendor', 'external', 'procurement')
  if (flags?.government_agency_audit) flagKeywords.push('regulatory', 'legal', 'compliance', 'government')
  if (flags?.customer_audit_nonconformance) flagKeywords.push('customer', 'audit', 'nonconformance')

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
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Suggests ISO clauses that best match a CAR's non-conformance details.
 * Uses deterministic Semantic/Lexical Matching based on user input flags and text,
 * mapping directly to the official ISO clauses.
 *
 * @param {string}  description  - The "details_of_nonconformance" text (optional)
 * @param {object}  flags        - Boolean flags from the CAR form checkboxes
 * @returns {Array<{ clause_id, clause_number, title, confidence }>}
 */
export async function suggestClausesForCar({ description, flags = {} }) {
  try {
    const clauses = await fetchActiveClauses()
    if (!clauses.length) return []

    // Use lexical matching against the ISO Clause text based on checkboxes and input
    const results = computeLexicalMatch(description, flags, clauses)

    return results.slice(0, MAX_SUGGESTIONS)

  } catch (err) {
    console.error('[clauseMatchService] clause matching failed:', err.message)
    throw err
  }
}

/**
 * Suggests ISO clauses that best match a QDDR's discrepancy details.
 */
export async function suggestClausesForQddr({ description, flags = {} }) {
  try {
    const clauses = await fetchActiveClauses()
    if (!clauses.length) return []

    const results = computeLexicalMatch(description, flags, clauses)

    return results.slice(0, MAX_SUGGESTIONS)

  } catch (err) {
    console.error('[clauseMatchService] clause matching failed for QDDR:', err.message)
    throw err
  }
}

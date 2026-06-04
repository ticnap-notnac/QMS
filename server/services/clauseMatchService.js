import { supabase } from '../lib/supabase.js'
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
 * Keyword-based fallback scorer.
 * Splits description into tokens and counts how many appear in each clause's
 * title + description. Returns scored results.
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
}

/**
 * Computes CBR similarity score between the current CAR prompt details
 * and a historical closed CAR.
 */
function computeCarCbrScore(current, past) {
  // 1. Keyword Jaccard Similarity of non-conformance description (weight: 0.6)
  const currentKw = extractKeywords(current.description)
  const pastKw = extractKeywords(past.details_of_nonconformance || '')
  const keywordScore = jaccardSimilarity(currentKw, pastKw)

  // 2. Non-conformance Type Flags match (weight: 0.4)
  const flagsToCheck = [
    'quality_food_safety',
    'environment_health_safety',
    'security_issue',
    'internal_audit',
    'customer_complaint',
    'government_agency_audit',
    'customer_audit_nonconformance',
    'vendor_nonconformance'
  ]

  let matchCount = 0
  let totalChecked = 0

  for (const flag of flagsToCheck) {
    const currentVal = Boolean(current.flags?.[flag])
    const pastVal = Boolean(past[flag])
    if (currentVal || pastVal) {
      totalChecked++
      if (currentVal && pastVal) {
        matchCount++
      }
    }
  }

  const flagScore = totalChecked > 0 ? (matchCount / totalChecked) : 0.0

  return 0.6 * keywordScore + 0.4 * flagScore
}

// ─── Main Export ──────────────────────────────────────────────────────────────

/**
 * Suggests ISO clauses that best match a CAR's non-conformance description.
 * Uses local Case-Based Reasoning (CBR) by scoring current details against
 * historical CARs and their linked ISO clauses, falling back to direct keyword match.
 *
 * @param {string}  description  - The "details_of_nonconformance" text
 * @param {object}  flags        - Boolean flags from the CAR form
 * @returns {Array<{ clause_id, clause_number, title, confidence }>}
 */
export async function suggestClausesForCar({ description, flags = {} }) {
  try {
    const clauses = await fetchActiveClauses()
    if (!clauses.length) return []

    const clausesMap = new Map(clauses.map(c => [c.id, c]))

    // 1. Fetch historical closed CARs with their linked clauses
    const { data: pastCars, error: pastCarsError } = await supabase
      .from('car_reports')
      .select(`
        id,
        details_of_nonconformance,
        status,
        quality_food_safety,
        environment_health_safety,
        security_issue,
        internal_audit,
        customer_complaint,
        government_agency_audit,
        customer_audit_nonconformance,
        vendor_nonconformance,
        car_clause_links (
          clause_id
        )
      `)
      .eq('status', 'closed')

    if (pastCarsError) {
      console.warn('[clauseMatchService] Failed to fetch past CARs for CBR matching:', pastCarsError.message)
    }

    const clauseScores = {} // Map of clause_id -> { clause_id, score, count }

    // 2. Score historical CARs and accumulate clause recommendations
    if (pastCars && pastCars.length > 0) {
      for (const past of pastCars) {
        const similarity = computeCarCbrScore({ description, flags }, past)
        if (similarity < 0.15) continue // Threshold to ignore irrelevant matches

        const links = past.car_clause_links || []
        for (const link of links) {
          const cid = link.clause_id
          if (!clauseScores[cid]) {
            clauseScores[cid] = { clause_id: cid, score: 0, count: 0 }
          }
          // Aggregate score based on similarity
          clauseScores[cid].score += similarity
          clauseScores[cid].count += 1
        }
      }
    }

    // Rank clauses from CBR matching
    const cbrSuggestions = Object.values(clauseScores)
      .map(item => {
        const c = clausesMap.get(item.clause_id)
        if (!c) return null
        const averageSim = item.score / item.count
        return {
          clause_id: c.id,
          clause_number: c.clause_number,
          title: c.title,
          confidence: Math.min(1.0, averageSim)
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.confidence - a.confidence)

    // 3. Fallback / Fill up with keyword direct-clause matching if necessary
    const results = [...cbrSuggestions]

    if (results.length < MAX_SUGGESTIONS) {
      const keywordResults = keywordFallback(description, flags, clauses)
      
      // Add keyword fallback suggestions that are not already in CBR results
      const existingIds = new Set(results.map(r => r.clause_id))
      for (const kwRes of keywordResults) {
        if (!existingIds.has(kwRes.clause_id)) {
          results.push(kwRes)
          if (results.length >= MAX_SUGGESTIONS) break
        }
      }
    }

    return results.slice(0, MAX_SUGGESTIONS)

  } catch (err) {
    console.error('[clauseMatchService] CBR suggestion failed, using basic keyword fallback:', err.message)
    try {
      const clauses = await fetchActiveClauses()
      return keywordFallback(description, flags, clauses).slice(0, MAX_SUGGESTIONS)
    } catch (fallbackErr) {
      console.error('[clauseMatchService] Complete fallback failed:', fallbackErr.message)
      return []
    }
  }
}

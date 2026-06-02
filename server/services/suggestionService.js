/**
 * server/services/suggestionService.js
 *
 * CBR-powered corrective action suggestion engine.
 *
 * CBR Steps:
 *   RETRIEVE  → Score ALL candidates (case_repository + rated NCRs) via computeCBRScore()
 *   REUSE     → Return the highest-scoring candidate's corrective_action
 *   REVISE    → Investigator edits via UpdateReportModal (no code needed here)
 *   RETAIN    → Handled in ncrReportsService.submitReportRating()
 *
 * If the best CBR match scores below the MIN_CBR_SCORE threshold, falls back to
 * Claude AI which uses all mined data as context.
 */

import { supabase } from '../lib/supabase.js'
import { extractKeywords, retrieveBestMatch } from '../utils/cbr.js'

/** Minimum CBR score to use a past case instead of falling back to AI */
const MIN_CBR_SCORE = 0.2

// ─── Data Fetchers ─────────────────────────────────────────────────────────────

async function fetchReportById(ncrId) {
  const { data, error } = await supabase
    .from('ncr_reports')
    .select(
      'issue_type, department_id, description, severity, ' +
      'investigation_details, corrective_action, resolution_details, product_type'
    )
    .eq('id', ncrId)
    .single()

  if (error) throw error
  return data
}

/**
 * Fetches candidates from case_repository.
 * Filters by issue_type if available (prioritise same category),
 * but fetches broadly (up to 50) so CBR can score them all.
 */
async function fetchCaseRepositoryCandidates(issueType) {
  let query = supabase
    .from('case_repository')
    .select(
      'id, corrective_action, preventive_action, effectiveness_score, ' +
      'problem_keywords, issue_type, times_used, severity, department_id, product_type'
    )
    .not('corrective_action', 'is', null)
    .order('effectiveness_score', { ascending: false })
    .limit(50)

  if (issueType) {
    query = query.eq('issue_type', issueType)
  }

  const { data, error } = await query
  if (error) throw error
  return data || []
}

/**
 * Fetches closed NCR reports that have an average rating >= 3.
 * These act as additional CBR candidates alongside the case_repository.
 */
async function fetchRatedNcrCandidates() {
  const { data: ratings, error: ratingsError } = await supabase
    .from('ncr_report_ratings')
    .select('report_id, rating')
    .gte('rating', 3)

  if (ratingsError) throw ratingsError

  // Compute per-report averages
  const ratingMap = {}
  for (const r of ratings || []) {
    if (!ratingMap[r.report_id]) ratingMap[r.report_id] = { total: 0, count: 0 }
    ratingMap[r.report_id].total += r.rating
    ratingMap[r.report_id].count += 1
  }

  const qualifiedIds = Object.entries(ratingMap)
    .filter(([, v]) => v.total / v.count >= 3)
    .map(([id]) => Number(id))

  if (qualifiedIds.length === 0) return []

  const { data, error } = await supabase
    .from('ncr_reports')
    .select(
      'id, description, issue_type, severity, department_id, product_type, ' +
      'investigation_details, corrective_action, resolution_details'
    )
    .in('id', qualifiedIds)
    .eq('status', 'CLOSED')
    .not('investigation_details', 'is', null)
    .limit(30)

  if (error) throw error
  return data || []
}

async function fetchCarReports(departmentId) {
  const { data, error } = await supabase
    .from('car_reports')
    .select(
      'details_of_nonconformance, re_corrective_action, ' +
      'requesting_department, responsible_department, status'
    )
    .eq('status', 'closed')
    .limit(3)

  if (error) throw error
  return data || []
}

async function fetchQddrReports(departmentId) {
  const { data, error } = await supabase
    .from('qddr_reports')
    .select('reason_of_discrepancy, corrective_action, preventive_action, status')
    .eq('status', 'closed')
    .limit(3)

  if (error) throw error
  return data || []
}

// ─── Main Export: findSimilarCases ────────────────────────────────────────────

/**
 * CBR RETRIEVE step orchestrator.
 *
 * 1. Fetch the current NCR report (the "problem")
 * 2. Fetch all case_repository candidates + rated NCR candidates
 * 3. Normalise rated NCRs into case-like shape
 * 4. Run retrieveBestMatch() to score and rank all candidates
 * 5. Return bestMatch + raw data for AI fallback context
 *
 * @param {string|number} ncrId
 */
export async function findSimilarCases(ncrId) {
  const report = await fetchReportById(ncrId)

  const [caseRepoCandidates, ratedNcrCandidates, carReports, qddrReports] = await Promise.all([
    fetchCaseRepositoryCandidates(report.issue_type),
    fetchRatedNcrCandidates(),
    fetchCarReports(report.department_id),
    fetchQddrReports(report.department_id),
  ])

  // Normalise rated NCRs to the same shape as case_repository rows
  // so retrieveBestMatch() can score them uniformly
  const ratedNcrAsCases = ratedNcrCandidates.map(ncr => ({
    corrective_action: ncr.corrective_action || ncr.investigation_details,
    preventive_action: ncr.resolution_details,
    problem_keywords:  ncr.description,   // full description used as keyword source
    issue_type:        ncr.issue_type,
    severity:          ncr.severity,
    department_id:     ncr.department_id,
    product_type:      ncr.product_type,
    effectiveness_score: null,            // no explicit score; relies on rating qualification
    times_used: 1,
    source: 'ncr',
  }))

  const allCandidates = [
    ...caseRepoCandidates.map(c => ({ ...c, source: 'repository' })),
    ...ratedNcrAsCases,
  ]

  // ── CBR RETRIEVE ──────────────────────────────────────────────────────────
  const bestMatch = retrieveBestMatch(report, allCandidates)

  return {
    report,
    bestMatch,               // top CBR result (includes cbr_score + matched_features)
    minCbrScore: MIN_CBR_SCORE,
    caseRepo:   caseRepoCandidates,  // raw data kept for AI fallback context
    ratedNcrs:  ratedNcrCandidates,
    carReports,
    qddrReports,
  }
}

// ─── Cache Helpers ─────────────────────────────────────────────────────────────

export async function getCachedSuggestion(ncrId) {
  const { data, error } = await supabase
    .from('ai_predictions')
    .select('ai_suggestion, confidence_score, created_at')
    .eq('ncr_id', ncrId)
    .eq('prediction_type', 'corrective_action')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data || null
}

export async function storeSuggestion({ ncrId, suggestion, confidence }) {
  if (!ncrId || !suggestion) throw new Error('ncr_id and suggestion are required')

  const { error } = await supabase
    .from('ai_predictions')
    .insert({
      ncr_id:          ncrId,
      ai_suggestion:   suggestion,
      confidence_score: confidence,
      prediction_type: 'corrective_action',
      predicted_risk:  'corrective',
    })

  if (error) throw error
}
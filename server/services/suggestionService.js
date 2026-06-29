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
 * Gemini AI which uses all mined data as context.
 */

import { supabase } from '../lib/supabase.js'
import { REPORT_STATUS, CAR_STATUS } from '../../shared/constants.js'
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
    .eq('status', REPORT_STATUS.CLOSED)
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
    .eq('status', CAR_STATUS.CLOSED)
    .limit(3)

  if (error) throw error
  return data || []
}

async function fetchQddrReports(departmentId) {
  const { data, error } = await supabase
    .from('qddr_reports')
    .select('reason_of_discrepancy, corrective_action, preventive_action, status')
    .eq('status', CAR_STATUS.CLOSED)
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
    .select('ai_suggestion, confidence_score, prediction_type, created_at')
    .eq('ncr_id', ncrId)
    .in('prediction_type', ['corrective_action', 'preventive_action'])
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!data || data.length === 0) return null

  // Map to correct properties
  const corrective = data.find(p => p.prediction_type === 'corrective_action')
  const preventive = data.find(p => p.prediction_type === 'preventive_action')

  if (!corrective) return null
  return {
    ai_suggestion: corrective.ai_suggestion,
    confidence_score: corrective.confidence_score,
    preventive_suggestion: preventive?.ai_suggestion || null,
    created_at: corrective.created_at,
  }
}

export async function storeSuggestion({ ncrId, suggestion, confidence, type = 'corrective_action' }) {
  if (!ncrId || !suggestion) throw new Error('ncr_id and suggestion are required')

  const { error } = await supabase
    .from('ai_predictions')
    .insert({
      ncr_id:          ncrId,
      ai_suggestion:   suggestion,
      confidence_score: confidence,
      prediction_type: type,
      predicted_risk:  'corrective',
    })

  if (error) throw error
}

function generateFallbackHeuristicSuggestion({ report, deptName }) {
  const issueType = (report.issue_type || '').toLowerCase();
  const desc = (report.description || '').toLowerCase();

  let suggestion = 'Perform a detailed root-cause investigation and verify that standard operating procedures are being followed. Retrain staff on the correct protocols.';
  let preventive_suggestion = 'Establish periodic audits and visual inspections to verify ongoing compliance. Implement a checklist for end-of-shift verification.';
  let confidence = 0.55;

  if (issueType.includes('security') || desc.includes('security') || desc.includes('unsecured') || desc.includes('patrol') || desc.includes('fire exit') || desc.includes('door') || desc.includes('push bar')) {
    suggestion = 'Immediately secure all entry points, repair the damaged push bar on the fire exit door, and request a patrol check to confirm building security.';
    preventive_suggestion = 'Implement daily checklist inspections of all security exit doors and establish automated alerts for doors left open or unsecured.';
    confidence = 0.75;
  } else if (issueType.includes('safety') || issueType.includes('health') || desc.includes('hazard') || desc.includes('injury') || desc.includes('accident')) {
    suggestion = 'Conduct a safety audit of the affected work area, isolate any malfunctioning equipment or hazards, and conduct an immediate safety briefing (toolbox talk) with all staff.';
    preventive_suggestion = 'Update the hazard identification register and perform monthly safety inspections of the area to verify preventative controls remain effective.';
    confidence = 0.65;
  } else if (issueType.includes('quality') || issueType.includes('food_safety') || desc.includes('contamination') || desc.includes('temp') || desc.includes('batch') || desc.includes('quality')) {
    suggestion = 'Isolate the affected batch, check storage temperature logs, and sanitize all contacting equipment surfaces before resuming production.';
    preventive_suggestion = 'Review and update the preventive maintenance schedule for cooling/heating systems and increase sampling frequency for quality checks.';
    confidence = 0.68;
  } else if (issueType.includes('audit') || desc.includes('audit') || desc.includes('finding')) {
    suggestion = 'Review non-conforming items identified in the audit report, update document controls, and coordinate with process owners to address the root causes.';
    preventive_suggestion = 'Schedule bi-annual internal mock audits and train department representatives as internal auditors to ensure constant audit readiness.';
    confidence = 0.60;
  } else if (issueType.includes('vendor') || desc.includes('vendor') || desc.includes('supplier')) {
    suggestion = 'Issue a formal supplier corrective action request (SCAR) to the vendor and hold/quarantine incoming materials pending inspection.';
    preventive_suggestion = 'Establish a vendor scorecard system, increase inspection level for new shipments, and revise incoming quality control acceptance criteria.';
    confidence = 0.62;
  }

  if (deptName) {
    suggestion += ` Coordinate response actions with the ${deptName} department.`;
  }

  return {
    suggestion,
    preventive_suggestion,
    confidence
  };
}

export async function generateAiSuggestion({ ncrId, deptName, previousSuggestions = [] }) {
  // 1. Fetch CBR similar cases context
  const context = await findSimilarCases(ncrId)
  const { report, caseRepo, ratedNcrs, carReports, qddrReports } = context

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured in process.env. Using rule-based fallback suggestion generator.')
    const fallback = generateFallbackHeuristicSuggestion({ report, deptName })
    try {
      await storeSuggestion({ ncrId, suggestion: fallback.suggestion, confidence: fallback.confidence, type: 'corrective_action' })
      if (fallback.preventive_suggestion) {
        await storeSuggestion({ ncrId, suggestion: fallback.preventive_suggestion, confidence: fallback.confidence, type: 'preventive_action' })
      }
    } catch (dbErr) {
      console.error('Failed to store fallback suggestion in database:', dbErr)
    }
    return fallback
  }

  try {
    // 2. Build Prompt
    let prompt = `You are a quality control expert. Suggest a corrective action and a preventive action for this NCR report using all available context.

NCR Report:
- Description: ${report.description}
- Issue Type: ${report.issue_type || 'N/A'}
- Severity: ${report.severity}
- Department: ${deptName || 'N/A'}
- Investigation: ${report.investigation_details || 'None'}

Case Repository Matches (CBR candidates):
${caseRepo.length > 0
    ? caseRepo.map((c, i) => `${i + 1}. Keywords: ${c.problem_keywords || 'N/A'} | Corrective Action: ${c.corrective_action} | Preventive Action: ${c.preventive_action || 'N/A'} | Score: ${c.effectiveness_score || 'N/A'}`).join('\n')
    : 'None'}

Rated NCR Reports (rating >= 3):
${ratedNcrs.length > 0
    ? ratedNcrs.map((r, i) => `${i + 1}. Description: ${r.description} | Corrective: ${r.corrective_action || 'N/A'} | Resolution/Preventive: ${r.resolution_details || 'N/A'}`).join('\n')
    : 'None'}

CAR Reports:
${carReports.length > 0
    ? carReports.map((c, i) => `${i + 1}. Issue: ${c.details_of_nonconformance || 'N/A'} | Action: ${c.re_corrective_action || 'N/A'}`).join('\n')
    : 'None'}

QDDR Reports:
${qddrReports.length > 0
    ? qddrReports.map((q, i) => `${i + 1}. Reason: ${q.reason_of_discrepancy || 'N/A'} | Corrective: ${q.corrective_action || 'N/A'} | Preventive: ${q.preventive_action || 'N/A'}`).join('\n')
    : 'None'}
`
    if (previousSuggestions && previousSuggestions.length > 0) {
      prompt += `\nIMPORTANT: Do NOT suggest any of the following corrective/preventive actions, as they were previously rejected by the user:\n`
      previousSuggestions.forEach(s => prompt += `- ${s}\n`)
    }

    prompt += `\nProvide a concise, actionable corrective action (for immediately addressing the current non-conformance) and a preventive action (to prevent recurrence in the future). Each action should be 2-4 sentences. Also provide a confidence score between 0.0 and 1.0 based on matches.
Respond ONLY in this JSON format with no preamble or markdown:
{"suggestion": "your corrective action suggestion here", "preventive_suggestion": "your preventive action suggestion here", "confidence": 0.85}`

    // 3. Make fetch request to Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API call failed: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    // Save suggestion to DB cache
    await storeSuggestion({ ncrId, suggestion: parsed.suggestion, confidence: parsed.confidence, type: 'corrective_action' })
    if (parsed.preventive_suggestion) {
      await storeSuggestion({ ncrId, suggestion: parsed.preventive_suggestion, confidence: parsed.confidence, type: 'preventive_action' })
    }

    return {
      suggestion: parsed.suggestion,
      preventive_suggestion: parsed.preventive_suggestion,
      confidence: parsed.confidence
    }
  } catch (err) {
    console.error('Gemini API or parsing failed. Falling back to rule-based suggestion. Error:', err)
    const fallback = generateFallbackHeuristicSuggestion({ report, deptName })
    try {
      await storeSuggestion({ ncrId, suggestion: fallback.suggestion, confidence: fallback.confidence, type: 'corrective_action' })
      if (fallback.preventive_suggestion) {
        await storeSuggestion({ ncrId, suggestion: fallback.preventive_suggestion, confidence: fallback.confidence, type: 'preventive_action' })
      }
    } catch (dbErr) {
      console.error('Failed to store fallback suggestion in database:', dbErr)
    }
    return fallback
  }
}

export async function generateAiSuggestionFromText({ description, issueType, deptName }) {
  const [caseRepoCandidates, ratedNcrCandidates, carReportsList, qddrReportsList] = await Promise.all([
    fetchCaseRepositoryCandidates(issueType),
    fetchRatedNcrCandidates(),
    fetchCarReports(null),
    fetchQddrReports(null),
  ])

  const ratedNcrAsCases = ratedNcrCandidates.map(ncr => ({
    corrective_action: ncr.corrective_action || ncr.investigation_details,
    preventive_action: ncr.resolution_details,
    problem_keywords:  ncr.description,
    issue_type:        ncr.issue_type,
    severity:          ncr.severity,
    department_id:     ncr.department_id,
    product_type:      ncr.product_type,
    effectiveness_score: null,
    times_used: 1,
    source: 'ncr',
  }))

  const allCandidates = [
    ...caseRepoCandidates.map(c => ({ ...c, source: 'repository' })),
    ...ratedNcrAsCases,
  ]

  const report = {
    description,
    issue_type: issueType,
    severity: 'Medium',
  }

  const bestMatch = retrieveBestMatch(report, allCandidates)
  const fallback = generateFallbackHeuristicSuggestion({ report, deptName })

  // ── CBR REUSE — use best match if score is above threshold ─
  if (bestMatch && bestMatch.cbr_score >= 0.2 && bestMatch.corrective_action) {
    const features = bestMatch.matched_features?.length > 0 ? bestMatch.matched_features : ['general similarity']
    const sourceLabel = bestMatch.source === 'repository' ? 'case repository' : 'past report'
    return {
      suggestion: bestMatch.corrective_action,
      preventive_suggestion: bestMatch.preventive_action || 'Implement standard verification and monitoring checks.',
      confidence: Math.min(bestMatch.cbr_score, 1),
      sourceDetails: `CBR Database (${sourceLabel})`,
      matchedFeatures: features
    }
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.warn('GEMINI_API_KEY is not configured. Using rule-based fallback.')
    return { ...fallback, sourceDetails: 'System Heuristics', matchedFeatures: [] }
  }

  try {
    const prompt = `You are a quality control expert. Suggest a corrective action and a preventive action for this issue using all available context.

Issue:
- Description: ${description}
- Category/Type: ${issueType || 'N/A'}
- Department: ${deptName || 'N/A'}

Case Repository Matches (CBR candidates):
${caseRepoCandidates.length > 0
    ? caseRepoCandidates.slice(0, 10).map((c, i) => `${i + 1}. Keywords: ${c.problem_keywords || 'N/A'} | Corrective Action: ${c.corrective_action} | Preventive Action: ${c.preventive_action || 'N/A'} | Score: ${c.effectiveness_score || 'N/A'}`).join('\n')
    : 'None'}

Provide a concise, actionable corrective action (for immediately addressing the current issue) and a preventive action (to prevent recurrence in the future). Each action should be 2-4 sentences. Also provide a confidence score between 0.0 and 1.0.
Respond ONLY in this JSON format with no preamble or markdown:
{"suggestion": "your corrective action suggestion here", "preventive_suggestion": "your preventive action suggestion here", "confidence": 0.85}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API call failed: ${response.statusText} - ${errorText}`)
    }

    const resData = await response.json()
    const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return {
      suggestion: parsed.suggestion,
      preventive_suggestion: parsed.preventive_suggestion,
      confidence: parsed.confidence,
      sourceDetails: 'Generative AI (Gemini)',
      matchedFeatures: []
    }
  } catch (err) {
    console.error('Gemini API failed for text suggestion. Falling back to rules.', err)
    return { ...fallback, sourceDetails: 'System Heuristics', matchedFeatures: [] }
  }
}
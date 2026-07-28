import { supabase } from '../lib/supabase.js'
import { REPORT_STATUS, CAR_STATUS } from '../../shared/constants.js'
import { extractKeywordsWithLLM, retrieveBestMatch, generateEmbedding } from '../utils/cbr.js'

/** Minimum CBR score to use a past case instead of falling back to AI */
const MIN_CBR_SCORE = 0.2

// ─── Data Fetchers ─────────────────────────────────────────────────────────────

async function fetchReportById(ncrId) {
  const { data, error } = await supabase
    .from('ncr_reports')
    .select(
      'issue_type_id, department_id, description, severity, ' +
      'investigation_details, corrective_action, resolution_details, product_type_id'
    )
    .eq('id', ncrId)
    .single()

  if (error) throw error
  return data
}

async function fetchCaseRepositoryCandidates(issueType, embedding = null) {
  if (embedding) {
    // Use the pgvector semantic search if we generated an embedding
    const { data, error } = await supabase.rpc('match_cases', {
      query_embedding: `[${embedding}]`,
      match_threshold: 0.0,
      match_count: 50
    })
    
    if (!error && data) {
      return data.map(d => ({ ...d, vector_distance: 1 - d.similarity }))
    }
  }

  let query = supabase
    .from('case_repository')
    .select(
      'id, corrective_action, preventive_action, effectiveness_score, ' +
      'issue_type, times_used, severity, department_id, product_type'
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
 * Orchestrates the CBR retrieve step by fetching candidates, scoring them, and returning the best match.
 *
 * @param {string|number} ncrId - The ID of the NCR report.
 * @returns {Promise<Object>} An object containing the original report, best match, and raw candidate data.
 */
export async function findSimilarCases(ncrId) {
  const report = await fetchReportById(ncrId)

  const apiKey = process.env.GEMINI_API_KEY
  let embedding = null;
  if (apiKey && report.description) {
    embedding = await generateEmbedding(report.description, apiKey)
  }

  const [caseRepoCandidates, ratedNcrCandidates, carReports, qddrReports] = await Promise.all([
    fetchCaseRepositoryCandidates(report.issue_type, embedding),
    fetchRatedNcrCandidates(),
    fetchCarReports(report.department_id),
    fetchQddrReports(report.department_id),
  ])

  const ratedNcrAsCases = ratedNcrCandidates.map(ncr => ({
    corrective_action: ncr.corrective_action || ncr.investigation_details,
    preventive_action: ncr.resolution_details,
    issue_type: ncr.issue_type,
    severity: ncr.severity,
    department_id: ncr.department_id,
    product_type: ncr.product_type,
    effectiveness_score: null,
    times_used: 1,
    source: 'ncr',
  }))

  const allCandidates = [
    ...caseRepoCandidates.map(c => ({ ...c, source: 'repository' })),
    ...ratedNcrAsCases,
  ]

  if (apiKey && report.description) {
    report.llm_keywords = await extractKeywordsWithLLM(report.description, apiKey)
  }

  const bestMatch = retrieveBestMatch(report, allCandidates)

  return {
    report,
    bestMatch,
    minCbrScore: MIN_CBR_SCORE,
    caseRepo: caseRepoCandidates,
    ratedNcrs: ratedNcrCandidates,
    carReports,
    qddrReports,
  }
}

// ─── Cache Helpers ─────────────────────────────────────────────────────────────

/**
 * Retrieves the most recent AI suggestion for a given NCR.
 *
 * @param {string|number} ncrId - The ID of the NCR report.
 * @returns {Promise<Object|null>} The cached AI suggestion object, or null if not found.
 */
export async function getCachedSuggestion(ncrId) {
  const { data, error } = await supabase
    .from('ai_predictions')
    .select('ai_suggestion, confidence_score, prediction_type, created_at')
    .eq('ncr_id', ncrId)
    .in('prediction_type', ['corrective_action', 'preventive_action'])
    .order('created_at', { ascending: false })

  if (error) throw error
  if (!data || data.length === 0) return null

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

/**
 * Stores a new AI suggestion in the database.
 *
 * @param {Object} params - The parameters for storing the suggestion.
 * @param {string|number} params.ncrId - The ID of the NCR report.
 * @param {string} params.suggestion - The suggested action text.
 * @param {number} params.confidence - The confidence score of the suggestion.
 * @param {string} [params.type='corrective_action'] - The type of prediction.
 * @returns {Promise<void>}
 */
export async function storeSuggestion({ ncrId, suggestion, confidence, type = 'corrective_action' }) {
  if (!ncrId || !suggestion) throw new Error('ncr_id and suggestion are required')

  const { error } = await supabase
    .from('ai_predictions')
    .insert({
      ncr_id: ncrId,
      ai_suggestion: suggestion,
      confidence_score: confidence,
      prediction_type: type,
      predicted_risk: 'corrective',
    })

  if (error) throw error
}

function generateFallbackHeuristicSuggestion({ report, deptName }) {
  const issueType = (report.issue_type || '').toLowerCase();
  const desc = (report.description || '').toLowerCase();

  let suggestion = 'Perform a detailed root-cause investigation and verify that standard operating procedures are being followed. Retrain staff on the correct protocols.';
  let preventive_suggestion = 'Establish periodic audits and visual inspections to verify ongoing compliance. Implement a checklist for end-of-shift verification.';
  let confidence = 0.94;

  if (issueType.includes('security') || desc.includes('security') || desc.includes('unsecured') || desc.includes('patrol') || desc.includes('fire exit') || desc.includes('door') || desc.includes('push bar')) {
    suggestion = 'Immediately secure all entry points, repair the damaged push bar on the fire exit door, and request a patrol check to confirm building security.';
    preventive_suggestion = 'Implement daily checklist inspections of all security exit doors and establish automated alerts for doors left open or unsecured.';
    confidence = 0.98;
  } else if (issueType.includes('safety') || issueType.includes('health') || desc.includes('hazard') || desc.includes('injury') || desc.includes('accident')) {
    suggestion = 'Conduct a safety audit of the affected work area, isolate any malfunctioning equipment or hazards, and conduct an immediate safety briefing (toolbox talk) with all staff.';
    preventive_suggestion = 'Update the hazard identification register and perform monthly safety inspections of the area to verify preventative controls remain effective.';
    confidence = 0.97;
  } else if (issueType.includes('quality') || issueType.includes('food_safety') || desc.includes('contamination') || desc.includes('temp') || desc.includes('batch') || desc.includes('quality')) {
    suggestion = 'Isolate the affected batch, check storage temperature logs, and sanitize all contacting equipment surfaces before resuming production.';
    preventive_suggestion = 'Review and update the preventive maintenance schedule for cooling/heating systems and increase sampling frequency for quality checks.';
    confidence = 0.96;
  } else if (issueType.includes('audit') || desc.includes('audit') || desc.includes('finding')) {
    suggestion = 'Review non-conforming items identified in the audit report, update document controls, and coordinate with process owners to address the root causes.';
    preventive_suggestion = 'Schedule bi-annual internal mock audits and train department representatives as internal auditors to ensure constant audit readiness.';
    confidence = 0.95;
  } else if (issueType.includes('vendor') || desc.includes('vendor') || desc.includes('supplier')) {
    suggestion = 'Issue a formal supplier corrective action request (SCAR) to the vendor and hold/quarantine incoming materials pending inspection.';
    preventive_suggestion = 'Establish a vendor scorecard system, increase inspection level for new shipments, and revise incoming quality control acceptance criteria.';
    confidence = 0.95;
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

/**
 * Generates an AI suggestion for an NCR based on historical context and LLM generation.
 *
 * @param {Object} params - The parameters for generating the suggestion.
 * @param {string|number} params.ncrId - The ID of the NCR report.
 * @param {string} [params.deptName] - The department name.
 * @param {string[]} [params.previousSuggestions=[]] - Array of previously rejected suggestions.
 * @returns {Promise<Object>} An object containing the suggestion, preventive suggestion, and confidence.
 */
export async function generateAiSuggestion({ ncrId, deptName, previousSuggestions = [] }) {
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
    return { ...fallback, sourceDetails: 'System Heuristics' }
  }

  try {
    let prompt = `You are a quality control expert. Suggest a corrective action and a preventive action for this NCR report using all available context.

NCR Report:
- Description: ${report.description}
- Issue Type: ${report.issue_type || 'N/A'}
- Severity: ${report.severity}
- Department: ${deptName || 'N/A'}
- Investigation: ${report.investigation_details || 'None'}

Case Repository Matches (CBR candidates):
${caseRepo.length > 0
        ? caseRepo.map((c, i) => `${i + 1}. Corrective Action: ${c.corrective_action} | Preventive Action: ${c.preventive_action || 'N/A'} | Score: ${c.effectiveness_score || 'N/A'}`).join('\n')
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

    prompt += `\nProvide a concise, actionable corrective action (for immediately addressing the current non-conformance) and a preventive action (to prevent recurrence in the future). Each action should be 2-4 sentences. Also provide a confidence score between 0.94 and 0.99 based on matches.
Respond ONLY in this JSON format with no preamble or markdown:
{"suggestion": "your corrective action suggestion here", "preventive_suggestion": "your preventive action suggestion here", "confidence": 0.96}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
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
        ]
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

    await storeSuggestion({ ncrId, suggestion: parsed.suggestion, confidence: parsed.confidence, type: 'corrective_action' })
    if (parsed.preventive_suggestion) {
      await storeSuggestion({ ncrId, suggestion: parsed.preventive_suggestion, confidence: parsed.confidence, type: 'preventive_action' })
    }

    return {
      suggestion: parsed.suggestion,
      preventive_suggestion: parsed.preventive_suggestion,
      confidence: parsed.confidence,
      sourceDetails: 'Generative AI (Gemini)'
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
    return { ...fallback, sourceDetails: 'System Heuristics' }
  }
}

/**
 * Generates an AI suggestion based on free-form text input rather than a specific NCR record.
 *
 * @param {Object} params - The parameters for generating the suggestion.
 * @param {string} params.description - The issue description.
 * @param {string} params.issueType - The type of issue.
 * @param {string} [params.deptName] - The department name.
 * @returns {Promise<Object>} An object containing the generated suggestion details.
 */
export async function generateAiSuggestionFromText({ description, issueType, deptName }) {
  const apiKey = process.env.GEMINI_API_KEY
  let embedding = null;
  if (apiKey && description) {
    embedding = await generateEmbedding(description, apiKey)
  }

  const [caseRepoCandidates, ratedNcrCandidates, carReportsList, qddrReportsList] = await Promise.all([
    fetchCaseRepositoryCandidates(issueType, embedding),
    fetchRatedNcrCandidates(),
    fetchCarReports(null),
    fetchQddrReports(null),
  ])

  const ratedNcrAsCases = ratedNcrCandidates.map(ncr => ({
    corrective_action: ncr.corrective_action || ncr.investigation_details,
    preventive_action: ncr.resolution_details,
    issue_type: ncr.issue_type,
    severity: ncr.severity,
    department_id: ncr.department_id,
    product_type: ncr.product_type,
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

  if (apiKey && description) {
    report.llm_keywords = await extractKeywordsWithLLM(description, apiKey)
  }

  const bestMatch = retrieveBestMatch(report, allCandidates)
  const fallback = generateFallbackHeuristicSuggestion({ report, deptName })

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
        ? caseRepoCandidates.slice(0, 10).map((c, i) => `${i + 1}. Corrective Action: ${c.corrective_action} | Preventive Action: ${c.preventive_action || 'N/A'} | Score: ${c.effectiveness_score || 'N/A'}`).join('\n')
        : 'None'}

Provide a concise, actionable corrective action (for immediately addressing the current issue) and a preventive action (to prevent recurrence in the future). Each action should be 2-4 sentences. Also provide a confidence score between 0.94 and 0.99.
Respond ONLY in this JSON format with no preamble or markdown:
{"suggestion": "your corrective action suggestion here", "preventive_suggestion": "your preventive action suggestion here", "confidence": 0.96}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
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

// ─── Auto-Classification for Tags ──────────────────────────────────────────────

const CAR_TAGS = [
  'quality_food_safety', 'environment_health_safety', 'security_issue',
  'internal_audit', 'customer_complaint', 'government_agency_audit',
  'customer_audit_nonconformance', 'vendor_nonconformance'
]

const QDDR_TAGS = [
  'holes_punctures', 'crushed_or_dented', 'bulging', 'opened_seal',
  'excess_shipment', 'deformed_or_torn', 'wet_or_leaked', 'improper_stretch_wrapping',
  'no_label_broken_label', 'documentation_error', 'open_carton', 'stain_or_graffiti',
  'wrong_no_batchcode', 'short_pack', 'picking_discrepancy'
]

/**
 * Automatically classifies text description into a set of applicable tags.
 *
 * @param {string} description - The issue description.
 * @param {string} reportType - The type of report ('CAR' or 'QDDR').
 * @returns {Promise<string[]>} An array of matched tag strings.
 */
export async function autoClassifyTags(description, reportType) {
  const tagsList = reportType === 'CAR' ? CAR_TAGS : QDDR_TAGS
  const apiKey = process.env.GEMINI_API_KEY
  
  if (apiKey && description) {
    try {
      const prompt = `You are a strict JSON classifier. Read this non-conformance issue and select all applicable tags from the allowed list. 
Issue: "${description}"

Allowed tags: ${JSON.stringify(tagsList)}

Return ONLY a valid JSON array of the string keys that apply. Do not include markdown or explanations. E.g. ["wet_or_leaked", "open_carton"]`

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.1 }
        })
      })

      if (response.ok) {
        const data = await response.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '[]'
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        
        return parsed.filter(tag => tagsList.includes(tag))
      }
    } catch (err) {
      console.warn('Gemini tag classification failed. Falling back to heuristic.', err)
    }
  }

  const desc = (description || '').toLowerCase()
  const matched = []

  const HEURISTIC_PATTERNS = {
    // CAR flags
    quality_food_safety: ['safety', 'quality', 'food', 'contamination', 'hygiene', 'spoiled', 'expiry'],
    environment_health_safety: ['environment', 'hazard', 'health', 'safety', 'chemical', 'spill', 'waste', 'injury'],
    security_issue: ['security', 'access', 'door', 'unauthorized', 'tamper', 'lock', 'stolen', 'break-in'],
    internal_audit: ['audit', 'internal', 'finding', 'nonconformance', 'inspection', 'check'],
    customer_complaint: ['customer', 'complaint', 'feedback', 'client', 'dissatisfied', 'rejection'],
    vendor_nonconformance: ['vendor', 'supplier', 'external', 'procurement', 'delivery', 'carrier'],
    government_agency_audit: ['government', 'agency', 'regulatory', 'legal', 'fda', 'doh', 'compliance', 'penalty'],
    customer_audit_nonconformance: ['customer audit', 'client audit', 'external audit'],

    // QDDR flags
    holes_punctures: ['hole', 'puncture', 'pierce', 'torn', 'rip', 'cut', 'burst'],
    crushed_or_dented: ['crush', 'dent', 'collapsed', 'smashed', 'bent', 'deformed'],
    deformed_torn: ['deform', 'torn', 'distorted', 'warped', 'mangled', 'broken'],
    wet_or_leaked: ['wet', 'leak', 'water', 'spill', 'soak', 'moisture', 'damp', 'dripping'],
    open_carton: ['open carton', 'open box', 'unsealed', 'opened', 'loose box'],
    stain_graffiti: ['stain', 'graffiti', 'dirt', 'soiled', 'smudge', 'mark', 'discolored'],
    bulging: ['bulge', 'swollen', 'puffed', 'expanded', 'pressure'],
    improper_stretch_wrapping: ['stretch wrap', 'shrink wrap', 'unwrapped', 'loose wrap', 'pallet wrap'],
    wrong_no_batchcode: ['batch', 'lot', 'code', 'expiry date', 'missing code', 'wrong code', 'mismatch'],
    opened_seal: ['seal', 'broken seal', 'tampered', 'unsealed', 'opened seal'],
    no_label_broken_label: ['label', 'missing label', 'torn label', 'unreadable', 'no label'],
    short_pack: ['short', 'missing count', 'underpack', 'incomplete', 'few'],
    excess_shipment: ['excess', 'overpack', 'surplus', 'extra', 'overage'],
    documentation_error: ['document', 'paperwork', 'invoice', 'receipt', 'manifest', 'error', 'mismatch'],
    picking_discrepancy: ['picking', 'wrong item', 'mispick', 'incorrect item', 'fulfillment'],
  }

  for (const [tagKey, keywords] of Object.entries(HEURISTIC_PATTERNS)) {
    if (tagsList.includes(tagKey)) {
      if (keywords.some(kw => desc.includes(kw))) {
        matched.push(tagKey)
      }
    }
  }

  return matched
}
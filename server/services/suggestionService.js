import { supabase } from '../lib/supabase.js'
import { CAR_STATUS } from '../../shared/constants.js'
import { extractKeywords, extractKeywordsWithLLM, jaccardSimilarity, generateEmbedding } from '../utils/cbr.js'

/** Minimum CBR score to use a past case instead of falling back to AI */
const MIN_CBR_SCORE = 0.2

// ─── Data Fetchers for the Dedicated Repositories ────────────────────────────

/**
 * Fetches candidate cases from `car_case_repository` using pgvector cosine
 * similarity or ordering by effectiveness score.
 *
 * @param {number[]|null} [embedding=null] - 768-dim float array
 * @param {string|null} [issueCategory=null]
 * @returns {Promise<Object[]>}
 */
export async function fetchCarCaseCandidates(embedding = null, issueCategory = null) {
  if (embedding) {
    try {
      const { data, error } = await supabase.rpc('match_car_cases', {
        query_embedding: `[${embedding.join(',')}]`,
        match_threshold: 0.0,
        match_count: 30
      })
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(d => ({
          ...d,
          similarity: d.similarity ?? 0,
          source: 'car_case_repository'
        }))
      }
    } catch (rpcErr) {
      console.warn('[suggestionService] match_car_cases RPC failed, falling back to query:', rpcErr.message)
    }
  }

  let query = supabase
    .from('car_case_repository')
    .select('id, reference_no, details_of_nonconformance, root_cause_analysis, corrective_action, preventive_action, issue_category, requesting_department, responsible_department, effectiveness_score')
    .not('corrective_action', 'is', null)
    .order('effectiveness_score', { ascending: false })
    .limit(30)

  if (issueCategory) {
    query = query.eq('issue_category', issueCategory)
  }

  const { data, error } = await query
  if (error) {
    console.warn('[suggestionService] Error querying car_case_repository:', error.message)
    return []
  }
  return (data || []).map(d => ({ ...d, source: 'car_case_repository' }))
}

/**
 * Fetches candidate cases from `qddr_case_repository` using pgvector cosine
 * similarity or ordering by effectiveness score.
 *
 * @param {number[]|null} [embedding=null] - 768-dim float array
 * @returns {Promise<Object[]>}
 */
export async function fetchQddrCaseCandidates(embedding = null) {
  if (embedding) {
    try {
      const { data, error } = await supabase.rpc('match_qddr_cases', {
        query_embedding: `[${embedding.join(',')}]`,
        match_threshold: 0.0,
        match_count: 30
      })
      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(d => ({
          ...d,
          similarity: d.similarity ?? 0,
          source: 'qddr_case_repository'
        }))
      }
    } catch (rpcErr) {
      console.warn('[suggestionService] match_qddr_cases RPC failed, falling back to query:', rpcErr.message)
    }
  }

  const { data, error } = await supabase
    .from('qddr_case_repository')
    .select('id, reference_no, reason_of_discrepancy, material_description, corrective_action, preventive_action, defect_categories, effectiveness_score')
    .not('corrective_action', 'is', null)
    .order('effectiveness_score', { ascending: false })
    .limit(30)

  if (error) {
    console.warn('[suggestionService] Error querying qddr_case_repository:', error.message)
    return []
  }
  return (data || []).map(d => ({ ...d, source: 'qddr_case_repository' }))
}

// ─── Fallback Heuristics ─────────────────────────────────────────────────────

function generateFallbackHeuristicSuggestion({ description, issueType, deptName, isQddr = false }) {
  const desc = (description || '').toLowerCase()

  if (isQddr) {
    return {
      suggestion: 'Segregate non-conforming inventory in the designated quarantine cage. Coordinate with the Inventory Manager to approve disposal or material scrap write-off.',
      preventive_suggestion: 'Inspect incoming shipment pallets prior to unloading, verify stretch-wrap integrity, and notify vendor of recurring packaging discrepancies.',
      confidence: 0.94
    }
  }

  let suggestion = 'Perform a detailed root-cause investigation (5 Whys) with the process owner. Retrain personnel on the approved standard operating procedure (SOP).'
  let preventive_suggestion = 'Establish periodic supervisory verification audits and incorporate an explicit verification checkpoint in the process checklist.'
  let confidence = 0.94

  if (desc.includes('food') || desc.includes('hygiene') || desc.includes('contamination') || desc.includes('temp')) {
    suggestion = 'Immediately isolate and quarantine affected materials. Sanitize all contact surfaces and review daily temperature logs with Quality Assurance.'
    preventive_suggestion = 'Calibrate temperature and humidity sensors bi-weekly and increase sanitation verification frequency.'
    confidence = 0.97
  } else if (desc.includes('safety') || desc.includes('hazard') || desc.includes('injury') || desc.includes('spill')) {
    suggestion = 'Isolate the hazard area immediately, perform a Job Safety Analysis (JSA), and conduct an urgent safety toolbox briefing with all team members.'
    preventive_suggestion = 'Revise safety checklists, install additional physical safeguards, and audit PPE compliance monthly.'
    confidence = 0.97
  } else if (desc.includes('audit') || desc.includes('clause') || desc.includes('finding')) {
    suggestion = 'Review non-conformance against the relevant ISO quality standard, revise controlled documentation, and train process owners.'
    preventive_suggestion = 'Schedule internal mock audits every quarter to verify consistent adherence to QMS protocols.'
    confidence = 0.96
  } else if (desc.includes('customer') || desc.includes('complaint')) {
    suggestion = 'Issue an immediate containment response to the customer. Quarantine remaining finished goods from the same lot and initiate formal 8D problem-solving.'
    preventive_suggestion = 'Implement pre-shipment quality gate checks and review customer specifications during production scheduling.'
    confidence = 0.96
  }

  if (deptName) {
    suggestion += ` Coordinate implementation with the ${deptName} department.`
  }

  return { suggestion, preventive_suggestion, confidence }
}

// ─── Main Suggestion API ─────────────────────────────────────────────────────

/**
 * Generates an AI suggestion based on free-form text input and context.
 * Intelligently routes between `car_case_repository` (for complaints & audits)
 * and `qddr_case_repository` (for defects & disposals).
 *
 * @param {Object} params
 * @param {string} params.description - Defect/discrepancy description
 * @param {string} [params.issueType] - Issue category or 'QDDR' / 'CAR'
 * @param {string} [params.deptName] - Department name
 * @returns {Promise<Object>}
 */
export async function generateAiSuggestionFromText({ description, issueType, deptName }) {
  const isQddr = String(issueType || '').trim().toUpperCase() === 'QDDR' ||
    ['holes_punctures', 'crushed_dented', 'disposal', 'warehouse'].some(k => String(description || '').toLowerCase().includes(k))

  const apiKey = process.env.GEMINI_API_KEY
  let embedding = null
  if (apiKey && description) {
    embedding = await generateEmbedding(description, apiKey)
  }

  // ── ROUTE 1: QDDR CASE REPOSITORY (Warehouse Defect & Disposal) ─────────────
  if (isQddr) {
    const qddrCandidates = await fetchQddrCaseCandidates(embedding)

    // Check if we have a strong vector similarity or keyword match
    if (qddrCandidates.length > 0) {
      const topMatch = qddrCandidates[0]
      const simScore = topMatch.similarity ?? 0

      // If semantic similarity is strong enough
      if (simScore >= MIN_CBR_SCORE && topMatch.corrective_action) {
        return {
          suggestion: topMatch.corrective_action,
          preventive_suggestion: topMatch.preventive_action || 'Implement standard receiving inspection checks.',
          confidence: Math.min(Math.max(simScore, 0.94), 0.99),
          sourceDetails: 'QDDR Case Repository (CBR)',
          matchedFeatures: ['discrepancy matching', 'disposal resolution']
        }
      }
    }

    // Fallback to Gemini with QDDR few-shot context
    if (apiKey) {
      try {
        const prompt = `You are a warehouse quality control and inventory manager. Suggest a corrective action (disposition/disposal) and a preventive action for this discrepancy.

Discrepancy Details:
- Description: ${description}
- Department: ${deptName || 'Warehouse / Inventory'}

Historical Closed QDDR Cases (for reference):
${qddrCandidates.slice(0, 5).map((q, i) => `${i + 1}. Discrepancy: ${q.reason_of_discrepancy} | Corrective: ${q.corrective_action} | Preventive: ${q.preventive_action || 'N/A'}`).join('\n') || 'None'}

Provide a clear, practical corrective action (e.g., quarantine and write-off for disposal, return to vendor, repackage) and a preventive action.
Respond ONLY in this JSON format with no markdown:
{"suggestion": "corrective action here", "preventive_suggestion": "preventive action here", "confidence": 0.96}`

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          })
        })

        if (res.ok) {
          const data = await res.json()
          const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json|```/g, '').trim()
          const parsed = JSON.parse(text)
          return {
            suggestion: parsed.suggestion,
            preventive_suggestion: parsed.preventive_suggestion,
            confidence: parsed.confidence || 0.95,
            sourceDetails: 'Generative AI (Gemini Flash)',
            matchedFeatures: []
          }
        }
      } catch (geminiErr) {
        console.warn('[suggestionService] Gemini call failed for QDDR, falling back to heuristics:', geminiErr.message)
      }
    }

    return {
      ...generateFallbackHeuristicSuggestion({ description, issueType, deptName, isQddr: true }),
      sourceDetails: 'System Heuristics'
    }
  }

  // ── ROUTE 2: CAR CASE REPOSITORY (Customer Complaints & Audits) ────────────
  const carCandidates = await fetchCarCaseCandidates(embedding, issueType)

  if (carCandidates.length > 0) {
    const topMatch = carCandidates[0]
    const simScore = topMatch.similarity ?? 0

    if (simScore >= MIN_CBR_SCORE && topMatch.corrective_action) {
      return {
        suggestion: topMatch.corrective_action,
        preventive_suggestion: topMatch.preventive_action || 'Establish supervisory verification checkpoints.',
        root_cause_suggestion: topMatch.root_cause_analysis || null,
        confidence: Math.min(Math.max(simScore, 0.94), 0.99),
        sourceDetails: 'CAR Case Repository (CBR)',
        matchedFeatures: ['non-conformance semantic matching', 'verified CAPA']
      }
    }
  }

  // Fallback to Gemini with CAR few-shot context
  if (apiKey) {
    try {
      const prompt = `You are an ISO 9001 Quality Assurance expert. Suggest a corrective action, a preventive action, and a probable root cause for this Non-Conformance / Customer Complaint / Audit issue.

Non-Conformance Details:
- Details: ${description}
- Category: ${issueType || 'General'}
- Department: ${deptName || 'N/A'}

Historical Closed CAR Cases (for reference):
${carCandidates.slice(0, 5).map((c, i) => `${i + 1}. Non-Conformance: ${c.details_of_nonconformance} | RCA: ${c.root_cause_analysis || 'N/A'} | Corrective: ${c.corrective_action} | Preventive: ${c.preventive_action || 'N/A'}`).join('\n') || 'None'}

Provide an actionable corrective action (to fix the current issue), a preventive action (to prevent recurrence), and a brief root cause note.
Respond ONLY in this JSON format with no markdown:
{"suggestion": "corrective action here", "preventive_suggestion": "preventive action here", "root_cause_suggestion": "root cause analysis here", "confidence": 0.96}`

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      })

      if (res.ok) {
        const data = await res.json()
        const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(text)
        return {
          suggestion: parsed.suggestion,
          preventive_suggestion: parsed.preventive_suggestion,
          root_cause_suggestion: parsed.root_cause_suggestion || null,
          confidence: parsed.confidence || 0.95,
          sourceDetails: 'Generative AI (Gemini Flash)',
          matchedFeatures: []
        }
      }
    } catch (geminiErr) {
      console.warn('[suggestionService] Gemini call failed for CAR, falling back to heuristics:', geminiErr.message)
    }
  }

  return {
    ...generateFallbackHeuristicSuggestion({ description, issueType, deptName, isQddr: false }),
    sourceDetails: 'System Heuristics'
  }
}

// ─── Legacy Compatibility Wrappers ──────────────────────────────────────────

export async function findSimilarCases(reportId) {
  const candidates = await fetchCarCaseCandidates(null, null)
  return {
    report: { id: reportId },
    bestMatch: candidates[0] || null,
    carCaseRepo: candidates
  }
}

export async function getCachedSuggestion(_id) {
  return null
}

export async function storeSuggestion(_params) {
  // No-op: AI predictions table is superseded by direct car_case_repository & qddr_case_repository
  return Promise.resolve()
}

export async function generateAiSuggestion({ ncrId, deptName }) {
  return generateAiSuggestionFromText({
    description: `Report #${ncrId}`,
    deptName
  })
}

// ─── Auto-Classification & Evidence Description ─────────────────────────────

export async function autoClassifyTags(description, reportType = 'CAR') {
  const isQddr = String(reportType).toUpperCase() === 'QDDR'
  const tagsList = isQddr ? [
    'holes_punctures', 'crushed_dented', 'deformed_torn', 'wet_leaked',
    'open_carton', 'stain_graffiti', 'bulging', 'improper_stretch_wrapping',
    'wrong_no_batchcode', 'opened_seal', 'no_label_broken_label',
    'short_pack', 'excess_shipment', 'documentation_error', 'picking_discrepancy'
  ] : [
    'quality_food_safety', 'environment_health_safety', 'security_issue',
    'internal_audit', 'customer_complaint', 'government_agency_audit',
    'customer_audit_nonconformance', 'vendor_nonconformance'
  ]

  const desc = (description || '').toLowerCase()
  const matched = []

  const HEURISTIC_PATTERNS = {
    quality_food_safety: ['safety', 'quality', 'food', 'contamination', 'hygiene', 'spoiled', 'expiry'],
    environment_health_safety: ['environment', 'hazard', 'health', 'safety', 'chemical', 'spill', 'waste', 'injury'],
    security_issue: ['security', 'access', 'door', 'unauthorized', 'tamper', 'lock', 'stolen', 'break-in'],
    internal_audit: ['audit', 'internal', 'finding', 'nonconformance', 'inspection', 'check'],
    customer_complaint: ['customer', 'complaint', 'feedback', 'client', 'dissatisfied', 'rejection'],
    vendor_nonconformance: ['vendor', 'supplier', 'external', 'procurement', 'delivery', 'carrier'],
    government_agency_audit: ['government', 'agency', 'regulatory', 'legal', 'fda', 'doh', 'compliance', 'penalty'],
    customer_audit_nonconformance: ['customer audit', 'client audit', 'external audit'],

    holes_punctures: ['hole', 'puncture', 'pierce', 'torn', 'rip', 'cut', 'burst'],
    crushed_dented: ['crush', 'dent', 'collapsed', 'smashed', 'bent', 'deformed'],
    deformed_torn: ['deform', 'torn', 'distorted', 'warped', 'mangled', 'broken'],
    wet_leaked: ['wet', 'leak', 'water', 'spill', 'soak', 'moisture', 'damp', 'dripping'],
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

export async function generateEvidenceDescription({
  imageBase64,
  mimeType = 'image/jpeg',
  productType = '',
  batchNumber = '',
  location = '',
  severity = '',
  department = '',
  issueType = '',
}) {
  const cleanBase64 = String(imageBase64 || '').replace(/^data:[^;]+;base64,/, '').trim()
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const resolvedMimeType = allowedMimes.includes(String(mimeType || '').toLowerCase())
    ? String(mimeType).toLowerCase()
    : 'image/jpeg'

  const buildFallbackDescription = () => {
    const sevLabel = severity ? `${String(severity).toUpperCase()}-severity` : 'reported'
    const deptClause = department ? ` assigned to the ${department} department` : ''
    const issueClause = issueType ? ` categorized under ${issueType}` : ''
    return `Visual inspection at ${location || 'the facility'} identified a ${sevLabel} non-conformance${issueClause} involving ${productType || 'affected material'} (Batch/Lot: ${batchNumber || 'N/A'})${deptClause}. Attached photographic evidence documents the observed condition requiring containment and root-cause investigation.`
  }

  if (!cleanBase64) {
    return { description: buildFallbackDescription(), source: 'heuristic' }
  }

  const prompt = `You are a Quality Assurance (QA) inspector writing an objective non-conformance description for a Quality Management System.
Describe what is visible in the photo and connect it to Product: ${productType || 'N/A'}, Batch/Lot: ${batchNumber || 'N/A'}, Location: ${location || 'N/A'}. Return ONLY the plain-text description paragraph.`

  const geminiApiKey = process.env.GEMINI_API_KEY
  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: resolvedMimeType,
                      data: cleanBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.25,
              maxOutputTokens: 300,
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        const generatedText = (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
          .replace(/^["']|["']$/g, '')
          .trim()
        if (generatedText) {
          return { description: generatedText, source: 'gemini-vision' }
        }
      }
    } catch (err) {
      console.warn('[suggestionService] Gemini Vision call failed:', err.message)
    }
  }

  return { description: buildFallbackDescription(), source: 'heuristic' }
}

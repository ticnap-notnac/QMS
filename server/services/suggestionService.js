import { supabase } from '../lib/supabase.js'
import { extractKeywords, jaccardSimilarity, generateEmbedding } from '../utils/cbr.js'

/**
 * Minimum multi-attribute Base Similarity (75%) required for Tier 1 Direct CBR Reuse.
 * Below 0.75, the system transitions to Tier 2: CBR-Guided RAG Case Adaptation.
 */
const DIRECT_CBR_THRESHOLD = 0.75

// ─── QDDR Defect Category Normalization Helpers ──────────────────────────────

const QDDR_LABEL_TO_TAG = {
  'holes & punctures': 'holes_punctures',
  'holes_punctures': 'holes_punctures',
  'deformed or torn': 'deformed_torn',
  'deformed_torn': 'deformed_torn',
  'open carton': 'open_carton',
  'open_carton': 'open_carton',
  'crushed or dented': 'crushed_dented',
  'crushed_dented': 'crushed_dented',
  'wet or leaked': 'wet_leaked',
  'wet_leaked': 'wet_leaked',
  'stain or graffiti': 'stain_graffiti',
  'stain_graffiti': 'stain_graffiti',
  'bulging': 'bulging',
  'improper stretch wrapping': 'improper_stretch_wrapping',
  'improper_stretch_wrapping': 'improper_stretch_wrapping',
  'wrong/no batchcode': 'wrong_no_batchcode',
  'wrong_no_batchcode': 'wrong_no_batchcode',
  'opened seal': 'opened_seal',
  'opened_seal': 'opened_seal',
  'no label/broken label': 'no_label_broken_label',
  'no_label_broken_label': 'no_label_broken_label',
  'short pack': 'short_pack',
  'short_pack': 'short_pack',
  'excess shipment': 'excess_shipment',
  'excess_shipment': 'excess_shipment',
  'documentation error': 'documentation_error',
  'documentation_error': 'documentation_error',
  'picking discrepancy': 'picking_discrepancy',
  'picking_discrepancy': 'picking_discrepancy'
}

/**
 * Extracts a canonical Set of QDDR defect category keys from explicit tags/labels
 * and heuristic text classification.
 * @param {string|string[]|null} explicitCategories
 * @param {string} [text='']
 * @returns {Promise<Set<string>>}
 */
async function extractQddrDefectCategorySet(explicitCategories, text = '') {
  const tagSet = new Set()

  if (Array.isArray(explicitCategories)) {
    for (const item of explicitCategories) {
      const norm = String(item || '').trim().toLowerCase()
      if (QDDR_LABEL_TO_TAG[norm]) tagSet.add(QDDR_LABEL_TO_TAG[norm])
    }
  } else if (typeof explicitCategories === 'string' && explicitCategories.trim()) {
    const parts = explicitCategories.split(/[,;|]+/)
    for (const part of parts) {
      const norm = part.trim().toLowerCase()
      if (QDDR_LABEL_TO_TAG[norm]) tagSet.add(QDDR_LABEL_TO_TAG[norm])
    }
  }

  if (text) {
    const inferred = await autoClassifyTags(text, 'QDDR')
    for (const t of inferred) {
      tagSet.add(t)
    }
  }

  return tagSet
}

/**
 * Normalizes CAR issue category names / tags so e.g. 'Customer Complaint'
 * matches 'customer_complaint'.
 * @param {string} val
 * @returns {string}
 */
function normalizeCarCategory(val) {
  const s = String(val || '').trim().toLowerCase()
  if (!s || s === 'general') return ''
  if (s.includes('food') || s.includes('quality')) return 'quality_food_safety'
  if (s.includes('environment') || s.includes('health') || s.includes('safety')) return 'environment_health_safety'
  if (s.includes('security')) return 'security_issue'
  if (s.includes('internal') && s.includes('audit')) return 'internal_audit'
  if (s.includes('customer') && s.includes('audit')) return 'customer_audit_nonconformance'
  if (s.includes('customer') || s.includes('complaint')) return 'customer_complaint'
  if (s.includes('government') || s.includes('agency') || s.includes('regulatory')) return 'government_agency_audit'
  if (s.includes('vendor') || s.includes('supplier')) return 'vendor_nonconformance'
  return s.replace(/[^a-z0-9]+/g, '_')
}

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
    .select('id, reference_no, details_of_nonconformance, root_cause_analysis, corrective_action, preventive_action, issue_category, requesting_department, responsible_department, product_material_name, effectiveness_score')
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
 * similarity or ordering by effectiveness score, and hydrates `defect_categories`.
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
        const ids = data.map(d => d.id).filter(Boolean)
        let categoriesById = {}
        if (ids.length > 0) {
          const { data: catRows } = await supabase
            .from('qddr_case_repository')
            .select('id, defect_categories')
            .in('id', ids)
          if (Array.isArray(catRows)) {
            for (const row of catRows) {
              categoriesById[row.id] = row.defect_categories
            }
          }
        }

        return data.map(d => ({
          ...d,
          defect_categories: d.defect_categories ?? categoriesById[d.id] ?? null,
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

// ─── Previous Suggestion Deduplication Helpers ───────────────────────────────

/**
 * Normalizes the `previousSuggestions` array passed from the frontend into
 * [{ corrective, preventive, correctiveKw, preventiveKw }].
 * @param {Array} previousSuggestions
 * @returns {Array<{ corrective: string, preventive: string, correctiveKw: Set<string>, preventiveKw: Set<string> }>}
 */
function normalizePreviousSuggestions(previousSuggestions = []) {
  if (!Array.isArray(previousSuggestions)) return []
  return previousSuggestions
    .map(item => {
      if (typeof item === 'string') {
        const c = item.trim()
        return {
          corrective: c,
          preventive: '',
          correctiveKw: extractKeywords(c),
          preventiveKw: new Set()
        }
      }
      const c = String(item?.corrective || item?.suggestion || '').trim()
      const p = String(item?.preventive || item?.preventive_suggestion || '').trim()
      return {
        corrective: c,
        preventive: p,
        correctiveKw: extractKeywords(c),
        preventiveKw: extractKeywords(p)
      }
    })
    .filter(item => item.corrective || item.preventive)
}

/**
 * Checks whether a candidate { corrective, preventive } pair was already suggested
 * for this report (by exact case-insensitive match or >= 0.80 keyword overlap).
 */
function isPreviouslySuggested(correctiveText, preventiveText, prevList = []) {
  if (!Array.isArray(prevList) || prevList.length === 0) return false
  const normCa = String(correctiveText || '').trim().toLowerCase()
  const normPa = String(preventiveText || '').trim().toLowerCase()
  const caKw = extractKeywords(normCa)
  const paKw = extractKeywords(normPa)

  return prevList.some(prev => {
    const prevCa = prev.corrective.toLowerCase()
    const prevPa = prev.preventive.toLowerCase()
    if (normCa && prevCa && normCa === prevCa) return true
    if (normPa && prevPa && normPa === prevPa) return true
    if (caKw.size > 0 && prev.correctiveKw.size > 0 && jaccardSimilarity(caKw, prev.correctiveKw) >= 0.80) {
      return true
    }
    if (paKw.size > 0 && prev.preventiveKw.size > 0 && jaccardSimilarity(paKw, prev.preventiveKw) >= 0.85) {
      return true
    }
    return false
  })
}

/**
 * Computes a deterministic mathematical Confidence Score for Tier 2 (RAG Case Adaptation)
 * based on the retrieval grounding strength of the top CBR reference case and input completeness.
 * Range: 0.65 (ungrounded zero-shot generation) to 0.87 (strongly grounded RAG adaptation).
 */
function computeRagConfidence(ragCases = [], hasStructuredContext = false) {
  const topCase = Array.isArray(ragCases) && ragCases.length > 0 ? ragCases[0] : null
  const topGroundingScore = Number(topCase?.finalCbrScore ?? topCase?.compositeScore ?? topCase?.baseSim ?? 0)
  const groundingBonus = Math.min(Math.max(topGroundingScore, 0), 1) * 0.18
  const contextBonus = hasStructuredContext ? 0.04 : 0.0
  return Number(Math.min(0.65 + groundingBonus + contextBonus, 0.87).toFixed(2))
}

// ─── Defect-Specific Fallback Heuristics ─────────────────────────────────────

function pickUnseenVariation(variations, prevList = []) {
  for (const v of variations) {
    if (!isPreviouslySuggested(v.suggestion, v.preventive_suggestion, prevList)) {
      return v
    }
  }
  const idx = prevList.length % variations.length
  return variations[idx]
}

function generateFallbackHeuristicSuggestion({
  description,
  issueType,
  deptName,
  isQddr = false,
  defectSet = new Set(),
  prevList = []
}) {
  const desc = `${description || ''} ${issueType || ''}`.toLowerCase()

  if (isQddr) {
    const hasTag = (...tags) => tags.some(t => defectSet.has(t))

    // 1. Wet / Leaked / Bulging / Stain / Contamination
    if (hasTag('wet_leaked', 'bulging', 'stain_graffiti') || /wet|leak|bulg|swell|swollen|stain|spill|moisture|soak/.test(desc)) {
      return pickUnseenVariation([
        {
          suggestion: 'Immediately isolate and quarantine all leaking, bulging, or moisture-compromised stock away from dry inventory. Inspect adjacent cases for cross-contamination and coordinate with the Inventory Manager for QA condemnation and disposal write-off.',
          preventive_suggestion: 'Verify container seal integrity and humidity/temperature conditions prior to receiving, and require carriers to inspect trailer roof and floor dryness before loading.',
          confidence: 0.62
        },
        {
          suggestion: 'Transfer all moisture-damaged or swollen units to hazardous/wet containment pallets. Photograph batch numbers for supplier quality notification and schedule immediate sanity cleaning of affected warehouse racking.',
          preventive_suggestion: 'Mandate moisture-barrier pallet liners and perform pre-unloading thermal and visual leak checks on all inbound liquid or canned shipments.',
          confidence: 0.60
        },
        {
          suggestion: 'Segregate stained or leaking cartons at the receiving dock and reject compromised units back to the carrier/vendor on the delivery manifest before inventory posting.',
          preventive_suggestion: 'Audit vendor seaming/sealing quality certificates per lot and enforce strict climate control monitoring inside the storage zone.',
          confidence: 0.59
        }
      ], prevList)
    }

    // 2. Wrong/No Batch Code / No or Broken Label / Opened Seal
    if (hasTag('wrong_no_batchcode', 'no_label_broken_label', 'opened_seal') || /batch|label|seal|traceability|expiry|code/.test(desc)) {
      return pickUnseenVariation([
        {
          suggestion: 'Place the affected pallet/lot on QA Hold immediately. Reconcile physical batch codes and seal integrity against the Certificate of Analysis (COA) and receiving manifest; request vendor relabeling or reject unverified units.',
          preventive_suggestion: 'Enforce mandatory barcode and batch/expiry verification scanning at the receiving dock before generating put-away labels.',
          confidence: 0.62
        },
        {
          suggestion: 'Quarantine unlabeled or unsealed cartons in the QA inspection bay. Verify lot traceability with the supplier and re-apply controlled warehouse batch/expiry stickers only after formal QA sign-off.',
          preventive_suggestion: 'Require suppliers to use high-adhesion thermal labels and tamper-evident security tape on all master cartons prior to dispatch.',
          confidence: 0.60
        },
        {
          suggestion: 'Suspend order picking for the affected SU/batch number. Conduct a full lot trace across adjacent rack locations and return any units with broken primary seals or mismatched batch codes to vendor quarantine.',
          preventive_suggestion: 'Integrate automated batch-code format validation in the WMS receiving workflow to block put-away of untraceable stock.',
          confidence: 0.59
        }
      ], prevList)
    }

    // 3. Short Pack / Excess Shipment / Picking Discrepancy / Documentation Error
    if (hasTag('short_pack', 'excess_shipment', 'picking_discrepancy', 'documentation_error') || /short|excess|picking|mispick|document|invoice|manifest|overage/.test(desc)) {
      return pickUnseenVariation([
        {
          suggestion: 'Conduct a 100% blind recount of the affected SKU/lot against the delivery receipt and Purchase Order. Hold discrepant quantities in the staging reconciliation zone and issue a formal Vendor/Logistics Discrepancy Notice for inventory adjustment.',
          preventive_suggestion: 'Implement dual-checker quantity and SKU verification during staging and require automated ASN/manifest validation prior to dock release.',
          confidence: 0.62
        },
        {
          suggestion: 'Freeze WMS stock movement for the affected PO/DRWB reference. Reconcile physical case counts with the warehouse team leader and process a debit/credit memo with Procurement and Finance.',
          preventive_suggestion: 'Enforce barcode scan-per-case verification during order picking and inbound tallying instead of manual paper sheet checkoffs.',
          confidence: 0.60
        },
        {
          suggestion: 'Segregate over-shipped or mispicked items in the discrepancy staging lane, update the receiving tally sheet with signed trucker/checker acknowledgment, and coordinate return-to-vendor or system receipt correction.',
          preventive_suggestion: 'Conduct daily cycle counts on high-velocity SKUs and audit pre-dispatch shipping manifests against physical pallet loads.',
          confidence: 0.59
        }
      ], prevList)
    }

    // 4. Improper Stretch Wrapping / Open Carton
    if (hasTag('improper_stretch_wrapping', 'open_carton') || /stretch|wrap|open carton|unsealed|loose/.test(desc)) {
      return pickUnseenVariation([
        {
          suggestion: 'Halt pallet movement and inspect open cartons to verify internal unit count and primary packaging integrity. Re-seal intact cartons and re-apply tensioned stretch-wrapping with corner boards before rack put-away.',
          preventive_suggestion: 'Standardize pallet wrapping tension and minimum wrap-revolution specifications on the warehouse outbound/inbound dock checklist.',
          confidence: 0.61
        },
        {
          suggestion: 'Down-stack unstable or loosely wrapped pallets in the staging area. Check open boxes for missing or pilfered units, reseal with reinforced packaging tape, and cross-wrap the pallet from base to top.',
          preventive_suggestion: 'Calibrate automated stretch-wrap machines weekly and train warehouse handlers on interlocking pallet stacking patterns.',
          confidence: 0.60
        },
        {
          suggestion: 'Isolate open or poorly wrapped cases for QA unit-count verification. Repack intact units into new master cartons and log a carrier handling observation report.',
          preventive_suggestion: 'Require mandatory top-sheet and 3-layer bottom/top stretch-film overlaps on all palletized warehouse transfers.',
          confidence: 0.59
        }
      ], prevList)
    }

    // 5. Physical / Structural Damage (Holes, Punctures, Crushed, Dented, Deformed, Torn)
    return pickUnseenVariation([
      {
        suggestion: 'Segregate punctured, crushed, or deformed cases in the designated QA quarantine cage. Sort and salvage undamaged inner units for repackaging if primary seals are intact, and process severely damaged units for scrap disposal or vendor claim.',
        preventive_suggestion: 'Enforce forklift handling clearance, pallet stacking weight limits, and protective slip-sheet/corner-board placement during transit and storage.',
        confidence: 0.60
      },
      {
        suggestion: 'Remove crushed or punctured units from salable stock and transfer to the disposal/rework hold zone. Document unit quantities for Inventory Manager write-off approval and file a transit damage claim with the trucker/broker.',
        preventive_suggestion: 'Audit pallet overhang and maximum tier-stacking heights in the warehouse and require shock-absorbing dunnage inside delivery containers.',
        confidence: 0.59
      },
      {
        suggestion: 'Perform 100% sorting of the affected pallet lot to separate cosmetically dented outer cartons from compromised primary containers. Repackage intact goods into replacement master cartons and condemn ruptured units.',
        preventive_suggestion: 'Conduct refresher training for material handling equipment (MHE) operators on fork-tine alignment and inspect rack beam clearances.',
        confidence: 0.58
      }
    ], prevList)
  }

  const deptSuffix = deptName ? ` Coordinate implementation with the ${deptName} department.` : ''

  if (desc.includes('food') || desc.includes('hygiene') || desc.includes('contamination') || desc.includes('temp')) {
    return pickUnseenVariation([
      {
        suggestion: `Immediately isolate and quarantine affected materials. Sanitize all contact surfaces and review daily temperature logs with Quality Assurance.${deptSuffix}`,
        preventive_suggestion: 'Calibrate temperature and humidity sensors bi-weekly and increase sanitation verification frequency.',
        confidence: 0.62
      },
      {
        suggestion: `Place affected production/storage lots on QA Hold for microbiological and sensory evaluation, and execute deep-cleaning protocols across the affected line.${deptSuffix}`,
        preventive_suggestion: 'Enforce automated continuous cold-chain/hygiene monitoring alarms and conduct unannounced GMP line audits.',
        confidence: 0.60
      }
    ], prevList)
  }

  if (desc.includes('safety') || desc.includes('hazard') || desc.includes('injury') || desc.includes('spill')) {
    return pickUnseenVariation([
      {
        suggestion: `Isolate the hazard area immediately, perform a Job Safety Analysis (JSA), and conduct an urgent safety toolbox briefing with all team members.${deptSuffix}`,
        preventive_suggestion: 'Revise safety checklists, install additional physical safeguards, and audit PPE compliance monthly.',
        confidence: 0.62
      },
      {
        suggestion: `Deploy spill/hazard containment barriers, verify engineering controls and safety interlocks, and clear the work zone only after EHS Officer inspection.${deptSuffix}`,
        preventive_suggestion: 'Incorporate hazard identification walkthroughs into weekly shift handovers and upgrade preventive maintenance on safety equipment.',
        confidence: 0.60
      }
    ], prevList)
  }

  if (desc.includes('audit') || desc.includes('clause') || desc.includes('finding')) {
    return pickUnseenVariation([
      {
        suggestion: `Review non-conformance against the relevant ISO quality standard, revise controlled documentation, and train process owners.${deptSuffix}`,
        preventive_suggestion: 'Schedule internal mock audits every quarter to verify consistent adherence to QMS protocols.',
        confidence: 0.61
      },
      {
        suggestion: `Conduct a gap remediation review with the process owner, update the affected SOP/work instruction in Document Control, and collect signed training records.${deptSuffix}`,
        preventive_suggestion: 'Add the non-conforming ISO clause requirement to the monthly departmental self-audit checklist.',
        confidence: 0.59
      }
    ], prevList)
  }

  if (desc.includes('customer') || desc.includes('complaint')) {
    return pickUnseenVariation([
      {
        suggestion: `Issue an immediate containment response to the customer. Quarantine remaining finished goods from the same lot and initiate formal 8D problem-solving.${deptSuffix}`,
        preventive_suggestion: 'Implement pre-shipment quality gate checks and review customer specifications during production scheduling.',
        confidence: 0.61
      },
      {
        suggestion: `Inspect retained warehouse samples from the affected batch code, arrange product replacement or credit disposition with the customer, and audit outbound inspection logs.${deptSuffix}`,
        preventive_suggestion: 'Tighten final QA release sampling criteria and add poka-yoke verification steps prior to dispatch.',
        confidence: 0.59
      }
    ], prevList)
  }

  return pickUnseenVariation([
    {
      suggestion: `Perform a detailed root-cause investigation (5 Whys) with the process owner. Retrain personnel on the approved standard operating procedure (SOP).${deptSuffix}`,
      preventive_suggestion: 'Establish periodic supervisory verification audits and incorporate an explicit verification checkpoint in the process checklist.',
      confidence: 0.58
    },
    {
      suggestion: `Contain the non-conforming output immediately, review process parameters against control plan tolerances, and document corrective adjustments with supervisor sign-off.${deptSuffix}`,
      preventive_suggestion: 'Standardize shift handover verification checks and schedule a 30-day Verification of Effectiveness (VoE) review.',
      confidence: 0.56
    }
  ], prevList)
}

// ─── Main Suggestion API ─────────────────────────────────────────────────────

/**
 * Generates an AI suggestion based on free-form text input and structured context.
 * Uses a two-tier CBR + RAG pipeline:
 *  - Tier 1 (baseSim >= 0.75 + matching defect/category): Direct CBR Reuse of proven historical CAPA.
 *  - Tier 2 (baseSim < 0.75): CBR-Guided RAG Case Adaptation via Gemini Flash using top scored cases.
 * Automatically excludes any corrective/preventive actions already suggested in `previousSuggestions`.
 *
 * @param {Object} params
 * @param {string} params.description - Defect/discrepancy description
 * @param {string} [params.rootCause=''] - Formatted 5 Whys / Fishbone RCA
 * @param {string} [params.rcaMethod=''] - '5whys' | 'fishbone' | 'both'
 * @param {string} [params.issueType] - Issue category or checked QDDR discrepancy labels
 * @param {string} [params.deptName] - Department or warehouse location name
 * @param {string} [params.reportType='CAR'] - 'CAR' | 'QDDR'
 * @param {Array} [params.previousSuggestions=[]] - Previously suggested CAPAs on this report to avoid repeating
 * @returns {Promise<Object>}
 */
export async function generateAiSuggestionFromText({
  description,
  rootCause = '',
  rcaMethod = '',
  issueType,
  deptName,
  reportType = 'CAR',
  previousSuggestions = []
}) {
  const prevList = normalizePreviousSuggestions(previousSuggestions)
  const isQddr = String(reportType || '').trim().toUpperCase() === 'QDDR' ||
    String(issueType || '').trim().toUpperCase() === 'QDDR' ||
    ['holes_punctures', 'crushed_dented', 'disposal', 'warehouse'].some(k => String(description || '').toLowerCase().includes(k))

  const cleanRca = String(rootCause || '').trim()
  const combinedQueryText = [
    String(description || '').trim(),
    cleanRca ? `Root Cause Analysis: ${cleanRca}` : ''
  ].filter(Boolean).join('\n')

  const apiKey = process.env.GEMINI_API_KEY
  let embedding = null
  if (apiKey && combinedQueryText) {
    embedding = await generateEmbedding(combinedQueryText, apiKey)
  }

  // ── ROUTE 1: QDDR CASE REPOSITORY (Warehouse Defect & Disposal) ─────────────
  if (isQddr) {
    const qddrCandidates = await fetchQddrCaseCandidates(embedding)
    const queryDefectSet = await extractQddrDefectCategorySet(issueType, description)
    const queryKeywords = extractKeywords(combinedQueryText)
    let scoredQddrCandidates = []

    if (qddrCandidates.length > 0) {
      // Filter out low-rated cases (< 2.5 / 5 stars => effectiveness_score < 0.50)
      const eligible = qddrCandidates.filter(q => Number(q.effectiveness_score ?? 0.7) >= 0.5)

      scoredQddrCandidates = await Promise.all(
        eligible.map(async (q) => {
          const vectorSim = Number(q.similarity ?? 0)
          const caseDefectSet = await extractQddrDefectCategorySet(q.defect_categories, q.reason_of_discrepancy)
          const defectCategorySim =
            queryDefectSet.size > 0 && caseDefectSet.size > 0
              ? jaccardSimilarity(queryDefectSet, caseDefectSet)
              : queryDefectSet.size === 0
                ? 0.5
                : 0

          const caseKeywords = extractKeywords(`${q.reason_of_discrepancy || ''} ${q.material_description || ''}`)
          const keywordSim = jaccardSimilarity(queryKeywords, caseKeywords)

          // Multi-attribute Base Similarity (45% Vector + 35% Defect Category + 20% Canonical Keywords)
          const baseSim = vectorSim > 0
            ? (0.45 * vectorSim) + (0.35 * defectCategorySim) + (0.20 * keywordSim)
            : (0.55 * defectCategorySim) + (0.45 * keywordSim)

          const rawEff = Number(q.effectiveness_score ?? 0.7)
          const effNorm = rawEff > 1 ? Math.min(rawEff / 5, 1) : Math.min(Math.max(rawEff, 0), 1)
          const finalCbrScore = (0.80 * baseSim) + (0.20 * effNorm)

          return {
            ...q,
            vectorSim,
            defectCategorySim,
            keywordSim,
            baseSim,
            effNorm,
            finalCbrScore
          }
        })
      )

      scoredQddrCandidates.sort((a, b) => b.finalCbrScore - a.finalCbrScore)

      // Pick the highest-scoring candidate that hasn't already been suggested for this report
      const topUnseenMatch = scoredQddrCandidates.find(c =>
        c.baseSim >= DIRECT_CBR_THRESHOLD &&
        (queryDefectSet.size === 0 || c.defectCategorySim > 0) &&
        c.corrective_action &&
        !isPreviouslySuggested(c.corrective_action, c.preventive_action, prevList)
      )

      // Tier 1: Direct CBR Reuse requires baseSim >= 0.75, matching defect category, and not previously suggested
      if (topUnseenMatch) {
        const starDisplay = Number((topUnseenMatch.effNorm * 5).toFixed(1))
        return {
          suggestion: topUnseenMatch.corrective_action,
          preventive_suggestion: topUnseenMatch.preventive_action || 'Implement standard receiving inspection checks.',
          confidence: Number(Math.min(Math.max(topUnseenMatch.finalCbrScore, 0.75), 0.99).toFixed(2)),
          sourceDetails: 'QDDR Case Repository (CBR)',
          matchedFeatures: [
            `defect category match (${Math.round(topUnseenMatch.defectCategorySim * 100)}%)`,
            `problem similarity (${Math.round(topUnseenMatch.baseSim * 100)}%)`,
            `★ ${starDisplay}/5 rated solution`
          ]
        }
      }
    }

    // Tier 2: CBR-Guided RAG Case Adaptation with Gemini Flash
    if (apiKey) {
      try {
        const ragReferenceCases = scoredQddrCandidates.slice(0, 5)
        const activeDefectList = [...queryDefectSet].join(', ') || issueType || 'General Warehouse Discrepancy'
        const exclusionBlock = prevList.length > 0
          ? `\nPreviously Suggested Actions Already Shown to the User (DO NOT repeat or closely paraphrase these—you MUST propose a distinctly different, alternative Corrective Action and Preventive Action approach):\n${prevList.map((p, i) => `${i + 1}. Corrective: ${p.corrective} | Preventive: ${p.preventive || 'N/A'}`).join('\n')}\n`
          : ''

        const prompt = `You are a Quality Assurance (QA) and Warehouse Inventory Manager.
Based on the specific Discrepancy Details and Selected Defect Categories below, generate a tailored Immediate Corrective Action (containment, disposition, sorting/repackaging, vendor claim, or disposal) and a Preventive Action Plan.
Adapt any relevant insights from the Historical Closed QDDR Cases below, but MUST tailor your actions specifically to the active material, location, and exact defect categories (do NOT repeat a generic quarantine response if the defect is a labeling, batch code, short pack, or stretch-wrapping issue).
${exclusionBlock}
Active QDDR Details:
- Full Description & Material: ${description}
- Selected Defect Categories: ${activeDefectList}
- Warehouse / Inspection Location: ${deptName || 'Warehouse / Inventory'}

Historical Closed QDDR Cases (Retrieved via CBR for reference):
${ragReferenceCases.map((q, i) => `${i + 1}. [Similarity: ${Math.round((q.baseSim || 0) * 100)}%] Material: ${q.material_description || 'N/A'} | Discrepancy: ${q.reason_of_discrepancy} | Corrective: ${q.corrective_action} | Preventive: ${q.preventive_action || 'N/A'}`).join('\n') || 'None available'}

Respond ONLY in this JSON format with no markdown:
{"suggestion": "specific corrective/disposition action here", "preventive_suggestion": "specific preventive action here"}`

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: prevList.length > 0 ? 0.65 : 0.35,
              responseMimeType: 'application/json'
            }
          })
        })

        if (res.ok) {
          const data = await res.json()
          const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json|```/g, '').trim()
          const parsed = JSON.parse(text)
          if (parsed?.suggestion && !isPreviouslySuggested(parsed.suggestion, parsed.preventive_suggestion, prevList)) {
            return {
              suggestion: parsed.suggestion,
              preventive_suggestion: parsed.preventive_suggestion,
              confidence: computeRagConfidence(ragReferenceCases, queryDefectSet.size > 0),
              sourceDetails: ragReferenceCases.length > 0
                ? 'CBR + RAG Case Adaptation (Gemini Flash)'
                : 'Generative AI (Gemini Flash)',
              matchedFeatures: [...queryDefectSet]
            }
          }
        }
      } catch (geminiErr) {
        console.warn('[suggestionService] Gemini call failed for QDDR, falling back to heuristics:', geminiErr.message)
      }
    }

    return {
      ...generateFallbackHeuristicSuggestion({
        description,
        issueType,
        deptName,
        isQddr: true,
        defectSet: queryDefectSet,
        prevList
      }),
      sourceDetails: 'System Heuristics'
    }
  }

  // ── ROUTE 2: CAR CASE REPOSITORY (Non-Conformance + 5 Whys / Fishbone RCA) ──
  const carCandidates = await fetchCarCaseCandidates(embedding, issueType)
  let scoredCandidates = []

  if (carCandidates.length > 0) {
    const queryKeywords = extractKeywords(combinedQueryText)
    const rcaKeywords = cleanRca ? extractKeywords(cleanRca) : new Set()
    const normQueryCategory = normalizeCarCategory(issueType)
    const normQueryDept = String(deptName || '').trim().toLowerCase()

    scoredCandidates = carCandidates
      .filter(c => Number(c.effectiveness_score ?? 0.7) >= 0.5)
      .map(c => {
        const vectorSim = Number(c.similarity ?? 0)
        const caseKeywords = extractKeywords(
          `${c.details_of_nonconformance || ''} ${c.root_cause_analysis || ''} ${c.product_material_name || ''}`
        )
        const caseRcaKeywords = extractKeywords(c.root_cause_analysis || '')
        const keywordSim = jaccardSimilarity(queryKeywords, caseKeywords)
        const rcaOverlap = rcaKeywords.size > 0 && caseRcaKeywords.size > 0
          ? jaccardSimilarity(rcaKeywords, caseRcaKeywords)
          : 0

        const normCaseCategory = normalizeCarCategory(c.issue_category)
        const categoryMatch = normQueryCategory && normCaseCategory && normQueryCategory === normCaseCategory ? 1.0 : 0.0

        const respDept = String(c.responsible_department || '').trim().toLowerCase()
        const reqDept = String(c.requesting_department || '').trim().toLowerCase()
        const deptMatch = normQueryDept && (normQueryDept === respDept || normQueryDept === reqDept) ? 1.0 : 0.0

        const categoryAndDeptSim = (0.60 * categoryMatch) + (0.40 * deptMatch)

        // Multi-attribute Base Similarity (45% Vector + 25% RCA Overlap + 15% Category/Dept + 15% Keywords)
        const baseSim = vectorSim > 0
          ? (0.45 * vectorSim) + (0.25 * rcaOverlap) + (0.15 * categoryAndDeptSim) + (0.15 * keywordSim)
          : (0.45 * rcaOverlap) + (0.25 * categoryAndDeptSim) + (0.30 * keywordSim)

        const rawEff = Number(c.effectiveness_score ?? 0.7)
        const effNorm = rawEff > 1 ? Math.min(rawEff / 5, 1) : Math.min(Math.max(rawEff, 0), 1)
        const compositeScore = (0.80 * baseSim) + (0.20 * effNorm)

        return {
          ...c,
          vectorSim,
          keywordSim,
          rcaOverlap,
          categoryAndDeptSim,
          baseSim,
          effNorm,
          compositeScore
        }
      })
      .sort((a, b) => b.compositeScore - a.compositeScore)

    // Pick the highest-scoring candidate that hasn't already been suggested for this report
    const topUnseenCarMatch = scoredCandidates.find(c =>
      c.baseSim >= DIRECT_CBR_THRESHOLD &&
      c.corrective_action &&
      !isPreviouslySuggested(c.corrective_action, c.preventive_action, prevList)
    )

    // Tier 1: Direct CBR Reuse requires baseSim >= 0.75 and not previously suggested
    if (topUnseenCarMatch) {
      const simScore = topUnseenCarMatch.baseSim
      const starDisplay = Number((topUnseenCarMatch.effNorm * 5).toFixed(1))
      const rcaFeatureLabel =
        rcaMethod === 'fishbone'
          ? 'Fishbone (6M) RCA matching'
          : rcaMethod === 'both'
            ? 'Fishbone (6M) + 5 Whys RCA matching'
            : '5 Whys RCA matching'

      return {
        suggestion: topUnseenCarMatch.corrective_action,
        preventive_suggestion: topUnseenCarMatch.preventive_action || 'Establish supervisory verification checkpoints.',
        confidence: Number(Math.min(Math.max(topUnseenCarMatch.compositeScore, 0.75), 0.99).toFixed(2)),
        sourceDetails: 'CAR Case Repository (CBR)',
        matchedFeatures: cleanRca
          ? [rcaFeatureLabel, `problem similarity (${Math.round(simScore * 100)}%)`, `★ ${starDisplay}/5 rated CAPA`]
          : [`problem similarity (${Math.round(simScore * 100)}%)`, `★ ${starDisplay}/5 rated CAPA`]
      }
    }
  }

  // Tier 2: CBR-Guided RAG Case Adaptation with Gemini Flash
  if (apiKey) {
    try {
      const ragCarCases = scoredCandidates.slice(0, 5)
      const exclusionBlock = prevList.length > 0
        ? `\nPreviously Suggested Actions Already Shown to the User (DO NOT repeat or closely paraphrase these—you MUST propose a distinctly different, alternative Corrective Action and Preventive Action approach):\n${prevList.map((p, i) => `${i + 1}. Corrective: ${p.corrective} | Preventive: ${p.preventive || 'N/A'}`).join('\n')}\n`
        : ''

      const prompt = `You are an ISO 9001 Quality Assurance expert. Based on the Non-Conformance Details and the Root Cause Analysis (5 Whys / Fishbone 6M) already conducted by the team, suggest a tailored Immediate Corrective Action and a Preventive Action Plan.
Do NOT generate a Root Cause Analysis—only generate the Corrective Action and Preventive Action that directly resolve and prevent the identified Root Cause.
${exclusionBlock}
Non-Conformance & Root Cause Details:
- Non-Conformance Details: ${description}
- Root Cause Analysis (${rcaMethod || '5 Whys / Fishbone'}): ${cleanRca || 'Not specified'}
- Category: ${issueType || 'General'}
- Responsible Department: ${deptName || 'N/A'}

Historical Closed CAR Cases (Retrieved via CBR for reference):
${ragCarCases.map((c, i) => `${i + 1}. [Similarity: ${Math.round((c.baseSim || 0) * 100)}%] Non-Conformance: ${c.details_of_nonconformance} | RCA: ${c.root_cause_analysis || 'N/A'} | Corrective: ${c.corrective_action} | Preventive: ${c.preventive_action || 'N/A'}`).join('\n') || 'None available'}

Respond ONLY in this JSON format with no markdown:
{"suggestion": "immediate corrective action here", "preventive_suggestion": "long-term preventive action plan here"}`

      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: prevList.length > 0 ? 0.65 : 0.35,
            responseMimeType: 'application/json'
          }
        })
      })

      if (res.ok) {
        const data = await res.json()
        const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(text)
        if (parsed?.suggestion && !isPreviouslySuggested(parsed.suggestion, parsed.preventive_suggestion, prevList)) {
          return {
            suggestion: parsed.suggestion,
            preventive_suggestion: parsed.preventive_suggestion,
            confidence: computeRagConfidence(ragCarCases, Boolean(cleanRca)),
            sourceDetails: ragCarCases.length > 0
              ? 'CBR + RAG Case Adaptation (Gemini Flash)'
              : 'Generative AI (Gemini Flash)',
            matchedFeatures: cleanRca ? ['RCA-aligned CAPA synthesis'] : []
          }
        }
      }
    } catch (geminiErr) {
      console.warn('[suggestionService] Gemini call failed for CAR, falling back to heuristics:', geminiErr.message)
    }
  }

  return {
    ...generateFallbackHeuristicSuggestion({
      description: combinedQueryText,
      issueType,
      deptName,
      isQddr: false,
      prevList
    }),
    sourceDetails: 'System Heuristics'
  }
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
  reportType = 'CAR',
  materialDescription = '',
  materialCode = '',
  qty = '',
  discrepancyTypes = '',
}) {
  const cleanBase64 = String(imageBase64 || '').replace(/^data:[^;]+;base64,/, '').trim()
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const resolvedMimeType = allowedMimes.includes(String(mimeType || '').toLowerCase())
    ? String(mimeType).toLowerCase()
    : 'image/jpeg'

  const isQddr =
    String(reportType || '').toUpperCase() === 'QDDR' ||
    Boolean(materialDescription || materialCode)

  const resolvedMaterial = materialDescription || productType || 'affected material'

  const buildFallbackDescription = () => {
    if (isQddr) {
      const codeClause = materialCode ? ` (Item Code: ${materialCode})` : ''
      const batchClause = batchNumber ? `, Batch/ISU No: ${batchNumber}` : ''
      const qtyClause = qty !== '' && qty !== null && qty !== undefined ? ` involving ${qty} unit(s)/case(s)` : ''
      const typeClause = discrepancyTypes ? ` exhibiting ${discrepancyTypes}` : ''
      const photoClause = cleanBase64
        ? 'Attached photographic evidence confirms the physical condition of the affected stock.'
        : 'Reported condition requires immediate segregation, containment, and disposition review.'
      return `Quality inspection at ${location || 'the warehouse'} identified discrepancy${qtyClause} of ${resolvedMaterial}${codeClause}${batchClause}${typeClause}. ${photoClause}`
    }

    const sevLabel = severity ? `${String(severity).toUpperCase()}-severity` : 'reported'
    const deptClause = department ? ` assigned to the ${department} department` : ''
    const issueClause = issueType ? ` categorized under ${issueType}` : ''
    return `Visual inspection at ${location || 'the facility'} identified a ${sevLabel} non-conformance${issueClause} involving ${productType || 'affected material'} (Batch/Lot: ${batchNumber || 'N/A'})${deptClause}. Attached photographic evidence documents the observed condition requiring containment and root-cause investigation.`
  }

  if (!cleanBase64) {
    const fallbackDesc = buildFallbackDescription()
    const tags = await autoClassifyTags(fallbackDesc, isQddr ? 'QDDR' : 'CAR')
    return { description: fallbackDesc, tags, source: 'heuristic' }
  }

  const optionalQddrContext = [
    location ? `- Location: ${location}` : '',
    materialDescription || productType ? `- Material Description: ${resolvedMaterial}` : '',
    materialCode ? `- Material Code: ${materialCode}` : '',
    batchNumber ? `- Batch / ISU Number: ${batchNumber}` : '',
    qty !== '' && qty !== null && qty !== undefined ? `- Affected Quantity: ${qty}` : '',
    discrepancyTypes ? `- Selected Discrepancy Types: ${discrepancyTypes}` : ''
  ].filter(Boolean).join('\n   ')

  const prompt = isQddr
    ? `You are a Quality Assurance (QA) warehouse inspector converting an uploaded evidence photo into the "Reason of Discrepancy" description for a Quality Defects / Damaged / Discrepancy Report (QDDR).
Examine the uploaded evidence photo carefully and write a concise, objective 2-3 sentence "Reason of Discrepancy" paragraph that:
1. Directly describes the visible physical defect, damage, or discrepancy shown in the image (e.g., crushed/dented cans or cartons, wet/leaked packaging, torn stretch wrap, broken seal, punctures, stained boxes, or missing/damaged label).
${optionalQddrContext ? `2. Naturally incorporates these provided report details where relevant (do NOT mention any field that is not listed here and never write "N/A"):\n   ${optionalQddrContext}` : '2. Focuses strictly on what is visually observable in the evidence image without inventing missing codes or writing "N/A".'}
Return ONLY the plain-text paragraph without markdown, quotes, or bullet points.`
    : `You are a Quality Assurance (QA) inspector writing an objective non-conformance description for a Quality Management System.
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
          const tags = await autoClassifyTags(generatedText, isQddr ? 'QDDR' : 'CAR')
          return { description: generatedText, tags, source: 'gemini-vision' }
        }
      }
    } catch (err) {
      console.warn('[suggestionService] Gemini Vision call failed:', err.message)
    }
  }

  const fallbackDesc = buildFallbackDescription()
  const tags = await autoClassifyTags(fallbackDesc, isQddr ? 'QDDR' : 'CAR')
  return { description: fallbackDesc, tags, source: 'heuristic' }
}

/**
 * Extracts warehouse pallet label & barcode fields (Material Code, Material Description + Expiry Date,
 * and Batch Code) from an uploaded/captured label image and/or a raw barcode string.
 */
export async function scanPalletLabel({ imageBase64, mimeType = 'image/jpeg', rawBarcode = '' }) {
  const cleanBase64 = String(imageBase64 || '').replace(/^data:[^;]+;base64,/, '').trim()
  const cleanBarcode = String(rawBarcode || '').trim()
  const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const resolvedMimeType = allowedMimes.includes(String(mimeType || '').toLowerCase())
    ? String(mimeType).toLowerCase()
    : 'image/jpeg'

  let extracted = {
    material_code: '',
    material_description: '',
    batch_code_su_number: '',
    expiry_date: '',
    source: 'barcode'
  }

  const geminiApiKey = process.env.GEMINI_API_KEY
  if (cleanBase64 && geminiApiKey) {
    try {
      const prompt = `You are a warehouse barcode and pallet sticker scanner.
Inspect this warehouse pallet label / barcode image and extract the following fields:
1. "material_code": The Material / Item Code (e.g., the number next to "Material", such as "1011" or "1165", or the item barcode digits).
2. "material_description": The Item / Material Description text printed below or near the Material number (e.g., "AL Crema Asada Can 48x370ml" or "Cow Evapsarap 48x360ml").
3. "batch_code_su_number": The Batch Code under "Batch / Expiry" (e.g., "10SE27JST2" or "20JL27TCB3"). If no batch code is shown, use the SU / SSCC barcode number (e.g., "1004230347").
4. "expiry_date": The Expiry Date shown under "Batch / Expiry" (e.g., "10.09.2027" or "20.07.2027").
${cleanBarcode ? `Note: A barcode scanner also detected this raw value from the label: "${cleanBarcode}".` : ''}

Return ONLY valid JSON in this exact format:
{
  "material_code": "",
  "material_description": "",
  "batch_code_su_number": "",
  "expiry_date": ""
}`

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
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
        }
      )

      if (response.ok) {
        const data = await response.json()
        const rawText = (data.candidates?.[0]?.content?.parts?.[0]?.text || '')
          .replace(/```json|```/g, '')
          .trim()
        if (rawText) {
          const parsed = JSON.parse(rawText)
          const rawDesc = String(parsed.material_description || '').trim()
          const rawExp = String(parsed.expiry_date || '').trim()
          const combinedDesc =
            rawDesc && rawExp && !rawDesc.toLowerCase().includes(rawExp.toLowerCase())
              ? `${rawDesc} (Exp: ${rawExp})`
              : rawDesc || (rawExp ? `Exp: ${rawExp}` : '')

          extracted = {
            material_code: String(parsed.material_code || '').trim(),
            material_description: combinedDesc,
            batch_code_su_number: String(parsed.batch_code_su_number || '').trim(),
            expiry_date: rawExp,
            source: 'gemini-vision'
          }
        }
      }
    } catch (err) {
      console.warn('[suggestionService] scanPalletLabel Gemini Vision error:', err.message)
    }
  }

  if (cleanBarcode) {
    if (!extracted.material_code && /^\d{3,8}$/.test(cleanBarcode)) {
      extracted.material_code = cleanBarcode
    } else if (!extracted.batch_code_su_number) {
      extracted.batch_code_su_number = cleanBarcode.replace(/^\(00\)\s*/, '')
    }
  }

  // Enrich with External Inventory Management synced record (if available)
  if (extracted.batch_code_su_number || extracted.material_code) {
    try {
      const { lookupExternalInventoryForQddr } = await import('./integrationService.js')
      const invMatch = await lookupExternalInventoryForQddr({
        batchCodeSuNumber: extracted.batch_code_su_number,
        materialCode: extracted.material_code
      })
      if (invMatch) {
        extracted.inventory_matched = true
        extracted.inventory_source = invMatch.inventory_source || 'api'
        if (invMatch.available_stock_qty !== undefined) {
          extracted.available_stock_qty = invMatch.available_stock_qty
        }
        if (!extracted.material_code && invMatch.material_code) {
          extracted.material_code = invMatch.material_code
        }
        if (!extracted.batch_code_su_number && invMatch.batch_code_su_number) {
          extracted.batch_code_su_number = invMatch.batch_code_su_number
        }
        if (!extracted.expiry_date && invMatch.expiry_date) {
          extracted.expiry_date = invMatch.expiry_date
        }
        if (!extracted.material_description && invMatch.material_description) {
          const expSuffix = extracted.expiry_date && !invMatch.material_description.toLowerCase().includes(extracted.expiry_date.toLowerCase())
            ? ` (Exp: ${extracted.expiry_date})`
            : ''
          extracted.material_description = `${invMatch.material_description}${expSuffix}`
        }

        // Only attach non-empty delivery/shipment fields present in the inventory record
        const extraFields = [
          'po_reference',
          'drwb_number',
          'brand_supplier',
          'trucker_broker',
          'plate_number',
          'container_number',
          'location'
        ]
        for (const f of extraFields) {
          if (invMatch[f]) {
            extracted[f] = invMatch[f]
          }
        }
      }
    } catch (invErr) {
      console.warn('[suggestionService] External inventory lookup on SU scan failed:', invErr.message)
    }
  }

  if ((extracted.material_code || extracted.batch_code_su_number) && !extracted.material_description) {
    try {
      let query = supabase
        .from('qddr_reports')
        .select('material_code, material_description, batch_code_su_number')
        .order('created_at', { ascending: false })
        .limit(1)

      if (extracted.material_code) {
        query = query.eq('material_code', extracted.material_code)
      } else if (extracted.batch_code_su_number) {
        query = query.eq('batch_code_su_number', extracted.batch_code_su_number)
      }

      const { data: match } = await query.maybeSingle()
      if (match) {
        extracted.material_code = extracted.material_code || match.material_code || ''
        extracted.material_description = extracted.material_description || match.material_description || ''
        extracted.batch_code_su_number = extracted.batch_code_su_number || match.batch_code_su_number || ''
      }
    } catch (dbErr) {
      console.warn('[suggestionService] Historical QDDR lookup for barcode failed:', dbErr.message)
    }
  }

  return extracted
}

import { supabase } from '../lib/supabase.js'
import { extractKeywords, extractKeywordsWithLLM, jaccardSimilarity } from '../utils/cbr.js'

/**
 * Clusters an incoming CAR report against past CAR reports from the last 30 days.
 *
 * @param {string|number} carId
 */
export async function analyzeAndClusterCarReportInBackground(carId) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY

    // 1. Fetch CAR report
    const { data: newReport, error: fetchErr } = await supabase
      .from('car_reports')
      .select('id, reference_no, details_of_nonconformance, responsible_department, requesting_department, site_id, trend_cluster_id')
      .eq('id', carId)
      .maybeSingle()

    if (fetchErr || !newReport) return
    if (newReport.trend_cluster_id) return // already clustered
    const description = String(newReport.details_of_nonconformance || '').trim()
    if (!description) return

    // 2. Fetch candidates from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let query = supabase
      .from('car_reports')
      .select('id, details_of_nonconformance, site_id, trend_cluster_id')
      .neq('id', newReport.id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (newReport.site_id) query = query.eq('site_id', newReport.site_id)
    else query = query.is('site_id', null)

    const { data: candidates, error: candidateErr } = await query
    if (candidateErr || !candidates || candidates.length === 0) return

    // 3. Semantic similarity calculation
    const newKeywords = await extractKeywordsWithLLM(description, geminiApiKey)
    let bestMatch = null
    let highestSim = 0

    for (const candidate of candidates) {
      const candidateDesc = String(candidate.details_of_nonconformance || '')
      if (!candidateDesc) continue
      const candidateKeywords = extractKeywords(candidateDesc)
      const sim = jaccardSimilarity(newKeywords, candidateKeywords)
      if (sim >= 0.20 && sim > highestSim) {
        highestSim = sim
        bestMatch = { ...candidate, keywords: [...candidateKeywords] }
      }
    }

    if (!bestMatch) return

    // 4. Link or create cluster
    const sharedKeywords = [...newKeywords].filter(k => bestMatch.keywords.includes(k))

    if (bestMatch.trend_cluster_id) {
      await supabase
        .from('car_reports')
        .update({ trend_cluster_id: bestMatch.trend_cluster_id })
        .eq('id', newReport.id)

      await supabase
        .from('trend_clusters')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', bestMatch.trend_cluster_id)
    } else {
      const summary = await generateCarTrendSummary(
        { description },
        { description: bestMatch.details_of_nonconformance },
        sharedKeywords
      )

      const { data: newCluster, error: clusterErr } = await supabase
        .from('trend_clusters')
        .insert({
          report_type: 'CAR',
          keywords: sharedKeywords,
          ai_summary: summary
        })
        .select('id')
        .maybeSingle()

      if (!clusterErr && newCluster?.id) {
        await supabase
          .from('car_reports')
          .update({ trend_cluster_id: newCluster.id })
          .in('id', [newReport.id, bestMatch.id])
      }
    }
  } catch (err) {
    console.error('[trendClusteringService] Error in analyzeAndClusterCarReportInBackground:', err.message)
  }
}

/**
 * Clusters an incoming QDDR defect report against past QDDR reports from the last 30 days
 * to detect recurring packaging damage, supplier discrepancy, or material defect trends.
 *
 * @param {string|number} qddrId
 */
export async function analyzeAndClusterQddrReportInBackground(qddrId) {
  try {
    const geminiApiKey = process.env.GEMINI_API_KEY

    // 1. Fetch QDDR report
    const { data: newReport, error: fetchErr } = await supabase
      .from('qddr_reports')
      .select('id, reference_no, reason_of_discrepancy, material_description, brand_supplier, site_id, trend_cluster_id')
      .eq('id', qddrId)
      .maybeSingle()

    if (fetchErr || !newReport) return
    if (newReport.trend_cluster_id) return // already clustered
    const discrepancy = String(newReport.reason_of_discrepancy || '').trim()
    if (!discrepancy) return

    // 2. Fetch QDDR candidates from the last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    let query = supabase
      .from('qddr_reports')
      .select('id, reason_of_discrepancy, material_description, brand_supplier, site_id, trend_cluster_id')
      .neq('id', newReport.id)
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (newReport.site_id) query = query.eq('site_id', newReport.site_id)
    else query = query.is('site_id', null)

    const { data: candidates, error: candidateErr } = await query
    if (candidateErr || !candidates || candidates.length === 0) return

    // 3. Calculate keyword & text similarity
    const newKeywords = await extractKeywordsWithLLM(
      `${discrepancy} ${newReport.material_description || ''} ${newReport.brand_supplier || ''}`,
      geminiApiKey
    )
    let bestMatch = null
    let highestSim = 0

    for (const candidate of candidates) {
      const candidateText = `${candidate.reason_of_discrepancy || ''} ${candidate.material_description || ''} ${candidate.brand_supplier || ''}`
      const candidateKeywords = extractKeywords(candidateText)
      let sim = jaccardSimilarity(newKeywords, candidateKeywords)

      // Brand/supplier bonus if identical supplier
      if (
        newReport.brand_supplier &&
        candidate.brand_supplier &&
        String(newReport.brand_supplier).trim().toLowerCase() === String(candidate.brand_supplier).trim().toLowerCase()
      ) {
        sim += 0.15
      }

      if (sim >= 0.20 && sim > highestSim) {
        highestSim = sim
        bestMatch = { ...candidate, keywords: [...candidateKeywords] }
      }
    }

    if (!bestMatch) return

    // 4. Link or create cluster
    const sharedKeywords = [...newKeywords].filter(k => bestMatch.keywords.includes(k))

    if (bestMatch.trend_cluster_id) {
      await supabase
        .from('qddr_reports')
        .update({ trend_cluster_id: bestMatch.trend_cluster_id })
        .eq('id', newReport.id)

      await supabase
        .from('trend_clusters')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', bestMatch.trend_cluster_id)
    } else {
      const summary = await generateQddrTrendSummary(newReport, bestMatch, sharedKeywords)

      const { data: newCluster, error: clusterErr } = await supabase
        .from('trend_clusters')
        .insert({
          report_type: 'QDDR',
          keywords: sharedKeywords,
          ai_summary: summary
        })
        .select('id')
        .maybeSingle()

      if (!clusterErr && newCluster?.id) {
        await supabase
          .from('qddr_reports')
          .update({ trend_cluster_id: newCluster.id })
          .in('id', [newReport.id, bestMatch.id])
      }
    }
  } catch (err) {
    console.error('[trendClusteringService] Error in analyzeAndClusterQddrReportInBackground:', err.message)
  }
}

/**
 * Backward compatibility alias: defaults to CAR clustering.
 */
export async function analyzeAndClusterReportInBackground(reportId) {
  return analyzeAndClusterCarReportInBackground(reportId)
}

/**
 * Fetches recurring clusters and their associated reports (for CAR, QDDR, or both).
 *
 * @param {Object} options
 * @param {string} [options.type='all'] - 'CAR', 'QDDR', or 'all'
 * @param {number} [options.days=14]
 * @param {string|null} [options.siteId=null]
 * @returns {Promise<Object[]>}
 */
export async function fetchRecurringTrends({ type = 'all', days = 14, siteId = null } = {}) {
  const numericDays = Number(days) > 0 ? Number(days) : 14
  const cutoff = new Date(Date.now() - numericDays * 24 * 60 * 60 * 1000).toISOString()

  let clusterQuery = supabase
    .from('trend_clusters')
    .select('id, report_type, ai_summary, keywords, updated_at')
    .gte('updated_at', cutoff)
    .order('updated_at', { ascending: false })

  if (type && type !== 'all') {
    clusterQuery = clusterQuery.eq('report_type', type.toUpperCase())
  }

  const { data: clusters, error } = await clusterQuery
  if (error || !clusters || clusters.length === 0) return []

  const clusterIds = clusters.map(c => c.id)

  const [carsRes, qddrsRes] = await Promise.all([
    supabase
      .from('car_reports')
      .select('id, reference_no, details_of_nonconformance, created_at, status, site_id, trend_cluster_id')
      .in('trend_cluster_id', clusterIds),
    supabase
      .from('qddr_reports')
      .select('id, reference_no, reason_of_discrepancy, material_description, brand_supplier, created_at, status, site_id, trend_cluster_id')
      .in('trend_cluster_id', clusterIds)
  ])

  const cars = carsRes.data || []
  const qddrs = qddrsRes.data || []

  const result = []

  for (const cluster of clusters) {
    let reports = []
    if (cluster.report_type === 'QDDR') {
      reports = qddrs
        .filter(q => q.trend_cluster_id === cluster.id)
        .filter(q => !siteId || String(q.site_id) === String(siteId))
        .map(q => ({
          id: q.id,
          reference_no: q.reference_no,
          description: q.reason_of_discrepancy,
          material: q.material_description,
          supplier: q.brand_supplier,
          created_at: q.created_at,
          status: q.status,
          report_type: 'QDDR',
          recurring_reason: cluster.ai_summary || 'Recurring warehouse discrepancy.'
        }))
    } else {
      reports = cars
        .filter(c => c.trend_cluster_id === cluster.id)
        .filter(c => !siteId || String(c.site_id) === String(siteId))
        .map(c => ({
          id: c.id,
          reference_no: c.reference_no,
          description: c.details_of_nonconformance,
          created_at: c.created_at,
          status: c.status,
          report_type: 'CAR',
          recurring_reason: cluster.ai_summary || 'Recurring non-conformance trend.'
        }))
    }

    if (reports.length > 1) {
      result.push({
        cluster_id: cluster.id,
        report_type: cluster.report_type || 'CAR',
        summary: cluster.ai_summary,
        keywords: cluster.keywords,
        reports
      })
    }
  }

  return result
}

// ─── AI Summary Helpers ──────────────────────────────────────────────────────

async function generateCarTrendSummary(reportA, reportB, sharedKeywords) {
  const geminiApiKey = process.env.GEMINI_API_KEY
  if (!geminiApiKey) {
    return `Recurring non-conformance. Shared keywords: ${sharedKeywords.join(', ')}`
  }

  const prompt = `You are an ISO 9001 QA analyst. Two Corrective Action Reports (CAR) have been flagged as recurring issues.
Report 1: "${reportA.description}"
Report 2: "${reportB.description}"
Shared Keywords: ${sharedKeywords.join(', ')}

Write a single, concise sentence (maximum 20 words) summarizing what this recurring non-conformance trend is about.`

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    })

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
    const data = await response.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return summary || `Recurring non-conformance involving: ${sharedKeywords.join(', ')}`
  } catch (err) {
    return `Recurring non-conformance. Shared keywords: ${sharedKeywords.join(', ')}`
  }
}

async function generateQddrTrendSummary(reportA, reportB, sharedKeywords) {
  const geminiApiKey = process.env.GEMINI_API_KEY
  const supplierInfo = reportA.brand_supplier ? `Supplier: ${reportA.brand_supplier}. ` : ''
  if (!geminiApiKey) {
    return `Recurring warehouse discrepancy. ${supplierInfo}Shared keywords: ${sharedKeywords.join(', ')}`
  }

  const prompt = `You are a warehouse inventory and quality supervisor. Two Quality Defect Discrepancy Reports (QDDR) have been flagged as a recurring defect trend.
Report 1: "${reportA.reason_of_discrepancy}" (Material: ${reportA.material_description || 'N/A'}, Supplier: ${reportA.brand_supplier || 'N/A'})
Report 2: "${reportB.reason_of_discrepancy}" (Material: ${reportB.material_description || 'N/A'}, Supplier: ${reportB.brand_supplier || 'N/A'})
Shared Keywords: ${sharedKeywords.join(', ')}

Write a single, concise sentence (maximum 20 words) summarizing this recurring warehouse defect/discrepancy pattern for the inventory manager.`

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    })

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`)
    const data = await response.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
    return summary || `Recurring warehouse defect pattern involving ${sharedKeywords.join(', ')}`
  } catch (err) {
    return `Recurring warehouse discrepancy. ${supplierInfo}Shared keywords: ${sharedKeywords.join(', ')}`
  }
}

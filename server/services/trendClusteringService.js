import { supabase } from '../lib/supabase.js'
import { extractKeywords, jaccardSimilarity } from '../utils/cbr.js'


const GEMINI_API_KEY = process.env.GEMINI_API_KEY

export async function analyzeAndClusterReportInBackground(reportId) {
  try {
    // 1. Fetch the report
    const { data: newReport, error: fetchErr } = await supabase
      .from('ncr_reports')
      .select('id, description, product_type_id, issue_type_id, department_id, location_id, trend_cluster_id')
      .eq('id', reportId)
      .maybeSingle()
      
    if (fetchErr || !newReport) return
    if (newReport.trend_cluster_id) return // Already clustered

    // 2. Fetch potential matches (last 30 days, matching metadata)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    let query = supabase
      .from('ncr_reports')
      .select('id, description, trend_cluster_id')
      .neq('id', newReport.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      
    // Enforce strict metadata matching
    if (newReport.product_type_id) query = query.eq('product_type_id', newReport.product_type_id)
    else query = query.is('product_type_id', null)
    
    if (newReport.issue_type_id) query = query.eq('issue_type_id', newReport.issue_type_id)
    else query = query.is('issue_type_id', null)
    
    if (newReport.department_id) query = query.eq('department_id', newReport.department_id)
    else query = query.is('department_id', null)
    
    if (newReport.location_id) query = query.eq('location_id', newReport.location_id)
    else query = query.is('location_id', null)
    
    const { data: candidates, error: candidateErr } = await query
    if (candidateErr || !candidates || candidates.length === 0) return
    
    // 3. Calculate semantic similarity
    const newKeywords = extractKeywords(newReport.description || '')
    let bestMatch = null
    let highestSim = 0
    
    for (const candidate of candidates) {
      const candidateKeywords = extractKeywords(candidate.description || '')
      const sim = jaccardSimilarity(newKeywords, candidateKeywords)
      if (sim >= 0.20 && sim > highestSim) {
        highestSim = sim
        bestMatch = { ...candidate, keywords: candidateKeywords }
      }
    }
    
    if (!bestMatch) return // No semantic match found
    
    // 4. We found a match!
    const sharedKeywords = newKeywords.filter(k => bestMatch.keywords.includes(k))
    
    if (bestMatch.trend_cluster_id) {
      // 4a. Join existing cluster
      await supabase
        .from('ncr_reports')
        .update({ trend_cluster_id: bestMatch.trend_cluster_id })
        .eq('id', newReport.id)
        
      // Update cluster updated_at
      await supabase
        .from('trend_clusters')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', bestMatch.trend_cluster_id)
        
    } else {
      // 4b. Create brand new cluster and call Gemini
      const summary = await generateTrendSummary(newReport, bestMatch, sharedKeywords)
      
      const { data: newCluster, error: clusterErr } = await supabase
        .from('trend_clusters')
        .insert({
          product_type_id: newReport.product_type_id,
          issue_type_id: newReport.issue_type_id,
          department_id: newReport.department_id,
          location_id: newReport.location_id,
          keywords: sharedKeywords,
          ai_summary: summary
        })
        .select('id')
        .maybeSingle()
        
      if (clusterErr || !newCluster) {
         console.error('Failed to create trend cluster', clusterErr)
         return
      }
      
      // Update both reports to link to this new cluster
      await supabase
        .from('ncr_reports')
        .update({ trend_cluster_id: newCluster.id })
        .in('id', [newReport.id, bestMatch.id])
    }
    
  } catch (err) {
    console.error('Error in analyzeAndClusterReportInBackground:', err)
  }
}

async function generateTrendSummary(reportA, reportB, sharedKeywords) {
  if (!GEMINI_API_KEY) {
    return `Recurring issue flagged due to similar descriptions. Shared keywords: ${sharedKeywords.join(', ')}`
  }
  
  const prompt = `You are a quality assurance analyst. Two Non-Conformance Reports (NCR) have been flagged as a recurring trend because they share the same product type, issue category, department, location, and have similar descriptions.
  
Report 1 Description: "${reportA.description}"
Report 2 Description: "${reportB.description}"
Shared Keywords Detected: ${sharedKeywords.join(', ')}

Please write a single, concise sentence (maximum 20 words) summarizing what this recurring issue is about, so an auditor instantly understands the problem. Do not use generic words like "Report 1" or "Report 2". Write the summary directly.`

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
    return summary || `Recurring issue involving: ${sharedKeywords.join(', ')}`
  } catch (err) {
    console.error('Gemini trend generation failed:', err)
    return `Recurring issue flagged due to similar descriptions. Shared keywords: ${sharedKeywords.join(', ')}`
  }
}

import { supabase } from '../lib/supabase.js'

async function fetchReportById(ncrId) {
    const { data, error } = await supabase
        .from('ncr_reports')
        .select('issue_type, department_id, description, severity, investigation_details, resolution_details')
        .eq('id', ncrId)
        .single()

    if (error) throw error
    return data
}

async function fetchCaseRepository(issueType) {
    const { data, error } = await supabase
        .from('case_repository')
        .select('corrective_action, preventive_action, effectiveness_score, problem_keywords, issue_type, times_used')
        .eq('issue_type', issueType)
        .order('effectiveness_score', { ascending: false })
        .limit(5)

    if (error) throw error
    return data || []
}

async function fetchRatedNcrReports(issueType, departmentId) {
    // Get NCR reports with average rating >= 3
    const { data: ratings, error: ratingsError } = await supabase
        .from('ncr_report_ratings')
        .select('report_id, rating')
        .gte('rating', 3)

    if (ratingsError) throw ratingsError

    // Group and average ratings per report
    const ratingMap = {}
    for (const r of ratings || []) {
        if (!ratingMap[r.report_id]) ratingMap[r.report_id] = { total: 0, count: 0 }
        ratingMap[r.report_id].total += r.rating
        ratingMap[r.report_id].count += 1
    }

    const qualifiedReportIds = Object.entries(ratingMap)
        .filter(([, v]) => v.total / v.count >= 3)
        .map(([id]) => Number(id))

    if (qualifiedReportIds.length === 0) return []

    // Fetch those NCR reports filtered by issue_type or department
    const { data, error } = await supabase
        .from('ncr_reports')
        .select(`
      id, description, issue_type, severity, department_id,
      investigation_details, resolution_details,
      corrective_actions (action_description, effectiveness_notes, status)
    `)
        .in('id', qualifiedReportIds)
        .or(`issue_type.eq.${issueType},department_id.eq.${departmentId}`)
        .eq('status', 'CLOSED')
        .limit(5)

    if (error) throw error
    return data || []
}

async function fetchCarReports(departmentId) {
    const { data, error } = await supabase
        .from('car_reports')
        .select('details_of_nonconformance, corrective_action_description, requesting_department, responsible_department, status')
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

export async function findSimilarCases(ncrId) {
    const report = await fetchReportById(ncrId)

    const [caseRepo, ratedNcrs, carReports, qddrReports] = await Promise.all([
        fetchCaseRepository(report.issue_type),
        fetchRatedNcrReports(report.issue_type, report.department_id),
        fetchCarReports(report.department_id),
        fetchQddrReports(report.department_id),
    ])

    return {
        report,
        caseRepo,
        ratedNcrs,
        carReports,
        qddrReports,
    }
}

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
            ncr_id: ncrId,
            ai_suggestion: suggestion,
            confidence_score: confidence,
            prediction_type: 'corrective_action',
            predicted_risk: 'corrective',
        })

    if (error) throw error
}
import { supabase } from '@/utils/supabase'
import { submitCarReport } from '@/services/carService'

/**
 * Fetches all audit results to compute overall compliance score.
 */
export async function fetchAuditResults() {
  const { data, error } = await supabase
    .from('audit_results')
    .select('status')
  if (error) throw error
  return data || []
}

/**
 * Fetches non-compliant audit results along with their clause and run information.
 */
export async function fetchNonCompliantFindings() {
  const { data, error } = await supabase
    .from('audit_results')
    .select(`
      id,
      status,
      requirement,
      what_to_look_for,
      evidence,
      notes,
      attachment_url,
      clause_id,
      run_id,
      audit_runs (
        id,
        schedule_id,
        auditor_id,
        audit_schedules (
          id,
          title,
          scheduled_date,
          standard_id,
          iso_standards (
            name,
            version
          )
        )
      ),
      iso_clauses (
        clause_number,
        title
      )
    `)
    .in('status', ['ofi', 'minor_nc', 'major_nc'])
  if (error) throw error
  return data || []
}

/**
 * Deprecated stub: NCR reports have been replaced by CAR and QDDR.
 */
export async function fetchNcrReportsForISO() {
  return []
}

/**
 * Resolves requesting department and user dropdown items.
 */
export async function fetchDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('id, department_name')
  if (error) throw error
  return data || []
}

export async function fetchUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, status')
  if (error) throw error
  return data || []
}

/**
 * Fetches the latest CAR reference number to determine the next numeric index.
 */
export async function fetchLatestCarReferenceNo() {
  const { data, error } = await supabase
    .from('car_reports')
    .select('reference_no')
    .ilike('reference_no', 'CAR-%')
    .order('reference_no', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

/**
 * Inserts a new CAR report record via the validated backend CAR API.
 */
export async function createCarReport(carPayload, userAuthId) {
  if (userAuthId) {
    return await submitCarReport(carPayload, userAuthId)
  }
  const { data: sessionData } = await supabase.auth.getSession()
  const resolvedAuthId = sessionData?.session?.user?.id
  if (resolvedAuthId) {
    return await submitCarReport(carPayload, resolvedAuthId)
  }
  throw new Error('Missing authentication. Please log in.')
}

/**
 * Associates a CAR report with an ISO clause.
 */
export async function linkCarToClause(carReportId, clauseId) {
  const { error } = await supabase
    .from('car_clause_links')
    .upsert(
      [{ car_report_id: carReportId, clause_id: clauseId }],
      { onConflict: 'car_report_id,clause_id', ignoreDuplicates: true }
    )
  if (error) throw error
}

/**
 * Fetches active ISO standards modules.
 */
export async function fetchActiveIsoStandards() {
  const { data, error } = await supabase
    .from('iso_standards')
    .select('id, name, version, description')
    .eq('is_active', true)
    .order('name', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Fetches clause groups under a standard.
 */
export async function fetchClauseGroupsForStandard(standardId) {
  const { data, error } = await supabase
    .from('iso_clause_groups')
    .select('id')
    .eq('standard_id', standardId)
  if (error) throw error
  return data || []
}

/**
 * Fetches clauses under the specified group IDs.
 */
export async function fetchClausesByGroupIds(groupIds) {
  const { data, error } = await supabase
    .from('iso_clauses')
    .select('clause_number, title, description')
    .in('group_id', groupIds)
  if (error) throw error
  return data || []
}

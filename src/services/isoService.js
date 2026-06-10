import { supabase } from '@/utils/supabase'

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
      evidence,
      clause_id,
      run_id,
      audit_runs (
        schedule_id
      ),
      iso_clauses (
        clause_number,
        title
      )
    `)
    .eq('status', 'non_compliant')
  if (error) throw error
  return data || []
}

/**
 * Fetches ncr_id lists from all CAR reports to check which NCRs are already linked.
 */
export async function fetchLinkedCarNcrIds() {
  const { data, error } = await supabase
    .from('car_reports')
    .select('ncr_id')
  if (error) throw error
  return data || []
}

/**
 * Fetches all NCR reports (both open and closed) for ISO page compliance grouping.
 */
export async function fetchNcrReportsForISO() {
  const { data, error } = await supabase
    .from('ncr_reports')
    .select(`
      id,
      reference_no,
      severity,
      clause_id,
      description,
      iso_clauses (
        clause_number,
        title
      )
    `)
  if (error) throw error
  return data || []
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
    .select('id, first_name, last_name, user_name')
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
 * Inserts a new CAR report record.
 */
export async function createCarReport(carPayload) {
  const { data, error } = await supabase
    .from('car_reports')
    .insert(carPayload)
    .select('id')
    .maybeSingle()
  if (error) throw error
  return data
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

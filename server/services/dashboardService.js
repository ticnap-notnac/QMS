import { supabase } from '../lib/supabase.js'

const parseResolutionTimeToHours = (resTime, start, end) => {
  if (resTime) {
    const match = String(resTime).match(/(\d+)\s*(day|hour)/i)
    if (match) {
      const value = parseInt(match[1], 10)
      const unit = match[2].toLowerCase()
      if (unit.startsWith('day')) {
        return value * 24
      }
      return value
    }
  }
  if (start && end) {
    const diff = new Date(end) - new Date(start)
    if (diff > 0) {
      return Number((diff / (1000 * 60 * 60)).toFixed(1))
    }
  }
  return null
}

export async function fetchResolutionTrends() {
  // Only fetch data from the last 12 months to prevent DB slowdowns with large datasets
  const dateOneYearAgo = new Date()
  dateOneYearAgo.setFullYear(dateOneYearAgo.getFullYear() - 1)
  const oneYearAgoStr = dateOneYearAgo.toISOString()

  const [ncrsRes, carsRes, qddrsRes] = await Promise.all([
    supabase
      .from('ncr_reports')
      .select('created_at, resolution_time')
      .eq('status', 'CLOSED')
      .gte('created_at', oneYearAgoStr),
    supabase
      .from('car_reports')
      .select('created_at, request_date, resolution_time, verification_date, updated_at')
      .eq('status', 'closed')
      .gte('created_at', oneYearAgoStr),
    supabase
      .from('qddr_reports')
      .select('created_at, updated_at')
      .eq('status', 'closed')
      .gte('created_at', oneYearAgoStr)
  ])

  const ncrs = ncrsRes.data || []
  const cars = carsRes.data || []
  const qddrs = qddrsRes.data || []

  const months = {}

  const addValue = (dateStr, val, type) => {
    if (val === null || isNaN(val)) return
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return
    const monthKey = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear()
    if (!months[monthKey]) {
      months[monthKey] = {
        ncrSum: 0, ncrCount: 0,
        carSum: 0, carCount: 0,
        qddrSum: 0, qddrCount: 0,
        rawDate: d
      }
    }
    months[monthKey][`${type}Sum`] += val
    months[monthKey][`${type}Count`] += 1
  }

  ncrs.forEach(item => {
    const val = parseResolutionTimeToHours(item.resolution_time, item.created_at, null)
    addValue(item.created_at, val, 'ncr')
  })

  cars.forEach(item => {
    const val = parseResolutionTimeToHours(item.resolution_time, item.created_at || item.request_date, item.verification_date || item.updated_at)
    addValue(item.created_at || item.request_date, val, 'car')
  })

  qddrs.forEach(item => {
    const val = parseResolutionTimeToHours(null, item.created_at, item.updated_at)
    addValue(item.created_at, val, 'qddr')
  })

  return Object.entries(months)
    .map(([month, data]) => {
      const ncrAvg = data.ncrCount > 0 ? Number((data.ncrSum / data.ncrCount).toFixed(1)) : null
      const carAvg = data.carCount > 0 ? Number((data.carSum / data.carCount).toFixed(1)) : null
      const qddrAvg = data.qddrCount > 0 ? Number((data.qddrSum / data.qddrCount).toFixed(1)) : null
      return {
        month,
        NCR: ncrAvg,
        CAR: carAvg,
        QDDR: qddrAvg,
        rawDate: data.rawDate.toISOString() // convert Date back to string for JSON serialization
      }
    })
    .sort((a, b) => new Date(a.rawDate) - new Date(b.rawDate))
}

export async function fetchPendingRatings(userAuthId) {
  // 1. Get the current user details
  const { data: currentUser, error: userError } = await supabase
    .from('users')
    .select('id, department_id, role:roles(role_name)')
    .eq('auth_id', userAuthId)
    .maybeSingle()
  
  if (userError || !currentUser) throw new Error('User not found.')

  const normalizedRole = String(currentUser.role?.role_name || '').toLowerCase().trim()
  const isAuditorOrAdmin = normalizedRole === 'auditor' || normalizedRole === 'admin'
  const isManager = normalizedRole === 'department manager' || normalizedRole === 'manager'

  // 2. Query closed reports based on role access
  let query = supabase
    .from('ncr_reports')
    .select('id, reference_no, description, corrective_action, department_id, reported_by')
    .eq('status', 'CLOSED')

  if (!isAuditorOrAdmin) {
    if (isManager && currentUser.department_id) {
      query = query.eq('department_id', currentUser.department_id)
    } else {
      query = query.eq('reported_by', currentUser.id)
    }
  }

  const { data: reports, error: reportsErr } = await query
  if (reportsErr) throw reportsErr

  if (!reports || reports.length === 0) return []

  const reportIds = reports.map(r => r.id)

  // 3. Find which of these reports the user has ALREADY rated
  // Since we use the service_role key on the backend, this bypasses RLS safely!
  const { data: ratings, error: ratingsErr } = await supabase
    .from('ncr_report_ratings')
    .select('report_id')
    .eq('rated_by', currentUser.id)
    .in('report_id', reportIds)

  if (ratingsErr) throw ratingsErr

  const ratedIds = new Set((ratings || []).map(r => r.report_id))

  // 4. Return the pending ones
  const pending = reports.filter(r => !ratedIds.has(r.id))
  return pending
}

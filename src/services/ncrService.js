// Deprecated NCR service stubs returning safe defaults now that NCR is phased out
// in favor of CAR (Customer complaints & audits) and QDDR (Disposal & defects).

export async function fetchReports() {
  return []
}

export async function fetchInvestigatedReports() {
  return []
}

export async function fetchAllReports() {
  return []
}

export async function fetchClosedReports() {
  return []
}

export async function createReport() {
  console.warn('createReport is deprecated. Use CAR or QDDR services instead.')
  return { success: false, message: 'NCR is deprecated. Use CAR or QDDR instead.' }
}

export async function updateReport() {
  return { success: false }
}

export async function updateReportInvestigationMultipart() {
  return { success: false }
}

export async function assignReportToEmployee() {
  return { success: false }
}

export async function reviewReportApproval() {
  return { success: false }
}

export async function rateReport() {
  return { success: false }
}

export async function getReportRating() {
  return null
}

export async function deleteReport() {
  return { success: false }
}

export async function submitNcrMultipart() {
  return { success: false }
}

export async function fetchRecurringTrends() {
  return []
}

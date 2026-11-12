import { useState } from 'react'

export function useReportsForm() {
  const [reportFilters, setReportFilters] = useState({
    departmentId: '',
    status: '',
    severities: [],
    date: ''
  })

  return {
    reportFilters,
    setReportFilters
  }
}

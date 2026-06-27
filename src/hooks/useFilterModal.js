import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/utils/supabase'

const DEFAULT_FILTERS = {
  departmentId: '',
  status: '',
  severities: [],
  date: '',
}

function normalizeDateInput(value) {
  const trimmed = String(value || '').trim()
  if (!trimmed) return ''

  const isoMatch = trimmed.match(/^\d{4}-\d{2}-\d{2}$/)
  if (isoMatch) {
    return trimmed
  }

  const displayMatch = trimmed.match(/^(\d{2})-(\d{2})-(\d{4})$/)
  if (!displayMatch) {
    return ''
  }

  const [, day, month, year] = displayMatch
  return `${year}-${month}-${day}`
}

export default function useFilterModal({ onApplyFilters, onClearFilters }) {
  const [selectedDepartment, setSelectedDepartment] = useState(DEFAULT_FILTERS.departmentId)
  const [selectedStatus, setSelectedStatus] = useState(DEFAULT_FILTERS.status)
  const [selectedSeverities, setSelectedSeverities] = useState(DEFAULT_FILTERS.severities)
  const [selectedDate, setSelectedDate] = useState(DEFAULT_FILTERS.date)
  const [departments, setDepartments] = useState([])
  const [departmentsLoading, setDepartmentsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isApplying, setIsApplying] = useState(false)

  useEffect(() => {
    let active = true

    const fetchDepartments = async () => {
      setDepartmentsLoading(true)
      try {
        const { data, error: fetchError } = await supabase
          .from('departments')
          .select('id, department_name')
          .order('department_name')

        if (fetchError) {
          throw fetchError
        }

        if (active) {
          setDepartments(Array.isArray(data) ? data : [])
        }
      } catch (fetchError) {
        if (active) {
          setError('We could not load the departments list. Please try again.')
        }
      } finally {
        if (active) {
          setDepartmentsLoading(false)
        }
      }
    }

    fetchDepartments()

    return () => {
      active = false
    }
  }, [])

  const toggleSeverity = useCallback((severity) => {
    const normalized = String(severity || '').trim().toLowerCase()
    if (!normalized) return

    setSelectedSeverities((current) => {
      if (current.includes(normalized)) {
        return current.filter((item) => item !== normalized)
      }

      return [...current, normalized]
    })
  }, [])

  const resetFilters = useCallback(() => {
    setSelectedDepartment(DEFAULT_FILTERS.departmentId)
    setSelectedStatus(DEFAULT_FILTERS.status)
    setSelectedSeverities(DEFAULT_FILTERS.severities)
    setSelectedDate(DEFAULT_FILTERS.date)
  }, [])

  const applyFilters = useCallback(async () => {
    if (!onApplyFilters) return

    setIsApplying(true)
    setError(null)

    try {
      await onApplyFilters({
        departmentId: selectedDepartment,
        status: selectedStatus,
        severities: selectedSeverities,
        date: normalizeDateInput(selectedDate),
      })
    } catch (applyError) {
      setError('The filters could not be applied. Please try again.')
      throw applyError
    } finally {
      setIsApplying(false)
    }
  }, [onApplyFilters, selectedDate, selectedDepartment, selectedSeverities, selectedStatus])

  const clearFilters = useCallback(async () => {
    resetFilters()
    setError(null)
    if (onClearFilters) {
      await onClearFilters()
    }
  }, [onClearFilters, resetFilters])

  const selectedSeveritiesSet = useMemo(() => new Set(selectedSeverities), [selectedSeverities])

  return {
    departments,
    departmentsLoading,
    error,
    isApplying,
    selectedDepartment,
    setSelectedDepartment,
    selectedStatus,
    setSelectedStatus,
    selectedSeverities,
    selectedSeveritiesSet,
    selectedDate,
    setSelectedDate,
    toggleSeverity,
    applyFilters,
    clearFilters,
    resetFilters,
  }
}

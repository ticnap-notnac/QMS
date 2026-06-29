import { useState, useCallback } from 'react'
import { fetchLinkedClausesForCar } from '@/services/carService'
import { generateAiSuggestionFromText } from '@/services/suggestionService'

export function useCARDetails() {
  const [selectedCar, setSelectedCar] = useState(null)
  const [isCarDetailsModalOpen, setIsCarDetailsModalOpen] = useState(false)

  // Form and async states
  const [rootCause, setRootCause] = useState('')
  const [correctiveAction, setCorrectiveAction] = useState('')
  const [preventiveAction, setPreventiveAction] = useState('')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestionMeta, setSuggestionMeta] = useState(null)
  const [error, setError] = useState('')

  const [linkedClauses, setLinkedClauses] = useState([])
  const [loadingClauses, setLoadingClauses] = useState(false)

  // Sync state with selected CAR details & Fetch linked clauses
  const openCarDetails = useCallback((car) => {
    setSelectedCar(car)
    if (car) {
      setRootCause(car.root_cause_analysis || '')
      setCorrectiveAction(car.corrective_action || '')
      setPreventiveAction(car.preventive_action || '')
      setVerificationNotes(car.verification_notes || '')
      setSuggestionMeta(null)
      setError('')

      setLoadingClauses(true)
      fetchLinkedClausesForCar(car.id)
        .then(clauses => {
          setLinkedClauses(clauses || [])
        })
        .catch(err => {
          console.error('Error fetching linked clauses for CAR:', err)
        })
        .finally(() => {
          setLoadingClauses(false)
        })
    } else {
      setLinkedClauses([])
    }
    setIsCarDetailsModalOpen(true)
  }, [])

  const closeCarDetails = useCallback(() => {
    setSelectedCar(null)
    setIsCarDetailsModalOpen(false)
    setLinkedClauses([])
    setSuggestionMeta(null)
  }, [])

  const handleSuggestActions = async () => {
    if (!selectedCar) return
    setSuggesting(true)
    setError('')
    setSuggestionMeta(null)
    try {
      const res = await generateAiSuggestionFromText({
        description: selectedCar.details_of_nonconformance,
        issueType: selectedCar.quality_food_safety ? 'quality' : selectedCar.environment_health_safety ? 'safety' : selectedCar.security_issue ? 'security' : selectedCar.internal_audit ? 'audit' : 'general',
        deptName: selectedCar.responsible_department
      })
      if (res?.suggestion) {
        setCorrectiveAction(res.suggestion)
      }
      if (res?.preventive_suggestion) {
        setPreventiveAction(res.preventive_suggestion)
      }
      if (res?.sourceDetails) {
        setSuggestionMeta({
          sourceDetails: res.sourceDetails,
          matchedFeatures: res.matchedFeatures || [],
          confidence: res.confidence || 0
        })
      }
      setRootCause('Based on historical matching cases, the root cause is being verified. Action plan suggested.')
    } catch (err) {
      console.error('Failed to get suggestions:', err)
      setError('We could not generate suggestions. Please try again later.')
    } finally {
      setSuggesting(false)
    }
  }

  const handleCapaSubmit = async (e, onSubmitCapa, authUserId) => {
    if (e) e.preventDefault()
    if (!selectedCar) return
    if (!rootCause.trim() || !correctiveAction.trim() || !preventiveAction.trim()) {
      setError('All CAPA fields are required.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const updated = await onSubmitCapa(selectedCar.id, {
        rootCauseAnalysis: rootCause,
        correctiveAction,
        preventiveAction
      }, authUserId)
      
      // Update selected car details with updated data
      if (updated) {
        setSelectedCar(updated)
      }
      closeCarDetails()
    } catch (err) {
      setError('The CAPA plan could not be submitted. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleVerificationSubmit = async (outcome, onVerify, authUserId) => {
    if (!selectedCar) return
    if (!verificationNotes.trim()) {
      setError('Verification notes are required to resolve this audit.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const updated = await onVerify(selectedCar.id, {
        outcome,
        notes: verificationNotes
      }, authUserId)
      
      if (updated) {
        setSelectedCar(updated)
      }
      closeCarDetails()
    } catch (err) {
      setError('The verification could not be submitted. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return {
    selectedCar,
    setSelectedCar,
    isCarDetailsModalOpen,
    openCarDetails,
    closeCarDetails,
    onSelectCar: openCarDetails,
    
    // Form and async states
    rootCause,
    setRootCause,
    correctiveAction,
    setCorrectiveAction,
    preventiveAction,
    setPreventiveAction,
    verificationNotes,
    setVerificationNotes,
    submitting,
    suggesting,
    error,
    suggestionMeta,
    linkedClauses,
    loadingClauses,
    
    // Actions
    handleSuggestActions,
    handleCapaSubmit,
    handleVerificationSubmit
  }
}

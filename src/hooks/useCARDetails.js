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
  const [targetVerificationDate, setTargetVerificationDate] = useState('')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [verificationRating, setVerificationRating] = useState('')
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
      setTargetVerificationDate(car.target_verification_date ? car.target_verification_date.split('T')[0] : '')
      setVerificationNotes(car.verification_notes || '')
      setVerificationRating(car.verification_rating || '')
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
    setVerificationRating('')
  }, [])

  const handleSuggestActions = async () => {
    if (!selectedCar) return
    setSuggesting(true)
    setError('')
    setSuggestionMeta(null)
    try {
      const result = await generateAiSuggestionFromText({
        description: selectedCar.details_of_nonconformance,
        issueType: selectedCar.quality_food_safety ? 'quality' : selectedCar.environment_health_safety ? 'safety' : selectedCar.security_issue ? 'security' : selectedCar.internal_audit ? 'audit' : 'general',
        deptName: selectedCar.responsible_department
      })

      let res = result;
      if (result?.jobId) {
        const { fetchJobStatus } = await import('@/services/suggestionService')
        res = await new Promise((resolve, reject) => {
            const maxRetries = 20;
            let retries = 0;
            const interval = setInterval(async () => {
                try {
                    const status = await fetchJobStatus(result.jobId, result.queue)
                    if (status.state === 'completed') {
                        clearInterval(interval)
                        resolve(status.output)
                    } else if (status.state === 'failed' || status.state === 'cancelled') {
                        clearInterval(interval)
                        reject(new Error('Background job failed'))
                    }
                    if (++retries >= maxRetries) {
                        clearInterval(interval)
                        reject(new Error('Background job timeout'))
                    }
                } catch (e) {
                    // ignore network errors during polling
                }
            }, 3000)
        })
      }

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
    if (!rootCause.trim() || !correctiveAction.trim() || !preventiveAction.trim() || !targetVerificationDate) {
      setError('All CAPA fields, including the target verification date, are required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const updated = await onSubmitCapa(selectedCar.id, {
        rootCauseAnalysis: rootCause,
        correctiveAction,
        preventiveAction,
        targetVerificationDate
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
    if (!verificationRating.trim()) {
      setError('Verification rating is required.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const updated = await onVerify(selectedCar.id, {
        outcome,
        notes: verificationNotes,
        verificationRating
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
    targetVerificationDate,
    setTargetVerificationDate,
    verificationNotes,
    setVerificationNotes,
    verificationRating,
    setVerificationRating,
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

import { useState, useCallback } from 'react'
import { fetchLinkedClausesForCar } from '@/services/carService'
import { generateAiSuggestionFromText } from '@/services/suggestionService'

const INITIAL_FIVE_WHYS = {
  why1: '',
  why2: '',
  why3: '',
  why4: '',
  why5: ''
}

const INITIAL_FISHBONE = {
  man: '',
  machine: '',
  material: '',
  method: '',
  measurement: '',
  environment: ''
}

const FISHBONE_LABELS = [
  { key: 'man', label: 'Man (People)' },
  { key: 'machine', label: 'Machine (Equipment)' },
  { key: 'material', label: 'Material' },
  { key: 'method', label: 'Method (Process)' },
  { key: 'measurement', label: 'Measurement' },
  { key: 'environment', label: 'Environment' }
]

export function formatRcaText(method, whys = INITIAL_FIVE_WHYS, bones = INITIAL_FISHBONE, summary = '') {
  const whyLines = [1, 2, 3, 4, 5]
    .map(n => ({ n, val: String(whys[`why${n}`] || '').trim() }))
    .filter(item => item.val.length > 0)
    .map(item => `Why ${item.n}: ${item.val}`)

  const boneLines = FISHBONE_LABELS
    .map(b => ({ label: b.label, val: String(bones[b.key] || '').trim() }))
    .filter(item => item.val.length > 0)
    .map(item => `• ${item.label}: ${item.val}`)

  const cleanSummary = String(summary || '').trim()

  if (method === '5whys') {
    if (whyLines.length === 0 && !cleanSummary) return ''
    const parts = ['[Method: 5 Whys]', ...whyLines]
    if (cleanSummary) parts.push(`Root Cause: ${cleanSummary}`)
    return parts.join('\n')
  }

  if (method === 'fishbone') {
    if (boneLines.length === 0 && !cleanSummary) return ''
    const parts = ['[Method: Fishbone (6M)]', ...boneLines]
    if (cleanSummary) parts.push(`Root Cause: ${cleanSummary}`)
    return parts.join('\n')
  }

  // method === 'both'
  if (boneLines.length === 0 && whyLines.length === 0 && !cleanSummary) return ''
  const parts = ['[Method: Fishbone (6M) + 5 Whys]']
  if (boneLines.length > 0) {
    parts.push('Fishbone (6M) Factors:', ...boneLines)
  }
  if (whyLines.length > 0) {
    parts.push('5 Whys Drill-Down:', ...whyLines)
  }
  if (cleanSummary) {
    parts.push(`Root Cause: ${cleanSummary}`)
  }
  return parts.join('\n')
}

export function parseExistingRca(rawText = '') {
  const text = String(rawText || '').trim()
  const whys = { ...INITIAL_FIVE_WHYS }
  const bones = { ...INITIAL_FISHBONE }

  if (!text) {
    return { method: '5whys', fiveWhys: whys, fishbone: bones, summary: '' }
  }

  let method = '5whys'
  if (/\[Method:\s*Fishbone\s*\(6M\)\s*\+\s*5\s*Whys\]/i.test(text)) {
    method = 'both'
  } else if (/\[Method:\s*Fishbone/i.test(text)) {
    method = 'fishbone'
  } else if (/\[Method:\s*5\s*Whys\]/i.test(text)) {
    method = '5whys'
  }

  const lines = text.split(/\r?\n/)
  let matchedStructuredLine = false
  let summary = ''
  const unstructuredLines = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue
    if (/^\[Method:/i.test(line) || /^Fishbone \(6M\) Factors:/i.test(line) || /^5 Whys Drill-Down:/i.test(line)) {
      matchedStructuredLine = true
      continue
    }

    const whyMatch = line.match(/^Why\s*([1-5])\s*:\s*(.+)$/i)
    if (whyMatch) {
      whys[`why${whyMatch[1]}`] = whyMatch[2].trim()
      matchedStructuredLine = true
      continue
    }

    let matchedBone = false
    for (const b of FISHBONE_LABELS) {
      const escapedLabel = b.label.replace(/[()]/g, '\\$&')
      const boneRegex = new RegExp(`^[•\\-*]?\\s*${escapedLabel}\\s*:\\s*(.+)$`, 'i')
      const m = line.match(boneRegex)
      if (m) {
        bones[b.key] = m[1].trim()
        matchedBone = true
        matchedStructuredLine = true
        break
      }
    }
    if (matchedBone) continue

    const rcMatch = line.match(/^Root\s*Cause\s*:\s*(.+)$/i)
    if (rcMatch) {
      summary = rcMatch[1].trim()
      matchedStructuredLine = true
      continue
    }

    unstructuredLines.push(line)
  }

  if (!matchedStructuredLine) {
    summary = text
  } else if (!summary && unstructuredLines.length > 0) {
    summary = unstructuredLines.join(' ')
  }

  return { method, fiveWhys: whys, fishbone: bones, summary }
}

export function useCARDetails() {
  const [selectedCar, setSelectedCar] = useState(null)
  const [isCarDetailsModalOpen, setIsCarDetailsModalOpen] = useState(false)

  // Structured RCA states (5 Whys / Fishbone 6M / Both)
  const [rcaMethod, setRcaMethod] = useState('5whys')
  const [fiveWhys, setFiveWhys] = useState(INITIAL_FIVE_WHYS)
  const [fishbone, setFishbone] = useState(INITIAL_FISHBONE)
  const [rootCauseSummary, setRootCauseSummary] = useState('')

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

  const handleRcaMethodChange = useCallback((nextMethod) => {
    setRcaMethod(nextMethod)
    setRootCause(formatRcaText(nextMethod, fiveWhys, fishbone, rootCauseSummary))
    if (error) setError('')
  }, [fiveWhys, fishbone, rootCauseSummary, error])

  const handleFiveWhyChange = useCallback((key, value) => {
    setFiveWhys(prev => {
      const next = { ...prev, [key]: value }
      setRootCause(formatRcaText(rcaMethod, next, fishbone, rootCauseSummary))
      return next
    })
    if (error) setError('')
  }, [rcaMethod, fishbone, rootCauseSummary, error])

  const handleFishboneChange = useCallback((key, value) => {
    setFishbone(prev => {
      const next = { ...prev, [key]: value }
      setRootCause(formatRcaText(rcaMethod, fiveWhys, next, rootCauseSummary))
      return next
    })
    if (error) setError('')
  }, [rcaMethod, fiveWhys, rootCauseSummary, error])

  const handleRootCauseSummaryChange = useCallback((value) => {
    setRootCauseSummary(value)
    setRootCause(formatRcaText(rcaMethod, fiveWhys, fishbone, value))
    if (error) setError('')
  }, [rcaMethod, fiveWhys, fishbone, error])

  // Sync state with selected CAR details & Fetch linked clauses
  const openCarDetails = useCallback((car) => {
    setSelectedCar(car)
    if (car) {
      const parsedRca = parseExistingRca(car.root_cause_analysis || '')
      setRcaMethod(parsedRca.method)
      setFiveWhys(parsedRca.fiveWhys)
      setFishbone(parsedRca.fishbone)
      setRootCauseSummary(parsedRca.summary)
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
    setRcaMethod('5whys')
    setFiveWhys(INITIAL_FIVE_WHYS)
    setFishbone(INITIAL_FISHBONE)
    setRootCauseSummary('')
  }, [])

  const handleSuggestActions = async () => {
    if (!selectedCar) return

    const currentFormattedRca = formatRcaText(rcaMethod, fiveWhys, fishbone, rootCauseSummary) || rootCause
    if (!String(currentFormattedRca || '').trim()) {
      setError('Please fill in the Root Cause Analysis (5 Whys / Fishbone) first so CBR can match the root cause and suggest appropriate actions.')
      return
    }

    setSuggesting(true)
    setError('')
    setSuggestionMeta(null)
    try {
      const result = await generateAiSuggestionFromText({
        description: selectedCar.details_of_nonconformance,
        rootCause: currentFormattedRca,
        rcaMethod,
        issueType: selectedCar.type_of_nonconformance || 'general',
        deptName: selectedCar.responsible_department,
        reportType: 'CAR'
      })

      let res = result
      if (result?.jobId) {
        const { fetchJobStatus } = await import('@/services/suggestionService')
        res = await new Promise((resolve, reject) => {
          const maxRetries = 20
          let retries = 0
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

    const finalRootCause = (formatRcaText(rcaMethod, fiveWhys, fishbone, rootCauseSummary) || rootCause).trim()
    if (!finalRootCause || !correctiveAction.trim() || !preventiveAction.trim() || !targetVerificationDate) {
      setError('All CAPA fields (including Root Cause Analysis and Target Verification Date) are required.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const updated = await onSubmitCapa(selectedCar.id, {
        rootCauseAnalysis: finalRootCause,
        correctiveAction,
        preventiveAction,
        targetVerificationDate
      }, authUserId)

      if (updated) {
        setSelectedCar(updated)
      }
      closeCarDetails()
    } catch (err) {
      setError(err?.message || 'The CAPA plan could not be submitted. Please try again.')
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
    if (outcome === 'effective' && !String(verificationRating || '').trim()) {
      setError('Verification rating is required when marking a CAR as effective.')
      return
    }

    setSubmitting(true)
    setError('')
    try {
      const updated = await onVerify(selectedCar.id, {
        outcome,
        notes: verificationNotes,
        verificationRating: String(verificationRating || '').trim() || null
      }, authUserId)

      if (updated) {
        setSelectedCar(updated)
      }
      closeCarDetails()
    } catch (err) {
      setError(err?.message || 'The verification could not be submitted. Please try again.')
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

    // Structured RCA (5 Whys / Fishbone / Both)
    rcaMethod,
    setRcaMethod: handleRcaMethodChange,
    fiveWhys,
    handleFiveWhyChange,
    fishbone,
    handleFishboneChange,
    rootCauseSummary,
    handleRootCauseSummaryChange,

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

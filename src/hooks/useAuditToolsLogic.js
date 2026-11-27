import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../utils/supabase'
import { fetchLogs } from '../services/logService'
import { useCARDetails } from './useCARDetails'
import { useAuditRunDetails } from './useAuditRunDetails'
import * as checklistService from '../services/auditChecklistService'
import { request } from '../lib/api'

const COLLABORATOR_COLORS = [
  '#2563eb', // blue
  '#16a34a', // green
  '#9333ea', // purple
  '#ea580c', // orange
  '#0891b2', // cyan
  '#db2777', // pink
  '#4f46e5', // indigo
  '#ca8a04', // amber
  '#059669', // emerald
  '#e11d48'  // rose
]

function getCollaboratorColor(id = '') {
  let hash = 0
  const str = String(id || 'default')
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % COLLABORATOR_COLORS.length
  return COLLABORATOR_COLORS[index]
}

export default function useAuditToolsLogic({ authUserId, userName = '', userRole = '', activeTabParam = 'Logs' }) {
  const [activeTab, setActiveTabRaw] = useState(() => {
    try {
      return sessionStorage.getItem('audit_active_tab') || activeTabParam
    } catch {
      return activeTabParam
    }
  })

  const setActiveTab = useCallback((tab) => {
    setActiveTabRaw(tab)
    try {
      sessionStorage.setItem('audit_active_tab', tab)
    } catch {}
  }, [])
  
  // Current auditor identity & avatar styling
  const [currentAuditorProfile, setCurrentAuditorProfile] = useState({
    id: authUserId,
    name: userName || 'Auditor',
    role: userRole || 'Auditor',
    color: getCollaboratorColor(authUserId)
  })

  useEffect(() => {
    if (authUserId) {
      supabase
        .from('users')
        .select('first_name, last_name, roles(role_name)')
        .eq('auth_id', authUserId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const fullName = [data.first_name, data.last_name].filter(Boolean).join(' ') || userName || 'Auditor'
            const roleName = data.roles?.role_name || userRole || 'Auditor'
            setCurrentAuditorProfile({
              id: authUserId,
              name: fullName,
              role: roleName,
              color: getCollaboratorColor(authUserId)
            })
          }
        })
        .catch(err => console.warn('Could not load user profile for auditor collaboration:', err))
    }
  }, [authUserId, userName, userRole])

  // Real-time Collaboration (Google Docs style) states
  const [collaborators, setCollaborators] = useState([])
  const [activeEditing, setActiveEditing] = useState({}) // { [resultKey]: { evidence: { name, color }, notes: { name, color } } }
  const [remoteFlashMap, setRemoteFlashMap] = useState({}) // { [resultKey]: { evidence: bool, notes: bool, status: bool } }
  const [saveStatus, setSaveStatus] = useState('saved') // 'saved' | 'saving' | 'synced' | 'error'
  const [recentActivity, setRecentActivity] = useState('')
  const [activeAuditorsBySchedule, setActiveAuditorsBySchedule] = useState({}) // { [scheduleId]: [{ id, name, color }] }
  const [progressBySchedule, setProgressBySchedule] = useState({}) // { [scheduleId]: { evaluated, total, percent } }

  const roomChannelRef = useRef(null)
  const globalHubChannelRef = useRef(null)
  const recentActivityTimerRef = useRef(null)

  const triggerRecentActivity = useCallback((message) => {
    setRecentActivity(message)
    if (recentActivityTimerRef.current) clearTimeout(recentActivityTimerRef.current)
    recentActivityTimerRef.current = setTimeout(() => {
      setRecentActivity('')
    }, 4000)
  }, [])

  // Data lists
  const [schedules, setSchedules] = useState([])
  const [standards, setStandards] = useState([])
  const [auditors, setAuditors] = useState([])
  const [templates, setTemplates] = useState([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  
  // Loading & Action states
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setErrorState] = useState('')
  const [success, setSuccessState] = useState('')
  const [toast, setToast] = useState(null)

  const setError = (msg) => {
    setErrorState(msg || '')
    if (msg) {
      setToast({ message: msg, type: 'error' })
    } else {
      setToast(null)
    }
  }

  const setSuccess = (msg) => {
    setSuccessState(msg || '')
    if (msg) {
      setToast({ message: msg, type: 'success' })
    } else {
      setToast(null)
    }
  }

  // Clear stale inline messages and errors on tab switch
  useEffect(() => {
    setErrorState('')
    setSuccessState('')
    setToast(null)
  }, [activeTab])

  // Form fields
  const [title, setTitle] = useState('')
  const [standardId, setStandardId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [auditorId, setAuditorId] = useState('')
  const [templateId, setTemplateId] = useState('')

  // Checklist / Audit Run states
  const [activeRun, setActiveRunState] = useState(null)

  const setActiveRun = useCallback((val) => {
    setActiveRunState(val)
    try {
      if (val?.schedule_id) {
        sessionStorage.setItem('audit_active_schedule_id', val.schedule_id)
      } else {
        sessionStorage.removeItem('audit_active_schedule_id')
      }
    } catch {}
  }, [])
  const [activeClauses, setActiveClauses] = useState([])
  const [resultsMap, setResultsMap] = useState({})
  const [savingProgress, setSavingProgress] = useState(false)
  const lastSavedSnapshotRef = useRef('')
  const resultsMapRef = useRef({})
  const activeRunRef = useRef(null)
  const isAutoSavingRef = useRef(false)
  const pendingAutoSaveRef = useRef(false)
  const dirtyKeysRef = useRef(new Set())
  const [linkedCarsMap, setLinkedCarsMap] = useState({})  // { [clause_id]: [{ id, reference_no, status }] }

  // Audit Logs states
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState('')
  const [logsPage, setLogsPage] = useState(0)
  const [logsTotal, setLogsTotal] = useState(0)
  const logsLimit = 15

  // Audit Reports states
  const [completedRuns, setCompletedRuns] = useState([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportsError, setReportsError] = useState('')

  // Hook states
  const auditRunDetails = useAuditRunDetails()
  const carDetails = useCARDetails()


  // Google Docs Style Real-Time Broadcast Actions
  const broadcastClauseChange = useCallback((resultKey, field, value) => {
    if (!roomChannelRef.current || !activeRunRef.current?.id) return
    roomChannelRef.current.send({
      type: 'broadcast',
      event: 'clause_change',
      payload: {
        resultKey,
        field,
        value,
        userId: authUserId,
        userName: currentAuditorProfile.name
      }
    })
  }, [authUserId, currentAuditorProfile.name])

  const broadcastFieldFocus = useCallback((resultKey, field) => {
    if (!roomChannelRef.current || !activeRunRef.current?.id) return
    roomChannelRef.current.send({
      type: 'broadcast',
      event: 'field_focus',
      payload: {
        resultKey,
        field,
        user: {
          id: authUserId,
          name: currentAuditorProfile.name,
          color: currentAuditorProfile.color
        }
      }
    })
  }, [authUserId, currentAuditorProfile.name, currentAuditorProfile.color])

  const broadcastFieldBlur = useCallback((resultKey, field) => {
    if (!roomChannelRef.current || !activeRunRef.current?.id) return
    roomChannelRef.current.send({
      type: 'broadcast',
      event: 'field_blur',
      payload: {
        resultKey,
        field,
        userId: authUserId
      }
    })
  }, [authUserId])

  // Start/Resume Audit

  const handleStartAudit = async (schedule) => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const { data: existingRuns, error: runError } = await supabase
        .from('audit_runs')
        .select('*')
        .eq('schedule_id', schedule.id)
        .is('completed_at', null)
        .order('started_at', { ascending: false })
      
      if (runError) throw runError

      let activeRunData = null

      if (existingRuns && existingRuns.length > 0) {
        activeRunData = existingRuns[0]
        if (schedule.status !== 'in_progress') {
          await supabase
            .from('audit_schedules')
            .update({ status: 'in_progress' })
            .eq('id', schedule.id)
        }
      } else {
        const { data: newRun, error: createError } = await supabase
          .from('audit_runs')
          .insert({
            schedule_id: schedule.id,
            auditor_id: authUserId || schedule.auditor_id,
            started_at: new Date().toISOString()
          })
          .select()
          .single()

        if (createError) throw createError
        activeRunData = newRun

        await supabase
          .from('audit_schedules')
          .update({ status: 'in_progress' })
          .eq('id', schedule.id)
      }

      const { data: groups, error: groupErr } = await supabase
        .from('iso_clause_groups')
        .select('id')
        .eq('standard_id', schedule.standard_id)

      if (groupErr) throw groupErr

      let clausesList = []
      if (groups && groups.length > 0) {
        const groupIds = groups.map(g => g.id)
        const { data: clausesData, error: clauseErr } = await supabase
          .from('iso_clauses')
          .select('*')
          .in('group_id', groupIds)
          .eq('is_active', true)
        
        if (clauseErr) throw clauseErr
        clausesList = (clausesData || []).sort((a, b) =>
          a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true })
        )
      }

      let { data: existingResults, error: resultsError } = await supabase
        .from('audit_results')
        .select('*')
        .eq('run_id', activeRunData.id)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true })

      if (resultsError) throw resultsError

      if ((!existingResults || existingResults.length === 0) && schedule.template_id) {
        const { data: tempItems, error: tempItemsError } = await supabase
          .from('audit_checklist_items')
          .select('clause_id, requirement, what_to_look_for')
          .eq('template_id', schedule.template_id)
          .order('id', { ascending: true })

        if (tempItemsError) throw tempItemsError

        if (tempItems && tempItems.length > 0) {
          const insertPayloads = tempItems.map(item => ({
            run_id: activeRunData.id,
            clause_id: item.clause_id,
            requirement: item.requirement,
            what_to_look_for: item.what_to_look_for,
            status: 'na',
            evidence: '',
            notes: ''
          }))
          const { data: insertedResults, error: insertErr } = await supabase
            .from('audit_results')
            .insert(insertPayloads)
            .select('*')
          if (insertErr) throw insertErr
          existingResults = insertedResults || []
        }
      }

      // Fallback: if still no results, use all active ISO clauses from standard
      if ((!existingResults || existingResults.length === 0) && clausesList.length > 0) {
        const insertPayloads = clausesList.map(clause => ({
          run_id: activeRunData.id,
          clause_id: clause.id,
          requirement: clause.description || '',
          what_to_look_for: 'Check standard compliance details',
          status: 'na',
          evidence: '',
          notes: ''
        }))
        const { data: insertedResults, error: insertErr } = await supabase
          .from('audit_results')
          .insert(insertPayloads)
          .select('*')
        if (insertErr) throw insertErr
        existingResults = insertedResults || []
      }

      const itemsList = (existingResults || [])
        .map(res => {
          const clauseDetails = clausesList.find(c => c.id === res.clause_id)
          return {
            id: res.id,
            clause_id: res.clause_id,
            clause_number: clauseDetails?.clause_number || 'N/A',
            title: clauseDetails?.title || 'Custom Requirement',
            requirement: res.requirement || '',
            what_to_look_for: res.what_to_look_for || '',
            result_id: res.id,
            created_at: res.created_at || ''
          }
        })
        .sort((a, b) => {
          const aIsNA = a.clause_number === 'N/A'
          const bIsNA = b.clause_number === 'N/A'
          if (aIsNA !== bIsNA) return aIsNA ? 1 : -1

          const clauseCmp = String(a.clause_number).localeCompare(String(b.clause_number), undefined, { numeric: true })
          if (clauseCmp !== 0) return clauseCmp

          const createdCmp = String(a.created_at).localeCompare(String(b.created_at))
          if (createdCmp !== 0) return createdCmp

          const reqCmp = String(a.requirement).localeCompare(String(b.requirement))
          if (reqCmp !== 0) return reqCmp

          return String(a.id).localeCompare(String(b.id))
        })

      const initialResults = {}
      itemsList.forEach(item => {
        const resObj = existingResults.find(r => r.id === item.result_id)
        const resultKey = item.result_id || item.id
        initialResults[resultKey] = {
          id: resObj?.id || null,
          clause_id: item.clause_id,
          status: resObj?.status || 'na',
          evidence: resObj?.evidence || '',
          notes: resObj?.notes || '',
          attachment_url: resObj?.attachment_url || ''
        }
      })

      setActiveRun({
        id: activeRunData.id,
        schedule_id: schedule.id,
        title: schedule.title,
        standard_name: schedule.standard_name,
        template_name: schedule.template_name || null,
        audit_schedules: schedule
      })
      setActiveClauses(itemsList)
      dirtyKeysRef.current = new Set()
      const dbSnapshot = JSON.stringify(initialResults)
      let restoredUnsavedDraft = false
      try {
        const rawDraft = localStorage.getItem(`audit_draft_${activeRunData.id}`)
        if (rawDraft) {
          const parsed = JSON.parse(rawDraft)
          // Only merge explicitly dirty unsaved rows (new format: { dirty: { [key]: row } })
          // Ignore legacy full-map drafts that could contain stale empty strings and overwrite DB data.
          const dirtyDraftMap = parsed && typeof parsed === 'object' && parsed.dirty && typeof parsed.dirty === 'object'
            ? parsed.dirty
            : null
          if (dirtyDraftMap) {
            Object.entries(dirtyDraftMap).forEach(([key, draftRow]) => {
              if (!initialResults[key] || !draftRow || typeof draftRow !== 'object') return
              const dbRow = initialResults[key]
              const mergedEvidence = (draftRow.evidence && draftRow.evidence.length > 0) ? draftRow.evidence : dbRow.evidence
              const mergedNotes = (draftRow.notes && draftRow.notes.length > 0) ? draftRow.notes : dbRow.notes
              const mergedAttachment = draftRow.attachment_url || dbRow.attachment_url
              const mergedStatus = draftRow.status || dbRow.status
              const hasDiff =
                mergedStatus !== dbRow.status ||
                mergedEvidence !== dbRow.evidence ||
                mergedNotes !== dbRow.notes ||
                mergedAttachment !== dbRow.attachment_url
              if (hasDiff) {
                initialResults[key] = {
                  ...dbRow,
                  status: mergedStatus,
                  evidence: mergedEvidence,
                  notes: mergedNotes,
                  attachment_url: mergedAttachment
                }
                dirtyKeysRef.current.add(key)
                restoredUnsavedDraft = true
              }
            })
          }
          if (!restoredUnsavedDraft) {
            localStorage.removeItem(`audit_draft_${activeRunData.id}`)
          }
        }
      } catch (draftErr) {
        console.warn('[useAuditToolsLogic] Failed to restore local audit draft:', draftErr)
      }
      lastSavedSnapshotRef.current = dbSnapshot
      resultsMapRef.current = initialResults
      setResultsMap(initialResults)
      setSaveStatus(restoredUnsavedDraft ? 'unsaved' : 'saved')

      // Batch-fetch all CARs linked to the clauses in this audit
      if (clausesList.length > 0) {
        const clauseIds = clausesList.map(c => c.id)
        try {
          const { data: linkData } = await supabase
            .from('car_clause_links')
            .select('clause_id, car_reports(*)').in('clause_id', clauseIds)


          const carsMap = {}
          for (const row of linkData || []) {
            if (!row.car_reports) continue
            const car = row.car_reports
            
            // Filter: If the CAR belongs to a DIFFERENT audit schedule, do not show it
            if (car.audit_schedule_id && car.audit_schedule_id !== schedule.id) {
              continue
            }

            // Filter: If the CAR is already closed, it's considered audited/resolved, so hide it
            if (String(car.status || '').toLowerCase() === 'closed') {
              continue
            }
            
            if (!carsMap[row.clause_id]) carsMap[row.clause_id] = []
            carsMap[row.clause_id].push(car)
          }
          setLinkedCarsMap(carsMap)
        } catch (linkErr) {
          console.warn('[useAuditToolsLogic] Could not load linked CARs:', linkErr.message)
          setLinkedCarsMap({})
        }
      }
    } catch (err) {
      console.error('Error starting audit run:', err)
      setError('We could not start the audit run. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Safe functional updater for checklist fields (avoids stale closures during collaboration)
  const updateClauseField = useCallback((resultKey, field, value) => {
    dirtyKeysRef.current.add(resultKey)
    setSaveStatus('unsaved')
    setResultsMap(prev => {
      const current = prev[resultKey] || { status: 'na', evidence: '', notes: '', attachment_url: '' }
      const next = {
        ...prev,
        [resultKey]: {
          ...current,
          [field]: value
        }
      }
      resultsMapRef.current = next
      return next
    })
    broadcastClauseChange(resultKey, field, value)
  }, [broadcastClauseChange])

  // Save Progress / Complete Audit
  const handleSaveResults = async (complete = false, { silent = false } = {}) => {
    if (!activeRunRef.current?.id) return false
    const currentRun = activeRunRef.current
    const currentMap = resultsMapRef.current || resultsMap

    if (!silent) {
      setError('')
      setSuccess('')
    }
    if (complete) {
      const missingClause = (activeClauses || []).find(c => !currentMap[c.result_id || c.id]?.status)
      if (missingClause) {
        setError(`Please record a status for Clause ${missingClause.clause_number || ''} before completing the audit.`)
        return false
      }
    }
    setSavingProgress(true)
    setSaveStatus('saving')
    try {
      const dirtyKeys = Array.from(dirtyKeysRef.current)
      // On manual Save Progress or Complete, upsert dirty rows (or all rows if none are flagged dirty)
      const entriesToSave = (!complete && dirtyKeys.length > 0)
        ? dirtyKeys.filter(k => currentMap[k]).map(k => [k, currentMap[k]])
        : Object.entries(currentMap)

      const upsertData = entriesToSave.map(([resultKey, val]) => {
        const payload = {
          run_id: currentRun.id,
          clause_id: val.clause_id || resultKey,
          status: val.status || 'na',
          evidence: val.evidence || null,
          notes: val.notes || null,
          attachment_url: val.attachment_url || null
        }
        if (val.id) {
          payload.id = val.id
        }
        return payload
      })

      let savedData = []
      if (upsertData.length > 0) {
        const { data, error: upsertError } = await supabase
          .from('audit_results')
          .upsert(upsertData, { onConflict: 'id' })
          .select('id, clause_id, status, evidence, notes, attachment_url')

        if (upsertError) throw upsertError
        if (!data || data.length === 0) {
          throw new Error('No audit rows were saved. Please check your permissions or reload the page.')
        }
        savedData = data
      }

      const savedSnapshotByKey = {}
      entriesToSave.forEach(([k, v]) => {
        savedSnapshotByKey[k] = JSON.stringify(v)
      })

      setResultsMap(prev => {
        const merged = { ...prev }
        savedData.forEach(row => {
          // Only overwrite if user did not type again while request was in-flight
          const latestVal = prev[row.id]
          if (!latestVal || JSON.stringify(latestVal) === savedSnapshotByKey[row.id]) {
            merged[row.id] = {
              id: row.id,
              clause_id: row.clause_id,
              status: row.status,
              evidence: row.evidence || '',
              notes: row.notes || '',
              attachment_url: row.attachment_url || ''
            }
            dirtyKeysRef.current.delete(row.id)
          }
        })
        resultsMapRef.current = merged
        lastSavedSnapshotRef.current = JSON.stringify(merged)
        return merged
      })

      try {
        if (dirtyKeysRef.current.size === 0) {
          localStorage.removeItem(`audit_draft_${currentRun.id}`)
        }
      } catch {
        // Ignore storage errors
      }
      setSaveStatus(dirtyKeysRef.current.size === 0 ? 'saved' : 'unsaved')

      if (complete) {
        // Bind existing open CARs to this schedule so they don't appear in future audits
        const clauseIds = Array.from(
          new Set(Object.values(currentMap).map(v => v.clause_id).filter(Boolean))
        )
        if (clauseIds.length > 0) {
          const { data: linksData, error: linksErr } = await supabase
            .from('car_clause_links')
            .select('car_report_id')
            .in('clause_id', clauseIds)
            
          if (!linksErr && linksData && linksData.length > 0) {
            const carIdsToBind = linksData.map(l => l.car_report_id)
            
            // Only bind CARs that don't already belong to an audit schedule
            await supabase
              .from('car_reports')
              .update({ audit_schedule_id: currentRun.schedule_id })
              .in('id', carIdsToBind)
              .is('audit_schedule_id', null)
          }
        }

        const { error: runErr } = await supabase
          .from('audit_runs')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', currentRun.id)

        if (runErr) throw runErr

        const { error: schedErr } = await supabase
          .from('audit_schedules')
          .update({ status: 'completed' })
          .eq('id', currentRun.schedule_id)

        if (schedErr) throw schedErr

        if (roomChannelRef.current) {
          try {
            roomChannelRef.current.send({
              type: 'broadcast',
              event: 'audit_completed',
              payload: {
                completedById: authUserId,
                completedByName: currentAuditorProfile.name
              }
            })
          } catch (bErr) {
            console.warn('Could not broadcast audit completion:', bErr)
          }
        }

        try {
          localStorage.removeItem(`audit_draft_${currentRun.id}`)
        } catch {
          // Ignore storage errors
        }
        dirtyKeysRef.current.clear()
        lastSavedSnapshotRef.current = ''
        setSuccess('Audit completed and saved successfully!')
        setActiveRun(null)
        setActiveClauses([])
        setResultsMap({})
        await fetchData()
      } else if (!silent) {
        setSuccess('Progress saved successfully!')
      }
      return true
    } catch (err) {
      console.error('Error saving audit results:', err)
      setSaveStatus('error')
      setError('Failed to save audit results. ' + (err.message || 'Please try again.'))
      return false
    } finally {
      setSavingProgress(false)
    }
  }

  useEffect(() => {
    resultsMapRef.current = resultsMap
    activeRunRef.current = activeRun
  }, [resultsMap, activeRun])

  const autoSaveResultsQuietly = useCallback(async (runToSave, mapToSave) => {
    if (!runToSave?.id || !mapToSave || Object.keys(mapToSave).length === 0) return true
    if (dirtyKeysRef.current.size === 0) return true
    if (isAutoSavingRef.current) {
      pendingAutoSaveRef.current = true
      return true
    }

    isAutoSavingRef.current = true
    setSaveStatus('saving')
    try {
      const keysToSave = Array.from(dirtyKeysRef.current).filter(k => mapToSave[k])
      if (keysToSave.length === 0) {
        setSaveStatus('saved')
        return true
      }

      const snapshotByKey = {}
      const upsertData = keysToSave.map((resultKey) => {
        const val = mapToSave[resultKey]
        snapshotByKey[resultKey] = JSON.stringify(val)
        const payload = {
          run_id: runToSave.id,
          clause_id: val.clause_id || resultKey,
          status: val.status || 'na',
          evidence: val.evidence || null,
          notes: val.notes || null,
          attachment_url: val.attachment_url || null
        }
        if (val.id) {
          payload.id = val.id
        }
        return payload
      })

      const { data: savedRows, error: upsertError } = await supabase
        .from('audit_results')
        .upsert(upsertData, { onConflict: 'id' })
        .select('id')

      if (upsertError) {
        console.error('[useAuditToolsLogic] Background auto-save failed:', upsertError)
        setSaveStatus('error')
        return false
      }

      if (!savedRows || savedRows.length === 0) {
        console.warn('[useAuditToolsLogic] Background auto-save updated 0 rows')
        setSaveStatus('error')
        return false
      }

      // Only clear dirty flags for rows that didn't change again while saving
      keysToSave.forEach(k => {
        const latest = resultsMapRef.current?.[k]
        if (latest && JSON.stringify(latest) === snapshotByKey[k]) {
          dirtyKeysRef.current.delete(k)
        }
      })

      if (dirtyKeysRef.current.size === 0) {
        lastSavedSnapshotRef.current = JSON.stringify(resultsMapRef.current || mapToSave)
        try {
          localStorage.removeItem(`audit_draft_${runToSave.id}`)
        } catch {}
        setSaveStatus('saved')
      } else {
        setSaveStatus('unsaved')
      }
      return true
    } catch (err) {
      console.error('[useAuditToolsLogic] Background auto-save exception:', err?.message || err)
      setSaveStatus('error')
      return false
    } finally {
      isAutoSavingRef.current = false
      if (pendingAutoSaveRef.current && activeRunRef.current?.id && dirtyKeysRef.current.size > 0) {
        pendingAutoSaveRef.current = false
        autoSaveResultsQuietly(activeRunRef.current, resultsMapRef.current)
      } else {
        pendingAutoSaveRef.current = false
      }
    }
  }, [])

  // Safe Go Back: flush unsaved changes to Supabase BEFORE leaving the checklist
  const handleGoBack = useCallback(async () => {
    if (activeRunRef.current?.id && dirtyKeysRef.current.size > 0) {
      const ok = await handleSaveResults(false, { silent: true })
      if (!ok) {
        return
      }
    }
    setActiveRun(null)
    fetchData()
  }, [setActiveRun])

  // Layer 1 & 2: Instant dirty-only localStorage backup + 1.5s debounced Supabase auto-save
  useEffect(() => {
    if (!activeRun?.id || Object.keys(resultsMap).length === 0) return
    if (dirtyKeysRef.current.size === 0) return

    try {
      const dirtyObj = {}
      dirtyKeysRef.current.forEach(k => {
        if (resultsMap[k]) dirtyObj[k] = resultsMap[k]
      })
      localStorage.setItem(
        `audit_draft_${activeRun.id}`,
        JSON.stringify({ updatedAt: Date.now(), dirty: dirtyObj })
      )
    } catch {
      // Ignore storage quota errors
    }

    const timer = setTimeout(() => {
      autoSaveResultsQuietly(activeRunRef.current, resultsMapRef.current)
    }, 1500)

    return () => clearTimeout(timer)
  }, [activeRun?.id, resultsMap, autoSaveResultsQuietly])

  // Layer 3: Immediate cloud auto-save on tab switch + warn on accidental close/back with unsaved edits
  useEffect(() => {
    if (!activeRun?.id) return

    const flushOnSwitch = () => {
      if (activeRunRef.current?.id && dirtyKeysRef.current.size > 0) {
        autoSaveResultsQuietly(activeRunRef.current, resultsMapRef.current)
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushOnSwitch()
      }
    }

    const handleBeforeUnload = (e) => {
      if (dirtyKeysRef.current.size > 0) {
        flushOnSwitch()
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('blur', flushOnSwitch)
    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      flushOnSwitch()
      window.removeEventListener('blur', flushOnSwitch)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeRun?.id, autoSaveResultsQuietly])

  // Fetch initial schedules/auditors/standards data concurrently
  const fetchData = async () => {
    setLoading(true)
    setTemplatesLoading(true)
    setError('')
    try {
      const [
        { data: standardsData, error: stdError },
        { data: allUsersData, error: audError },
        templatesData,
        { data: schedulesData, error: schedError },
        { data: activeRunsData, error: runsErr },
        { data: allResultsData }
      ] = await Promise.all([
        supabase
          .from('iso_standards')
          .select('id, name, version')
          .eq('is_active', true),
        supabase
          .from('users')
          .select('id, first_name, last_name, auth_id, role_id, status, roles(role_name, permissions)'),
        checklistService.fetchTemplates().catch(err => {
          console.warn('Failed to fetch templates:', err)
          return []
        }),
        supabase
          .from('audit_schedules')
          .select(`
            id,
            title,
            scheduled_date,
            status,
            standard_id,
            auditor_id,
            template_id
          `)
          .order('scheduled_date', { ascending: true }),
        supabase
          .from('audit_runs')
          .select('id, schedule_id, auditor_id, started_at, completed_at')
          .is('completed_at', null),
        supabase
          .from('audit_results')
          .select('id, run_id, status, evidence, notes')
      ])

      if (stdError) throw stdError
      if (audError) throw audError
      if (schedError) throw schedError

      setStandards(standardsData || [])

      const auditorsData = (allUsersData || []).filter(u => {
        if (String(u.status || 'ACTIVE').toUpperCase() !== 'ACTIVE') return false
        const rName = String(u.roles?.role_name || '').trim().toLowerCase()
        const rPages = Array.isArray(u.roles?.permissions?.pages) ? u.roles.permissions.pages : []
        const rRights = Array.isArray(u.roles?.permissions?.rights) ? u.roles.permissions.rights : []
        return (
          ['team leader', 'qa officer', 'quality assurance', 'auditor', 'admin'].includes(rName) ||
          rPages.includes('audit_tools') ||
          rRights.includes('manage_audit_schedules')
        )
      })

      setAuditors(auditorsData)
      setTemplates(templatesData || [])

      const newProgressMap = {}
      const mappedSchedules = (schedulesData || []).map(schedule => {
        const std = (standardsData || []).find(s => s.id === schedule.standard_id)
        const aud = (allUsersData || []).find(a => a.auth_id === schedule.auditor_id) || (auditorsData || []).find(a => a.auth_id === schedule.auditor_id)
        const temp = (templatesData || []).find(t => String(t.id) === String(schedule.template_id))
        const activeRunItem = (activeRunsData || []).find(r => r.schedule_id === schedule.id)

        let scheduleStatus = schedule.status
        if (scheduleStatus !== 'completed' && activeRunItem) {
          scheduleStatus = 'in_progress'
        }

        if (activeRunItem && allResultsData) {
          const runResults = allResultsData.filter(r => r.run_id === activeRunItem.id)
          const total = runResults.length
          const evaluated = runResults.filter(r => (r.evidence && r.evidence.trim().length > 0) || (r.notes && r.notes.trim().length > 0) || r.status !== 'na').length
          const percent = total > 0 ? Math.round((evaluated / total) * 100) : 0
          newProgressMap[schedule.id] = { evaluated, total, percent }
        }

        return {
          ...schedule,
          status: scheduleStatus,
          active_run_id: activeRunItem?.id || null,
          standard_name: std ? `${std.name} (${std.version})` : 'Unknown Standard',
          auditor_name: aud ? `${aud.first_name} ${aud.last_name}` : 'Unknown Auditor',
          template_name: temp ? temp.title : null
        }
      })

      setProgressBySchedule(newProgressMap)
      setSchedules(mappedSchedules)

      // Auto-restore active run if browser refreshed or HMR reloaded
      try {
        const savedSchedId = sessionStorage.getItem('audit_active_schedule_id')
        if (savedSchedId && !activeRunRef.current) {
          const targetSched = mappedSchedules.find(s => s.id === savedSchedId)
          if (targetSched && targetSched.status !== 'completed') {
            handleStartAudit(targetSched)
          } else {
            sessionStorage.removeItem('audit_active_schedule_id')
          }
        }
      } catch (resumeErr) {
        console.warn('Could not auto-resume active audit run:', resumeErr)
      }
    } catch (err) {
      console.error('Error fetching audit data:', err)
      setError('Failed to load audit tools data. Please try again.')
    } finally {
      setTemplatesLoading(false)
      setLoading(false)
    }
  }

  const fetchAuditLogs = async (pageVal = logsPage) => {
    setLogsLoading(true)
    setLogsError('')
    try {
      const offset = pageVal * logsLimit
      const res = await fetchLogs({ limit: logsLimit, offset, filters: { level: 'audit' } })
      setLogs(res.data || [])
      setLogsTotal(res.count || 0)
    } catch (err) {
      console.error('Error fetching audit logs:', err)
      setLogsError('Failed to load audit logs.')
    } finally {
      setLogsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 1. Global Schedules Presence & Realtime Hub: Every auditor sees schedules update live
  useEffect(() => {
    const hubChannel = supabase.channel('audit-schedules-hub')

    const updatePresenceState = () => {
      const state = hubChannel.presenceState()
      const map = {}
      Object.values(state).forEach(presences => {
        presences.forEach(p => {
          if (p.schedule_id) {
            if (!map[p.schedule_id]) map[p.schedule_id] = []
            if (!map[p.schedule_id].some(u => u.id === p.user_id)) {
              map[p.schedule_id].push({
                id: p.user_id,
                name: p.user_name || 'Auditor',
                color: p.user_color || getCollaboratorColor(p.user_id)
              })
            }
          }
        })
      })
      setActiveAuditorsBySchedule(map)
    }

    hubChannel
      .on('presence', { event: 'sync' }, updatePresenceState)
      .on('presence', { event: 'join' }, updatePresenceState)
      .on('presence', { event: 'leave' }, updatePresenceState)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_schedules' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_runs' }, () => {
        fetchData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_results' }, () => {
        fetchData()
      })

    globalHubChannelRef.current = hubChannel

    hubChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await hubChannel.track({
          user_id: authUserId,
          user_name: currentAuditorProfile.name,
          user_color: currentAuditorProfile.color,
          schedule_id: activeRun?.schedule_id || null,
          run_id: activeRun?.id || null,
          timestamp: Date.now()
        })
      }
    })

    return () => {
      supabase.removeChannel(hubChannel)
      globalHubChannelRef.current = null
    }
  }, [authUserId, currentAuditorProfile.name, currentAuditorProfile.color])

  // Sync current presence when entering / leaving activeRun
  useEffect(() => {
    if (globalHubChannelRef.current) {
      globalHubChannelRef.current.track({
        user_id: authUserId,
        user_name: currentAuditorProfile.name,
        user_color: currentAuditorProfile.color,
        schedule_id: activeRun?.schedule_id || null,
        run_id: activeRun?.id || null,
        timestamp: Date.now()
      }).catch(err => console.warn('Hub presence track error:', err))
    }
  }, [activeRun?.id, activeRun?.schedule_id, authUserId, currentAuditorProfile.name, currentAuditorProfile.color])

  // 2. Real-Time Collaborative Workspace Channel (Google Docs style)
  useEffect(() => {
    if (!activeRun?.id) {
      setCollaborators([])
      setActiveEditing({})
      setRemoteFlashMap({})
      return
    }

    const roomChannel = supabase.channel(`audit-room-${activeRun.id}`, {
      config: {
        presence: { key: authUserId || 'anon-' + Math.random().toString(36).substring(2) }
      }
    })
    roomChannelRef.current = roomChannel

    roomChannel
      .on('presence', { event: 'sync' }, () => {
        const state = roomChannel.presenceState()
        const activeList = []
        const seen = new Set()
        Object.values(state).forEach(presences => {
          presences.forEach(p => {
            if (p.user_id && !seen.has(p.user_id)) {
              seen.add(p.user_id)
              activeList.push({
                id: p.user_id,
                name: p.name || 'Auditor',
                role: p.role || 'Auditor',
                color: p.color || getCollaboratorColor(p.user_id),
                isSelf: p.user_id === authUserId
              })
            }
          })
        })
        setCollaborators(activeList)
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        newPresences.forEach(p => {
          if (p.user_id !== authUserId) {
            triggerRecentActivity(`${p.name || 'An auditor'} joined the session`)
          }
        })
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        leftPresences.forEach(p => {
          if (p.user_id !== authUserId) {
            triggerRecentActivity(`${p.name || 'An auditor'} left the session`)
          }
        })
      })
      .on('broadcast', { event: 'clause_change' }, ({ payload }) => {
        if (!payload || payload.userId === authUserId) return

        setResultsMap(prev => {
          const current = prev[payload.resultKey] || {}
          return {
            ...prev,
            [payload.resultKey]: {
              ...current,
              [payload.field]: payload.value
            }
          }
        })

        setRemoteFlashMap(prev => ({
          ...prev,
          [payload.resultKey]: {
            ...(prev[payload.resultKey] || {}),
            [payload.field]: true
          }
        }))
        setTimeout(() => {
          setRemoteFlashMap(prev => ({
            ...prev,
            [payload.resultKey]: {
              ...(prev[payload.resultKey] || {}),
              [payload.field]: false
            }
          }))
        }, 2000)

        const fieldName = payload.field === 'notes' ? 'findings' : payload.field
        triggerRecentActivity(`${payload.userName || 'Co-auditor'} updated ${fieldName}`)
        setSaveStatus('synced')
      })
      .on('broadcast', { event: 'field_focus' }, ({ payload }) => {
        if (!payload || payload.user?.id === authUserId) return
        setActiveEditing(prev => ({
          ...prev,
          [payload.resultKey]: {
            ...(prev[payload.resultKey] || {}),
            [payload.field]: payload.user
          }
        }))
      })
      .on('broadcast', { event: 'field_blur' }, ({ payload }) => {
        if (!payload || payload.userId === authUserId) return
        setActiveEditing(prev => {
          const copy = { ...(prev[payload.resultKey] || {}) }
          delete copy[payload.field]
          return {
            ...prev,
            [payload.resultKey]: copy
          }
        })
      })
      .on('broadcast', { event: 'audit_completed' }, ({ payload }) => {
        if (payload?.completedById === authUserId) return
        setToast({
          message: `This audit was just completed and saved by ${payload?.completedByName || 'a co-auditor'}.`,
          type: 'info'
        })
        setActiveRun(null)
        setActiveClauses([])
        setResultsMap({})
        fetchData()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'audit_results',
        filter: `run_id=eq.${activeRun.id}`
      }, (payload) => {
        if (payload.new) {
          const row = payload.new
          // Do not overwrite a row that has unsaved local typing on this client
          if (dirtyKeysRef.current.has(row.id)) return
          setResultsMap(prev => {
            const existing = prev[row.id] || {}
            const next = {
              ...prev,
              [row.id]: {
                id: row.id,
                clause_id: row.clause_id,
                status: row.status || existing.status || 'na',
                evidence: row.evidence ?? existing.evidence ?? '',
                notes: row.notes ?? existing.notes ?? '',
                attachment_url: row.attachment_url ?? existing.attachment_url ?? ''
              }
            }
            resultsMapRef.current = next
            return next
          })
          setSaveStatus('synced')
        }
      })

    roomChannel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await roomChannel.track({
          user_id: authUserId,
          name: currentAuditorProfile.name,
          role: currentAuditorProfile.role,
          color: currentAuditorProfile.color,
          joined_at: new Date().toISOString()
        })
      }
    })

    return () => {
      supabase.removeChannel(roomChannel)
      roomChannelRef.current = null
    }
  }, [activeRun?.id, authUserId, currentAuditorProfile.name, currentAuditorProfile.role, currentAuditorProfile.color, triggerRecentActivity])

  // Real-time channel listener for car_clause_links table updates
  useEffect(() => {
    if (!activeRun || activeClauses.length === 0) return

    const clauseIds = activeClauses.map(c => c.id)

    const channel = supabase
      .channel('realtime-car-links')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'car_clause_links' },
        async (payload) => {
          console.log('[useAuditToolsLogic] Realtime change on car_clause_links:', payload)
          try {
            const { data: linkData } = await supabase
              .from('car_clause_links')
              .select('clause_id, car_reports(*)').in('clause_id', clauseIds)

            const carsMap = {}
            for (const row of linkData || []) {
              if (!row.car_reports) continue
              const car = row.car_reports
              
              if (car.audit_schedule_id && car.audit_schedule_id !== activeRun.schedule_id) {
                continue
              }
              
              if (!carsMap[row.clause_id]) carsMap[row.clause_id] = []
              carsMap[row.clause_id].push(car)
            }
            setLinkedCarsMap(carsMap)
          } catch (linkErr) {
            console.warn('[useAuditToolsLogic] Could not reload linked CARs:', linkErr.message)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeRun?.id, activeClauses])

  const fetchAuditReports = async () => {
    setLoadingReports(true)
    setReportsError('')
    try {
      const [
        { data: runs, error: runsErr },
        { data: standardsData, error: stdError },
        { data: auditorsData, error: audError }
      ] = await Promise.all([
        supabase
          .from('audit_runs')
          .select('*')
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false }),
        supabase
          .from('iso_standards')
          .select('id, name, version'),
        supabase
          .from('users')
          .select('id, first_name, last_name, auth_id, status')
      ])

      if (runsErr) throw runsErr
      if (stdError) throw stdError
      if (audError) throw audError

      if (!runs || runs.length === 0) {
        setCompletedRuns([])
        return
      }

      const scheduleIds = runs.map(r => r.schedule_id).filter(Boolean)
      const runIds = runs.map(r => r.id)

      const [
        { data: schedulesData, error: schedError },
        { data: resultsData, error: resultsErr }
      ] = await Promise.all([
        supabase
          .from('audit_schedules')
          .select('id, title, standard_id, scheduled_date')
          .in('id', scheduleIds),
        supabase
          .from('audit_results')
          .select('run_id, status')
          .in('run_id', runIds)
      ])

      if (schedError) throw schedError
      if (resultsErr) throw resultsErr

      const mapped = runs.map(run => {
        const sched = (schedulesData || []).find(s => s.id === run.schedule_id)
        const std = sched ? (standardsData || []).find(s => s.id === sched.standard_id) : null
        const aud = (auditorsData || []).find(a => a.auth_id === run.auditor_id)
        
        const runRes = (resultsData || []).filter(r => r.run_id === run.id)
        const totalClauses = runRes.length
        const compliantClauses = runRes.filter(r => r.status === 'compliant').length
        const ofiClauses = runRes.filter(r => r.status === 'ofi').length
        const minorNcClauses = runRes.filter(r => r.status === 'minor_nc').length
        const majorNcClauses = runRes.filter(r => r.status === 'major_nc').length
        const naClauses = runRes.filter(r => r.status === 'na').length

        const applicableCount = totalClauses - naClauses
        const isFailed = majorNcClauses > 0
        const statusText = isFailed ? 'Failed / Critical' : 'Completed'

        return {
          id: run.id,
          schedule_id: run.schedule_id,
          title: sched?.title || 'Unnamed Audit',
          standard_name: std ? `${std.name} (${std.version})` : 'Unknown Standard',
          auditor_name: aud ? `${aud.first_name} ${aud.last_name}` : 'Unknown Auditor',
          started_at: run.started_at,
          completed_at: run.completed_at,
          statusText,
          totalClauses,
          compliantClauses,
          ofiClauses,
          minorNcClauses,
          majorNcClauses,
          naClauses
        }
      })

      setCompletedRuns(mapped)
    } catch (err) {
      console.error('Error fetching audit reports:', err)
      setReportsError('Failed to load audit reports data.')
    } finally {
      setLoadingReports(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'Logs') {
      fetchAuditLogs(logsPage)
    }
    if (activeTab === 'Reports') {
      fetchAuditReports()
    }
  }, [activeTab])

  // Handle schedule creation
  const handleScheduleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!title.trim()) {
      setError('Audit title is required.')
      return
    }
    if (!standardId) {
      setError('Please select an ISO Standard.')
      return
    }
    if (!scheduledDate) {
      setError('Please select a scheduled date.')
      return
    }
    if (!auditorId) {
      setError('Please assign an auditor.')
      return
    }

    setSaving(true)
    try {
      const { data: userProfile } = await supabase
        .from('users')
        .select('site_id')
        .eq('auth_id', authUserId)
        .maybeSingle()

      const { data, error: insertError } = await supabase
        .from('audit_schedules')
        .insert({
          title: title.trim(),
          standard_id: standardId,
          template_id: templateId || null,
          scheduled_date: scheduledDate,
          auditor_id: auditorId,
          status: 'pending',
          site_id: userProfile?.site_id || null
        })
        .select()

      if (insertError) throw insertError

      const selectedAuditorObj = auditors.find(a => a.auth_id === auditorId)
      const auditorSerialId = selectedAuditorObj ? selectedAuditorObj.id : null

      if (auditorSerialId) {
        const titleText = `Audit Scheduled: ${title.trim()}`
        const messageText = `You have been assigned to conduct the "${title.trim()}" audit scheduled on ${scheduledDate}.`

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: auditorSerialId,
            title: titleText,
            message: messageText,
            type: 'info',
            is_read: false
          })
        
        if (notifError) {
          console.warn('Failed to insert notification for auditor:', notifError.message)
        } else {
          // Trigger email via backend
          request('/notifications/send-email', {
            method: 'POST',
            body: JSON.stringify({
              userId: auditorSerialId,
              title: titleText,
              message: messageText
            })
          }).catch(err => console.warn('Failed to trigger email notification:', err))
        }
      }

      setSuccess('Audit schedule created successfully!')
      
      setTitle('')
      setStandardId('')
      setTemplateId('')
      setScheduledDate('')
      setAuditorId('')

      await fetchData()
    } catch (err) {
      console.error('Error saving schedule:', err)
      setError(err.message || 'Failed to create audit schedule.')
    } finally {
      setSaving(false)
    }
  }

  const [scheduleToDelete, setScheduleToDelete] = useState(null)

  const handleDeleteSchedule = (scheduleId) => {
    setScheduleToDelete(scheduleId)
  }

  const confirmDeleteSchedule = async () => {
    if (!scheduleToDelete) return
    
    const scheduleId = scheduleToDelete
    setLoading(true)
    try {
      const { error: deleteErr } = await supabase
        .from('audit_schedules')
        .delete()
        .eq('id', scheduleId)

      if (deleteErr) throw deleteErr
      
      setScheduleToDelete(null)
      setSchedules(prev => prev.filter(s => s.id !== scheduleId))
      setSuccess('Audit schedule deleted successfully!')
      fetchData()
    } catch (err) {
      console.error(err)
      setError('This schedule could not be deleted. Please try again.')
      fetchData()
    } finally {
      setLoading(false)
    }
  }

  const cancelDeleteSchedule = () => setScheduleToDelete(null)

  const confirmDeleteScheduleDialogProps = {
    isOpen: !!scheduleToDelete,
    title: 'Delete Audit Schedule',
    message: 'Are you sure you want to delete this schedule?',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    onConfirm: confirmDeleteSchedule,
    onCancel: cancelDeleteSchedule,
  }

  const fetchClausesForStandard = async (stdId) => {
    if (!stdId) return []
    try {
      const { data: groups, error: groupErr } = await supabase
        .from('iso_clause_groups')
        .select('id')
        .eq('standard_id', stdId)

      if (groupErr) throw groupErr

      if (groups && groups.length > 0) {
        const groupIds = groups.map(g => g.id)
        const { data: clausesData, error: clauseErr } = await supabase
          .from('iso_clauses')
          .select('id, clause_number, title, description')
          .in('group_id', groupIds)
          .eq('is_active', true)
        
        if (clauseErr) throw clauseErr
        return (clausesData || []).sort((a, b) =>
          a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true })
        )
      }
      return []
    } catch (err) {
      console.error('Error fetching clauses for standard:', err)
      setError('We could not fetch the standard clauses.')
      return []
    }
  }

  const handleCreateTemplate = async (payload) => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const result = await checklistService.createTemplate(payload)
      setSuccess('Checklist template created successfully!')
      await fetchData()
      return result
    } catch (err) {
      console.error('Error creating template:', err)
      setError('The checklist template could not be created. Please try again.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateTemplate = async (id, payload) => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const result = await checklistService.updateTemplate(id, payload)
      setSuccess('Checklist template updated successfully!')
      await fetchData()
      return result
    } catch (err) {
      console.error('Error updating template:', err)
      setError('The checklist template could not be updated. Please try again.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteTemplate = async (id) => {
    setError('')
    setSuccess('')
    setSaving(true)
    try {
      const result = await checklistService.deleteTemplate(id)
      setSuccess('Checklist template deleted successfully!')
      await fetchData()
      return result
    } catch (err) {
      console.error('Error deleting template:', err)
      setError('The checklist template could not be deleted. Please try again.')
      throw err
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveCarLink = async (carId, clauseId) => {
    try {
      setError('')
      const { error: deleteError } = await supabase
        .from('car_clause_links')
        .delete()
        .eq('car_report_id', carId)
        .eq('clause_id', clauseId)

      if (deleteError) throw deleteError

      setLinkedCarsMap(prev => {
        const list = prev[clauseId] || []
        return {
          ...prev,
          [clauseId]: list.filter(car => car.id !== carId)
        }
      })
    } catch (err) {
      console.error('Failed to remove CAR link:', err)
      setError('We could not remove the CAR link. Please try again.')
    }
  }

  return {
    activeTab,
    setActiveTab,
    schedules,
    standards,
    auditors,
    loading,
    saving,
    error,
    setError,
    success,
    setSuccess,
    toast,
    setToast,
    title,
    setTitle,
    standardId,
    setStandardId,
    scheduledDate,
    setScheduledDate,
    auditorId,
    setAuditorId,
    templateId,
    setTemplateId,
    templates,
    templatesLoading,
    activeRun,
    setActiveRun,
    activeClauses,
    resultsMap,
    setResultsMap,
    savingProgress,
    linkedCarsMap,
    logs,
    logsLoading,
    logsError,
    logsPage,
    setLogsPage,
    logsTotal,
    logsLimit,
    completedRuns,
    loadingReports,
    reportsError,
    ...auditRunDetails,
    handleStartAudit,
    handleSaveResults,
    handleGoBack,
    updateClauseField,
    fetchData,
    fetchAuditLogs,
    fetchAuditReports,
    handleScheduleSubmit,
    handleDeleteSchedule,
    confirmDeleteScheduleDialogProps,
    handleRemoveCarLink,
    fetchClausesForStandard,
    handleCreateTemplate,
    handleUpdateTemplate,
    handleDeleteTemplate,
    loading,
    saving,
    // Real-Time Google Docs Collaboration Features
    collaborators,
    activeEditing,
    remoteFlashMap,
    saveStatus,
    recentActivity,
    activeAuditorsBySchedule,
    progressBySchedule,
    broadcastClauseChange,
    broadcastFieldFocus,
    broadcastFieldBlur,
    currentAuditorProfile,
    selectedCar: carDetails.selectedCar,
    isCarDetailsModalOpen: carDetails.isCarDetailsModalOpen,
    openCarDetails: carDetails.openCarDetails,
    closeCarDetails: carDetails.closeCarDetails,
    onSelectCar: carDetails.openCarDetails
  }
}



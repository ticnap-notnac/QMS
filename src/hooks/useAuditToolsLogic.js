import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { fetchLogs } from '../services/logService'

export default function useAuditToolsLogic({ authUserId, activeTabParam = 'Logs' }) {
  const [activeTab, setActiveTab] = useState(activeTabParam)
  
  // Data lists
  const [schedules, setSchedules] = useState([])
  const [standards, setStandards] = useState([])
  const [auditors, setAuditors] = useState([])
  
  // Loading & Action states
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form fields
  const [title, setTitle] = useState('')
  const [standardId, setStandardId] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [auditorId, setAuditorId] = useState('')

  // Checklist / Audit Run states
  const [activeRun, setActiveRun] = useState(null)
  const [activeClauses, setActiveClauses] = useState([])
  const [resultsMap, setResultsMap] = useState({})
  const [savingProgress, setSavingProgress] = useState(false)
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
  const [selectedRunDetails, setSelectedRunDetails] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [runClauses, setRunClauses] = useState([])
  const [runResults, setRunResults] = useState([])
  const [loadingRunDetails, setLoadingRunDetails] = useState(false)

  // CAR details modal states
  const [selectedCar, setSelectedCar] = useState(null)
  const [isCarDetailsModalOpen, setIsCarDetailsModalOpen] = useState(false)

  const handleOpenCarDetails = (car) => {
    setSelectedCar(car)
    setIsCarDetailsModalOpen(true)
  }

  const handleCloseCarDetails = () => {
    setSelectedCar(null)
    setIsCarDetailsModalOpen(false)
  }

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

      const { data: existingResults, error: resultsError } = await supabase
        .from('audit_results')
        .select('*')
        .eq('run_id', activeRunData.id)

      if (resultsError) throw resultsError

      const initialResults = {}
      clausesList.forEach(clause => {
        const existing = (existingResults || []).find(r => r.clause_id === clause.id)
        initialResults[clause.id] = {
          id: existing?.id || null,
          status: existing?.status || 'compliant',
          evidence: existing?.evidence || ''
        }
      })

      setActiveRun({
        id: activeRunData.id,
        schedule_id: schedule.id,
        title: schedule.title,
        standard_name: schedule.standard_name
      })
      setActiveClauses(clausesList)
      setResultsMap(initialResults)

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
            if (!carsMap[row.clause_id]) carsMap[row.clause_id] = []
            carsMap[row.clause_id].push(row.car_reports)
          }
          setLinkedCarsMap(carsMap)
        } catch (linkErr) {
          console.warn('[useAuditToolsLogic] Could not load linked CARs:', linkErr.message)
          setLinkedCarsMap({})
        }
      }
    } catch (err) {
      console.error('Error starting audit run:', err)
      setError('Failed to start audit run. ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Save Progress / Complete Audit
  const handleSaveResults = async (complete = false) => {
    setError('')
    setSuccess('')
    setSavingProgress(true)
    try {
      const upsertData = Object.keys(resultsMap).map(clauseId => {
        const payload = {
          run_id: activeRun.id,
          clause_id: clauseId,
          status: resultsMap[clauseId].status,
          evidence: resultsMap[clauseId].evidence || null
        }
        if (resultsMap[clauseId].id) {
          payload.id = resultsMap[clauseId].id
        }
        return payload
      })

      const { data: savedData, error: upsertError } = await supabase
        .from('audit_results')
        .upsert(upsertData)
        .select('id, clause_id, status, evidence')

      if (upsertError) throw upsertError

      const updatedResultsMap = { ...resultsMap }
      savedData.forEach(row => {
        updatedResultsMap[row.clause_id] = {
          id: row.id,
          status: row.status,
          evidence: row.evidence || ''
        }
      })
      setResultsMap(updatedResultsMap)

      if (complete) {
        const { error: runErr } = await supabase
          .from('audit_runs')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', activeRun.id)

        if (runErr) throw runErr

        const { error: schedErr } = await supabase
          .from('audit_schedules')
          .update({ status: 'completed' })
          .eq('id', activeRun.schedule_id)

        if (schedErr) throw schedErr

        setSuccess('Audit completed and saved successfully!')
        setActiveRun(null)
        setActiveClauses([])
        setResultsMap({})
        await fetchData()
      } else {
        setSuccess('Progress saved successfully!')
      }
    } catch (err) {
      console.error('Error saving audit results:', err)
      setError('Failed to save audit results. ' + err.message)
    } finally {
      setSavingProgress(false)
    }
  }

  // Fetch initial schedules/auditors/standards data
  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: standardsData, error: stdError } = await supabase
        .from('iso_standards')
        .select('id, name, version')
        .eq('is_active', true)
      
      if (stdError) throw stdError
      setStandards(standardsData || [])

      const { data: auditorsData, error: audError } = await supabase
        .from('users')
        .select('id, first_name, last_name, auth_id, role_id')
        .in('role_id', [1, 2])
      
      if (audError) throw audError
      setAuditors(auditorsData || [])

      const { data: schedulesData, error: schedError } = await supabase
        .from('audit_schedules')
        .select(`
          id,
          title,
          scheduled_date,
          status,
          standard_id,
          auditor_id
        `)
        .order('scheduled_date', { ascending: true })

      if (schedError) throw schedError

      const mappedSchedules = (schedulesData || []).map(schedule => {
        const std = (standardsData || []).find(s => s.id === schedule.standard_id)
        const aud = (auditorsData || []).find(a => a.auth_id === schedule.auditor_id)
        return {
          ...schedule,
          standard_name: std ? `${std.name} (${std.version})` : 'Unknown Standard',
          auditor_name: aud ? `${aud.first_name} ${aud.last_name}` : 'Unknown Auditor'
        }
      })

      setSchedules(mappedSchedules)
    } catch (err) {
      console.error('Error fetching audit data:', err)
      setError('Failed to load audit tools data. Please try again.')
    } finally {
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

  useEffect(() => {
    if (activeTab === 'Logs') {
      fetchAuditLogs(0)
      setLogsPage(0)
    }
  }, [activeTab])

  const fetchAuditReports = async () => {
    setLoadingReports(true)
    setReportsError('')
    try {
      const { data: runs, error: runsErr } = await supabase
        .from('audit_runs')
        .select('*')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })

      if (runsErr) throw runsErr

      if (!runs || runs.length === 0) {
        setCompletedRuns([])
        return
      }

      const scheduleIds = runs.map(r => r.schedule_id).filter(Boolean)
      const { data: schedulesData, error: schedError } = await supabase
        .from('audit_schedules')
        .select('id, title, standard_id, scheduled_date')
        .in('id', scheduleIds)

      if (schedError) throw schedError

      const { data: standardsData, error: stdError } = await supabase
        .from('iso_standards')
        .select('id, name, version')

      if (stdError) throw stdError

      const { data: auditorsData, error: audError } = await supabase
        .from('users')
        .select('id, first_name, last_name, auth_id')

      if (audError) throw audError

      const runIds = runs.map(r => r.id)
      const { data: resultsData, error: resultsErr } = await supabase
        .from('audit_results')
        .select('run_id, status')
        .in('run_id', runIds)

      if (resultsErr) throw resultsErr

      const mapped = runs.map(run => {
        const sched = (schedulesData || []).find(s => s.id === run.schedule_id)
        const std = sched ? (standardsData || []).find(s => s.id === sched.standard_id) : null
        const aud = (auditorsData || []).find(a => a.auth_id === run.auditor_id)
        
        const runRes = (resultsData || []).filter(r => r.run_id === run.id)
        const totalClauses = runRes.length
        const compliantClauses = runRes.filter(r => r.status === 'compliant').length
        const partialClauses = runRes.filter(r => r.status === 'partial').length
        const nonCompliantClauses = runRes.filter(r => r.status === 'non_compliant').length
        const naClauses = runRes.filter(r => r.status === 'na').length

        const applicableCount = totalClauses - naClauses
        const score = applicableCount > 0 
          ? Math.round((compliantClauses / applicableCount) * 100) 
          : 100

        return {
          id: run.id,
          title: sched?.title || 'Unnamed Audit',
          standard_name: std ? `${std.name} (${std.version})` : 'Unknown Standard',
          auditor_name: aud ? `${aud.first_name} ${aud.last_name}` : 'Unknown Auditor',
          started_at: run.started_at,
          completed_at: run.completed_at,
          score,
          totalClauses,
          compliantClauses,
          partialClauses,
          nonCompliantClauses,
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

  const fetchRunDetails = async (run) => {
    setSelectedRunDetails(run)
    setLoadingRunDetails(true)
    setIsDetailsModalOpen(true)
    try {
      const { data: resultsData, error: resultsErr } = await supabase
        .from('audit_results')
        .select('*')
        .eq('run_id', run.id)

      if (resultsErr) throw resultsErr
      setRunResults(resultsData || [])

      const { data: scheduleData, error: schedError } = await supabase
        .from('audit_schedules')
        .select('standard_id')
        .eq('id', run.schedule_id)
        .single()

      if (schedError) throw schedError

      const { data: groups, error: groupErr } = await supabase
        .from('iso_clause_groups')
        .select('id')
        .eq('standard_id', scheduleData.standard_id)

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
      setRunClauses(clausesList)
    } catch (err) {
      console.error('Error loading run details:', err)
    } finally {
      setLoadingRunDetails(false)
    }
  }

  const handlePrintReport = (run) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600')
    printWindow.document.write(`
      <html>
        <head>
          <title>Audit Report - ${run.title}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            h1 { font-size: 24px; border-bottom: 2px solid #22d3ee; padding-bottom: 10px; margin-bottom: 5px; color: #0f172a; }
            .meta-section { margin-bottom: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; background: #f8fafc; padding: 15px; border-radius: 6px; }
            .meta-item { font-size: 14px; }
            .meta-item strong { color: #475569; }
            .score-badge { font-size: 24px; font-weight: bold; color: #0d9488; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 14px; }
            th { background-color: #f1f5f9; color: #475569; }
            .status { font-weight: bold; text-transform: uppercase; font-size: 12px; padding: 3px 8px; border-radius: 4px; display: inline-block; }
            .status-compliant { background: #dcfce7; color: #15803d; }
            .status-partial { background: #fef9c3; color: #a16207; }
            .status-non-compliant { background: #fee2e2; color: #b91c1c; }
            .status-na { background: #f1f5f9; color: #475569; }
          </style>
        </head>
        <body>
          <h1>AUDIT REPORT: ${run.title.toUpperCase()}</h1>
          <div class="meta-section">
            <div class="meta-item"><strong>ISO Standard:</strong> ${run.standard_name}</div>
            <div class="meta-item"><strong>Assigned Auditor:</strong> ${run.auditor_name}</div>
            <div class="meta-item"><strong>Completion Date:</strong> ${new Date(run.completed_at).toLocaleDateString()}</div>
            <div class="meta-item"><strong>Compliance Score:</strong> <span class="score-badge">${run.score}%</span></div>
          </div>
          <h3>Checklist Results</h3>
          <p>Loading results...</p>
        </body>
      </html>
    `)
    printWindow.document.close()
    
    supabase
      .from('audit_results')
      .select('clause_id, status, evidence')
      .eq('run_id', run.id)
      .then(({ data: results }) => {
        supabase
          .from('audit_schedules')
          .select('standard_id')
          .eq('id', run.schedule_id)
          .single()
          .then(({ data: sched }) => {
            supabase
              .from('iso_clause_groups')
              .select('id')
              .eq('standard_id', sched.standard_id)
              .then(({ data: groups }) => {
                const groupIds = (groups || []).map(g => g.id)
                supabase
                  .from('iso_clauses')
                  .select('id, clause_number, title')
                  .in('group_id', groupIds)
                  .eq('is_active', true)
                  .then(({ data: clauses }) => {
                    const sorted = (clauses || []).sort((a, b) =>
                      a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true })
                    )
                    
                    let tableRows = ''
                    sorted.forEach(c => {
                      const res = (results || []).find(r => r.clause_id === c.id)
                      const status = res?.status || 'na'
                      const evidence = res?.evidence || 'No notes added.'
                      const statusLabel = {
                        compliant: 'Compliant',
                        partial: 'Partial',
                        non_compliant: 'Non-Compliant',
                        na: 'N/A'
                      }[status]
                      
                      tableRows += `
                        <tr>
                          <td><strong>Clause ${c.clause_number}</strong></td>
                          <td>${c.title}</td>
                          <td><span class="status status-${status.replace('_', '-')}">${statusLabel}</span></td>
                          <td>${evidence}</td>
                        </tr>
                      `
                    })

                    printWindow.document.body.innerHTML = `
                      <h1>AUDIT REPORT: ${run.title.toUpperCase()}</h1>
                      <div class="meta-section">
                        <div class="meta-item"><strong>ISO Standard:</strong> ${run.standard_name}</div>
                        <div class="meta-item"><strong>Assigned Auditor:</strong> ${run.auditor_name}</div>
                        <div class="meta-item"><strong>Completion Date:</strong> ${new Date(run.completed_at).toLocaleString()}</div>
                        <div class="meta-item"><strong>Compliance Score:</strong> <span class="score-badge">${run.score}%</span></div>
                      </div>
                      <h3>Audit Findings Breakdown</h3>
                      <div class="meta-section" style="grid-template-columns: repeat(4, 1fr); text-align: center;">
                        <div><strong>Compliant</strong><br/>${run.compliantClauses}</div>
                        <div><strong>Partial</strong><br/>${run.partialClauses}</div>
                        <div><strong>Non-Compliant</strong><br/>${run.nonCompliantClauses}</div>
                        <div><strong>N/A</strong><br/>${run.naClauses}</div>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th style="width: 15%;">Clause</th>
                            <th style="width: 35%;">Title</th>
                            <th style="width: 15%;">Evaluation</th>
                            <th style="width: 35%;">Evidence / Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${tableRows}
                        </tbody>
                      </table>
                    `
                    printWindow.print()
                  })
              })
          })
      })
  }

  useEffect(() => {
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
      const { data, error: insertError } = await supabase
        .from('audit_schedules')
        .insert({
          title: title.trim(),
          standard_id: standardId,
          scheduled_date: scheduledDate,
          auditor_id: auditorId,
          status: 'pending'
        })
        .select()

      if (insertError) throw insertError

      const selectedAuditorObj = auditors.find(a => a.auth_id === auditorId)
      const auditorSerialId = selectedAuditorObj ? selectedAuditorObj.id : null

      if (auditorSerialId) {
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: auditorSerialId,
            title: `Audit Scheduled: ${title.trim()}`,
            message: `You have been assigned to conduct the "${title.trim()}" audit scheduled on ${scheduledDate}.`,
            type: 'info',
            is_read: false
          })
        
        if (notifError) {
          console.warn('Failed to insert notification for auditor:', notifError.message)
        }
      }

      setSuccess('Audit schedule created successfully!')
      
      setTitle('')
      setStandardId('')
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
      setError('Failed to remove CAR link: ' + err.message)
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
    title,
    setTitle,
    standardId,
    setStandardId,
    scheduledDate,
    setScheduledDate,
    auditorId,
    setAuditorId,
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
    selectedRunDetails,
    setSelectedRunDetails,
    isDetailsModalOpen,
    setIsDetailsModalOpen,
    runClauses,
    runResults,
    loadingRunDetails,
    handleStartAudit,
    handleSaveResults,
    fetchData,
    fetchAuditLogs,
    fetchAuditReports,
    fetchRunDetails,
    handlePrintReport,
    handleScheduleSubmit,
    handleRemoveCarLink,
    selectedCar,
    isCarDetailsModalOpen,
    openCarDetails: handleOpenCarDetails,
    closeCarDetails: handleCloseCarDetails,
    onSelectCar: handleOpenCarDetails
  }
}



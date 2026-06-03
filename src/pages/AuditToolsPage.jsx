import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { Calendar, User, BookOpen, Plus, LoaderCircle, CheckCircle, Clock } from 'lucide-react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { fetchLogs } from '../services/logService'
import './PagesStyles.css'

export default function AuditToolsPage({ userRole, userName, currentUserId, authUserId }) {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isInsideSettings = location.pathname.startsWith('/settings')
  
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'Logs')

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])
  
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

  // Audit Logs states
  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(false)
  const [logsError, setLogsError] = useState('')
  
  /* ⚓ Increased the threshold size to populate the custom scroll box with a continuous timeline feed */
  const logsLimit = 150 

  // Audit Reports states
  const [completedRuns, setCompletedRuns] = useState([])
  const [loadingReports, setLoadingReports] = useState(false)
  const [reportsError, setReportsError] = useState('')
  const [selectedRunDetails, setSelectedRunDetails] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [runClauses, setRunClauses] = useState([])
  const [runResults, setRunResults] = useState([])
  const [loadingRunDetails, setLoadingRunDetails] = useState(false)

  // Start/Resume Audit
  const handleStartAudit = async (schedule) => {
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      // 1. Check if there's already an active (uncompleted) run for this schedule
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
        // Create new audit run
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

      // 2. Fetch standard clauses
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
        // Sort clauses numerically
        clausesList = (clausesData || []).sort((a, b) =>
          a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true })
        )
      }

      // 3. Fetch existing results for this run
      const { data: existingResults, error: resultsError } = await supabase
        .from('audit_results')
        .select('*')
        .eq('run_id', activeRunData.id)

      if (resultsError) throw resultsError

      // 4. Build results map
      const initialResults = {}
      clausesList.forEach(clause => {
        const existing = (existingResults || []).find(r => r.clause_id === clause.id)
        initialResults[clause.id] = {
          id: existing?.id || null,
          status: existing?.status || 'compliant',
          evidence: existing?.evidence || ''
        }
      })

      // 5. Update state
      setActiveRun({
        id: activeRunData.id,
        schedule_id: schedule.id,
        title: schedule.title,
        standard_name: schedule.standard_name
      })
      setActiveClauses(clausesList)
      setResultsMap(initialResults)
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
        // Complete the run
        const { error: runErr } = await supabase
          .from('audit_runs')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', activeRun.id)

        if (runErr) throw runErr

        // Complete the schedule
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

  // Fetch all initial data
  const fetchData = async () => {
    setLoading(true)
    setError('')
    try {
      // 1. Fetch active ISO standards
      const { data: standardsData, error: stdError } = await supabase
        .from('iso_standards')
        .select('id, name, version')
        .eq('is_active', true)
      
      if (stdError) throw stdError
      setStandards(standardsData || [])

      // 2. Fetch auditors (ADMIN or AUDITOR role)
      const { data: auditorsData, error: audError } = await supabase
        .from('users')
        .select('id, first_name, last_name, auth_id, role_id')
        .in('role_id', [1, 2])
      
      if (audError) throw audError
      setAuditors(auditorsData || [])

      // 3. Fetch audit schedules with standards and auditors information
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

      // We need to map auditor names and standard names since the join might be manual
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

  const fetchAuditLogs = async () => {
    setLogsLoading(true)
    setLogsError('')
    try {
      /* ⚡ Always pull directly from baseline offset 0 for scrolling */
      const offset = 0 
      const res = await fetchLogs({ limit: logsLimit, offset, filters: { level: 'audit' } })
      setLogs(res.data || [])
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
      fetchAuditLogs()
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
    text = true
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

      // Create notification for the assigned auditor
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
      
      // Reset form
      setTitle('')
      setStandardId('')
      setScheduledDate('')
      setAuditorId('')

      // Refresh listing
      await fetchData()
    } catch (err) {
      console.error('Error saving schedule:', err)
      setError(err.message || 'Failed to create audit schedule.')
    } finally {
      setSaving(false)
    }
  }

  const renderTabs = () => (
    <div className="tab-navigation">
      <button
        onClick={() => setActiveTab('Logs')}
        className={`tab-button ${activeTab === 'Logs' ? 'active' : ''}`}
      >
        Audit Logs
      </button>
      <button
        onClick={() => setActiveTab('Reports')}
        className={`tab-button ${activeTab === 'Reports' ? 'active' : ''}`}
      >
        Audit Reports
      </button>
      <button
        onClick={() => setActiveTab('Schedules')}
        className={`tab-button ${activeTab === 'Schedules' ? 'active' : ''}`}
      >
        Audit Schedules
      </button>
    </div>
  )

  const renderChecklist = () => (
    <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#fff' }}>Audit Checklist: {activeRun.title}</h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#94a3b8' }}>Standard: {activeRun.standard_name}</p>
        </div>
        <button className="sidebar-button" onClick={() => { setActiveRun(null); fetchData(); }} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
          Go Back
        </button>
      </div>

      {error && (
        <div className="iso-inline-message iso-inline-message--error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}
      {success && (
        <div className="iso-inline-message iso-inline-message--success" style={{ marginBottom: '16px' }}>
          {success}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '24px', width: '100%' }}>
        {activeClauses.length === 0 ? (
          <p style={{ color: '#94a3b8', textAlign: 'center' }}>No clauses found for this ISO standard. Please add clauses first.</p>
        ) : (
          activeClauses.map(clause => {
            const answer = resultsMap[clause.id] || { status: 'compliant', evidence: '' }
            return (
              <div key={clause.id} className="settings-container--profile" style={{ minHeight: 'auto', padding: '16px', background: 'rgba(15, 23, 42, 0.25)', border: '1px solid rgba(255,255,255,0.05)', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#22d3ee', marginRight: '8px' }}>Clause {clause.clause_number}</span>
                    <h4 style={{ margin: 0, display: 'inline', fontSize: '14px', color: '#f8fafc' }}>{clause.title}</h4>
                    {clause.description && <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#64748b' }}>{clause.description}</p>}
                  </div>
                  
                  {/* Status selectors */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {['compliant', 'partial', 'non_compliant', 'na'].map(statusVal => {
                      const labelMap = {
                        compliant: 'Compliant',
                        partial: 'Partial',
                        non_compliant: 'Non-Compliant',
                        na: 'N/A'
                      }
                      const colorMap = {
                        compliant: 'rgba(16, 185, 129, 0.15)',
                        partial: 'rgba(245, 158, 11, 0.15)',
                        non_compliant: 'rgba(239, 68, 68, 0.15)',
                        na: 'rgba(100, 116, 139, 0.15)'
                      }
                      const textMap = {
                        compliant: '#10b981',
                        partial: '#f59e0b',
                        non_compliant: '#ef4444',
                        na: '#94a3b8'
                      }
                      
                      const isActive = answer.status === statusVal
                      return (
                        <button
                          key={statusVal}
                          type="button"
                          onClick={() => {
                            setResultsMap({
                              ...resultsMap,
                              [clause.id]: { ...answer, status: statusVal }
                            })
                          }}
                          style={{
                            padding: '6px 12px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: isActive ? `1px solid ${textMap[statusVal]}` : '1px solid rgba(255,255,255,0.06)',
                            background: isActive ? colorMap[statusVal] : 'transparent',
                            color: isActive ? textMap[statusVal] : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {labelMap[statusVal]}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <input
                    type="text"
                    placeholder="Evidence / Audit Notes..."
                    className="form-input"
                    style={{ padding: '8px 12px', fontSize: '13px' }}
                    value={answer.evidence}
                    onChange={(e) => {
                      setResultsMap({
                        ...resultsMap,
                        [clause.id]: { ...answer, evidence: e.target.value }
                      })
                    }}
                  />
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px', width: '100%' }}>
        <button
          type="button"
          className="sidebar-button"
          onClick={() => handleSaveResults(false)}
          disabled={savingProgress || activeClauses.length === 0}
        >
          {savingProgress ? 'Saving...' : 'Save Progress'}
        </button>
        <button
          type="button"
          className="btn-primary"
          onClick={() => handleSaveResults(true)}
          disabled={savingProgress || activeClauses.length === 0}
        >
          {savingProgress ? 'Completing...' : 'Complete Audit'}
        </button>
      </div>
    </div>
  )

  const renderTabContent = () => {
    if (activeTab === 'Logs') {
      return (
        <div className="tab-content" style={isInsideSettings ? { marginTop: '20px' } : {}}>
          <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column' }}>
            <h3 className="settings-section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={20} className="icon-cyan" />
              Audit Activity Logs
            </h3>
            
            <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '-8px', marginBottom: '20px', lineHeight: '1.4' }}>
              Track all system actions, checklist updates, corrective actions, and policy reads logged under the Quality Management System.
            </p>

            {logsLoading && (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
                Loading audit activity logs...
              </div>
            )}

            {logsError && (
              <div className="iso-inline-message iso-inline-message--error" style={{ marginBottom: '16px' }}>
                {logsError}
              </div>
            )}

            {!logsLoading && !logsError && (
              <>
                {/* ── 📱 SAFE CONTAINED SCROLL OVERFLOW WINDOW ── */}
                <div className="iso-table-wrap">
                  <table className="iso-table system-logs-table">
                    <thead>
                      <tr>
                        <th style={{ width: '18%' }}>Timestamp</th>
                        <th style={{ width: '10%' }}>Source</th>
                        <th style={{ width: '57%' }}>Action Description / Metadata</th>
                        <th style={{ width: '15%' }}>User</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="iso-empty-state">
                            No audit activity logs found.
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id}>
                            <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                              {new Date(log.created_at).toLocaleString()}
                            </td>
                            <td>
                              <span style={{ fontSize: '11px', background: 'rgba(34, 211, 238, 0.1)', color: '#22d3ee', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', textTransform: 'uppercase' }}>
                                {log.source || 'system'}
                              </span>
                            </td>
                            <td>
                              <div style={{ fontWeight: '500', color: '#f8fafc' }}>
                                {typeof log.action === 'string' ? log.action : JSON.stringify(log.action)}
                              </div>
                              {log.details && Object.keys(log.details).length > 0 && (
                                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>
                                  {JSON.stringify(log.details)}
                                </div>
                              )}
                            </td>
                            <td style={{ fontSize: '13px', color: '#94a3b8' }}>
                              {log.user_display || log.user_auth_id || 'System'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* 🛑 PAGINATION ELEMENTS REMOVED FROM HERE FOR COMPLETELY SEAMLESS FEED SCROLLING */}
              </>
            )}
          </div>
        </div>
      )
    }

    if (activeTab === 'Reports') {
      const avgScore = completedRuns.length > 0 
        ? Math.round(completedRuns.reduce((acc, curr) => acc + curr.score, 0) / completedRuns.length) 
        : 100
      const totalDeficiencies = completedRuns.reduce((acc, curr) => acc + curr.nonCompliantClauses, 0)

      return (
        <div className="tab-content" style={isInsideSettings ? { marginTop: '20px' } : {}}>
          <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 className="settings-section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={20} className="icon-cyan" />
                Completed Audit Reports
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '-8px', marginBottom: '20px', lineHeight: '1.4' }}>
                View dynamic compliance score cards, read specific clause evaluations, and download print-ready records of completed quality audits.
              </p>
            </div>

            {/* Stats Summary Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', width: '100%', marginBottom: '12px' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Audits</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc' }}>{completedRuns.length}</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Average Score</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#22d3ee' }}>{avgScore}%</span>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Gaps Found</span>
                <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{totalDeficiencies}</span>
              </div>
            </div>

            {loadingReports ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
                Loading completed audit runs...
              </div>
            ) : reportsError ? (
              <div className="iso-inline-message iso-inline-message--error" style={{ width: '100%' }}>
                {reportsError}
              </div>
            ) : completedRuns.length === 0 ? (
              <div style={{ width: '100%', padding: '32px 0', textAlign: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                No completed audits found. Complete an active schedule to generate reports here!
              </div>
            ) : (
              <div className="iso-table-wrap" style={{ width: '100%' }}>
                <table className="iso-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Audit Run</th>
                      <th style={{ width: '20%' }}>ISO Standard</th>
                      <th style={{ width: '20%' }}>Conducted By</th>
                      <th style={{ width: '15%' }} className="text-center">Compliance Score</th>
                      <th style={{ width: '20%' }} className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completedRuns.map(run => (
                      <tr key={run.id}>
                        <td>
                          <strong>{run.title}</strong>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Completed: {new Date(run.completed_at).toLocaleDateString()}
                          </div>
                        </td>
                        <td>{run.standard_name}</td>
                        <td>{run.auditor_name}</td>
                        <td className="text-center">
                          <span 
                            style={{ 
                              fontWeight: 'bold', 
                              color: run.score >= 90 ? '#10b981' : run.score >= 70 ? '#f59e0b' : '#ef4444',
                              fontSize: '15px'
                            }}
                          >
                            {run.score}%
                          </span>
                          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            {run.compliantClauses} Compliant / {run.nonCompliantClauses} Gap
                          </div>
                        </td>
                        <td className="text-center">
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              onClick={() => fetchRunDetails(run)}
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              className="sidebar-button"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              onClick={() => handlePrintReport(run)}
                            >
                              Print
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )
    }

    if (activeTab === 'Schedules') {
      return (
        <div className="tab-content" style={isInsideSettings ? { marginTop: '20px' } : {}}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
            
            {/* Creation Form */}
            <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column' }}>
              <h3 className="settings-section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={20} className="icon-cyan" />
                Create Audit Schedule
              </h3>

              <form onSubmit={handleScheduleSubmit} className="iso-form" style={{ width: '100%' }}>
                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="audit-title">Audit Title</label>
                    <input
                      id="audit-title"
                      type="text"
                      placeholder="e.g., Q2 Internal Quality Audit"
                      className="form-input"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="standard-select">ISO Standard</label>
                    <select
                      id="standard-select"
                      className="form-input"
                      value={standardId}
                      onChange={(e) => setStandardId(e.target.value)}
                    >
                      <option value="">Select a standard...</option>
                      {standards.map(std => (
                        <option key={std.id} value={std.id}>
                          {std.name} ({std.version})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row-2">
                  <div className="form-group">
                    <label htmlFor="schedule-date">Scheduled Date</label>
                    <input
                      id="schedule-date"
                      type="date"
                      className="form-input"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="auditor-select">Assign Auditor</label>
                    <select
                      id="auditor-select"
                      className="form-input"
                      value={auditorId}
                      onChange={(e) => setAuditorId(e.target.value)}
                    >
                      <option value="">Select an auditor...</option>
                      {auditors.map(aud => (
                        <option key={aud.id} value={aud.auth_id}>
                          {aud.first_name} {aud.last_name} ({aud.role_id === 1 ? 'Admin' : 'Auditor'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && (
                  <div className="iso-inline-message iso-inline-message--error" style={{ marginBottom: '16px' }}>
                    {error}
                  </div>
                )}

                {success && (
                  <div className="iso-inline-message iso-inline-message--success" style={{ marginBottom: '16px' }}>
                    {success}
                  </div>
                )}

                <div className="iso-actions-row" style={{ marginTop: '8px' }}>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <LoaderCircle size={16} className="iso-spinner" style={{ marginRight: '8px', display: 'inline' }} />
                        Saving...
                      </>
                    ) : 'Save Schedule'}
                  </button>
                </div>
              </form>
            </div>

            {/* Schedules List */}
            <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column' }}>
              <h3 className="settings-section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={20} className="icon-cyan" />
                Scheduled Audits
              </h3>

              <div className="iso-table-wrap">
                <table className="iso-table">
                  <thead>
                    <tr>
                      <th style={{ width: '25%' }}>Audit Title</th>
                      <th style={{ width: '20%' }}>ISO Standard</th>
                      <th style={{ width: '20%' }}>Assigned Auditor</th>
                      <th style={{ width: '15%' }}>Date</th>
                      <th style={{ width: '10%' }} className="text-center">Status</th>
                      <th style={{ width: '10%' }} className="text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="iso-empty-state">
                          <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
                          Loading schedules...
                        </td>
                      </tr>
                    ) : schedules.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="iso-empty-state">
                          No audits scheduled yet. Create one above!
                        </td>
                      </tr>
                    ) : (
                      schedules.map(sched => (
                        <tr key={sched.id}>
                          <td><strong>{sched.title}</strong></td>
                          <td>{sched.standard_name}</td>
                          <td>{sched.auditor_name}</td>
                          <td>{sched.scheduled_date}</td>
                          <td className="text-center">
                            <span className={`iso-status-pill ${sched.status === 'completed' ? 'is-active' : 'is-inactive'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {sched.status === 'completed' ? (
                                <>
                                  <CheckCircle size={12} />
                                  Completed
                                </>
                              ) : (
                                <>
                                  <Clock size={12} />
                                  Pending
                                </>
                              )}
                            </span>
                          </td>
                          <td className="text-center">
                            {sched.status !== 'completed' && (
                              <button
                                type="button"
                                className="btn-primary"
                                style={{ padding: '6px 12px', fontSize: '12px' }}
                                onClick={() => handleStartAudit(sched)}
                              >
                                Start Run
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )
    }

    return null
  }

  const renderDetailsModal = () => {
    if (!isDetailsModalOpen || !selectedRunDetails) return null

    return (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(2, 6, 12, 0.75)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px',
          boxSizing: 'border-box'
        }}
        onClick={() => setIsDetailsModalOpen(false)}
      >
        <div 
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '750px',
            background: 'rgba(13, 26, 45, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.6)',
            borderRadius: '16px',
            padding: '24px 32px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', color: '#fff' }}>
                Audit Details: {selectedRunDetails.title}
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                Standard: {selectedRunDetails.standard_name} | Auditor: {selectedRunDetails.auditor_name}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailsModalOpen(false)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '18px' }}
            >
              ✕
            </button>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px', display: 'flex', flexDirection: 'column', gap: '12px', margin: '16px 0' }}>
            {loadingRunDetails ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
                Loading checklist findings...
              </div>
            ) : runClauses.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>No evaluated clauses found.</div>
            ) : (
              runClauses.map((clause) => {
                const result = runResults.find(r => r.clause_id === clause.id) || { status: 'na', evidence: '' }
                
                const statusColors = {
                  compliant: { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', label: 'Compliant' },
                  partial: { bg: 'rgba(245, 158, 11, 0.1)', text: '#f59e0b', label: 'Partial' },
                  non_compliant: { bg: 'rgba(239, 68, 68, 0.1)', text: '#ef4444', label: 'Non-Compliant' },
                  na: { bg: 'rgba(100, 116, 139, 0.1)', text: '#94a3b8', label: 'N/A' }
                }
                const badge = statusColors[result.status] || statusColors.na

                return (
                  <div
                    key={clause.id}
                    style={{
                      padding: '14px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--cyan-light, #22d3ee)', marginRight: '8px' }}>
                          Clause {clause.clause_number}
                        </span>
                        <strong style={{ fontSize: '13.5px', color: '#f8fafc' }}>
                          {clause.title}
                        </strong>
                      </div>
                      <span style={{ fontSize: '11px', background: badge.bg, color: badge.text, padding: '2px 8px', borderRadius: '4px', fontWeight: 'bold', textTransform: 'uppercase', flexShrink: 0 }}>
                        {badge.label}
                      </span>
                    </div>
                    {result.evidence && (
                      <p style={{ margin: 0, fontSize: '12.5px', color: '#94a3b8', background: 'rgba(0,0,0,0.15)', padding: '6px 10px', borderRadius: '4px', fontStyle: 'italic' }}>
                        <span style={{ color: '#64748b', fontWeight: 'bold', fontStyle: 'normal' }}>Notes: </span>
                        {result.evidence}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <button
              type="button"
              className="sidebar-button"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => handlePrintReport(selectedRunDetails)}
            >
              Print Report
            </button>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
              onClick={() => setIsDetailsModalOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (activeRun) {
    if (isInsideSettings) {
      return (
        <div className="settings-content-inner" style={{ width: '100%' }}>
          {renderChecklist()}
        </div>
      )
    }
    return (
      <>
        <main className="audit-main">
          {renderChecklist()}
        </main>
      </>
    )
  }

  if (isInsideSettings) {
    return (
      <div className="settings-content-inner" style={{ width: '100%' }}>
        <h2 className="settings-section-title">Audit Tools</h2>
        {renderTabs()}
        {renderTabContent()}
        {renderDetailsModal()}
      </div>
    )
  }

  return (
    <>
      <main className="audit-main">
        <h1>Audit Tools</h1>
        {renderTabs()}
        {renderTabContent()}
      </main>
      {renderDetailsModal()}
    </>
  )
}
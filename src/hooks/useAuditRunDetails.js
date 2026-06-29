import { useState } from 'react'
import { supabase } from '@/utils/supabase'

export function useAuditRunDetails() {
  const [selectedRunDetails, setSelectedRunDetails] = useState(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false)
  const [loadingRunDetails, setLoadingRunDetails] = useState(false)
  const [runClauses, setRunClauses] = useState([])
  const [runResults, setRunResults] = useState([])

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
        
        // Fetch linked CARs for these clauses to display in details
        const clauseIds = clausesList.map(c => c.id)
        if (clauseIds.length > 0) {
          const { data: linksData, error: linkErr } = await supabase
            .from('car_clause_links')
            .select('clause_id, car_reports(*)')
            .in('clause_id', clauseIds)
            
          if (!linkErr && linksData) {
            console.log('Fetched linksData:', linksData)
            clausesList = clausesList.map(c => {
              const cars = linksData
                .filter(l => {
                  if (l.clause_id === c.id) {
                    console.log(`Checking clause ${c.id} link:`, l)
                    console.log(`Match? ${String(l.car_reports?.audit_schedule_id)} === ${String(run.schedule_id)}`)
                  }
                  // Temporarily remove the schedule_id filter to see if any show up
                  return l.clause_id === c.id && l.car_reports
                })
                .map(l => l.car_reports)
              return { ...c, linked_cars: cars }
            })
          }
        }
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
                      <div style="margin-top: 40px; font-size: 12px; color: #94a3b8; text-align: center;">
                        Report generated on ${new Date().toLocaleString()} by QFlow System
                      </div>
                    `
                    setTimeout(() => {
                      printWindow.print()
                    }, 500)
                  })
              })
          })
      })
  }

  return {
    selectedRunDetails,
    setSelectedRunDetails,
    isDetailsModalOpen,
    setIsDetailsModalOpen,
    loadingRunDetails,
    runClauses,
    runResults,
    fetchRunDetails,
    handlePrintReport,
  }
}

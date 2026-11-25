// src/components/Dashboard/OccurringIssuesSummary.jsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import {
  FileCheck2,
  PackageX,
  ArrowRight,
  RefreshCw,
  ChevronRight
} from 'lucide-react'
import './OccurringIssuesSummary.css'

const CAR_SUMMARY_COLUMNS =
  'id, reference_no, status, created_at, type_of_nonconformance, others, product_material_name, control_no, details_of_nonconformance, requesting_department, responsible_department, recipient'

const QDDR_SUMMARY_COLUMNS =
  'id, reference_no, status, created_at, material_description, qty, reason_of_discrepancy, location, crushed_dented, holes_punctures, wet_leaked, open_carton, deformed_torn, opened_seal, no_label_broken_label'

export default function OccurringIssuesSummary({ onRefresh, initialCars = null, initialQddrs = null }) {
  const navigate = useNavigate()
  const hasPrefetchedData = Array.isArray(initialCars) && Array.isArray(initialQddrs)
  const [loading, setLoading] = useState(!hasPrefetchedData)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const [activeCars, setActiveCars] = useState(hasPrefetchedData ? initialCars : [])
  const [activeQddrs, setActiveQddrs] = useState(hasPrefetchedData ? initialQddrs : [])

  useEffect(() => {
    if (Array.isArray(initialCars) && Array.isArray(initialQddrs)) {
      setActiveCars(initialCars)
      setActiveQddrs(initialQddrs)
      setLoading(false)
    }
  }, [initialCars, initialQddrs])

  const loadOccurringIssues = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      if (isManualRefresh && onRefresh) {
        // Parent fetchDashboardData already fetches activeCars, activeQddrs, and dashboard metrics in one wave
        await onRefresh()
        return
      }

      const [carResult, qddrResult] = await Promise.all([
        supabase
          .from('car_reports')
          .select(CAR_SUMMARY_COLUMNS)
          .not('status', 'ilike', 'closed')
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('qddr_reports')
          .select(QDDR_SUMMARY_COLUMNS)
          .not('status', 'ilike', 'closed')
          .neq('status', 'deleted')
          .order('created_at', { ascending: false })
          .limit(100)
      ])

      const carsList = (carResult?.data || [])
        .filter(c => !['closed', 'deleted'].includes(String(c.status || '').trim().toLowerCase()))

      const qddrsList = (qddrResult?.data || [])
        .filter(q => !['closed', 'deleted'].includes(String(q.status || '').trim().toLowerCase()))

      setActiveCars(carsList)
      setActiveQddrs(qddrsList)
    } catch (err) {
      console.error('Error loading occurring issues summary:', err)
      setError('Could not load occurring issues data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [onRefresh])

  useEffect(() => {
    if (!hasPrefetchedData) {
      loadOccurringIssues()
    }
  }, [hasPrefetchedData, loadOccurringIssues])

  // ─── Analytics Aggregations ────────────────────────────────────────────────

  const carMetrics = useMemo(() => {
    const typeCounts = {}

    activeCars.forEach((c) => {
      const typeName = c.type_of_nonconformance || c.others || 'General'
      typeCounts[typeName] = (typeCounts[typeName] || 0) + 1
    })

    const topTypes = Object.entries(typeCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    return {
      total: activeCars.length,
      topTypes
    }
  }, [activeCars])

  const qddrMetrics = useMemo(() => {
    const discCounts = {
      'Crushed / Dented': 0,
      'Holes & Punctures': 0,
      'Wet / Leaked': 0,
      'Open Carton': 0,
      'Deformed / Torn': 0,
      'Seal / Label': 0
    }

    activeQddrs.forEach((q) => {
      if (q.crushed_dented) discCounts['Crushed / Dented']++
      if (q.holes_punctures) discCounts['Holes & Punctures']++
      if (q.wet_leaked) discCounts['Wet / Leaked']++
      if (q.open_carton) discCounts['Open Carton']++
      if (q.deformed_torn) discCounts['Deformed / Torn']++
      if (q.opened_seal || q.no_label_broken_label) discCounts['Seal / Label']++
    })

    const topDiscrepancies = Object.entries(discCounts)
      .filter(([_, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    return {
      total: activeQddrs.length,
      topDiscrepancies
    }
  }, [activeQddrs])

  const totalActiveCount = (carMetrics.total || 0) + (qddrMetrics.total || 0)

  const handleCardClick = (moduleType) => {
    navigate('/reports', { state: { tab: moduleType } })
  }

  return (
    <section className="occurring-issues-section">
      {/* ── Header ── */}
      <div className="occurring-issues-header">
        <div className="occurring-issues-header-left">
          <div className="occurring-issues-title-row">
            <h2 className="occurring-issues-title">Occurring Issues &amp; Discrepancies Summary</h2>
            <div className="occurring-issues-badge" title="Total active unresolved issues across facilities">
              <span className="occurring-issues-badge-dot" />
              <span>{totalActiveCount} Active Occurrences</span>
            </div>
          </div>
          <p className="occurring-issues-subtitle">
            Real-time status of active Corrective Actions (CAR) and Quality Defect &amp; Disposal Reports (QDDR).
          </p>
        </div>

        <div className="occurring-issues-header-actions">
          <button
            type="button"
            className="btn-refresh-issues"
            onClick={() => loadOccurringIssues(true)}
            title="Refresh occurring issues"
          >
            <RefreshCw size={15} className={refreshing ? 'spin-animation' : ''} />
          </button>
          <button
            type="button"
            className="btn-view-all-reports"
            onClick={() => navigate('/reports')}
          >
            <span>View All Reports</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {error && (
        <div className="iso-banner iso-banner--error" style={{ margin: 0 }}>
          <span>{error}</span>
        </div>
      )}

      {/* ── 2 Module Summary Cards Grid ── */}
      <div className="occurring-summary-cards-grid">
        {/* CAR Summary Card */}
        <div
          className="occurring-module-card module-card--car"
          onClick={() => handleCardClick('car')}
          title="Click to view all active Corrective Action Requests"
        >
          <div className="module-card-top">
            <div className="module-card-badge-wrap">
              <div className="module-icon-circle icon-car">
                <FileCheck2 size={18} />
              </div>
              <div>
                <h3 className="module-name-title">Corrective Actions (CAR)</h3>
                <p className="module-name-sub">Customer Complaints &amp; Audit CAPA</p>
              </div>
            </div>
            <div className="module-active-counter counter-car">
              {loading ? '…' : carMetrics.total}
            </div>
          </div>

          <div className="module-pill-row">
            {carMetrics.topTypes.length > 0 ? (
              carMetrics.topTypes.map(([type, count]) => (
                <span key={type} className="module-pill pill-info">
                  {type}: {count}
                </span>
              ))
            ) : (
              <span className="module-pill pill-info">✓ No Active CARs</span>
            )}
          </div>

          <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: '#1A435A' }}>Awaiting Action: </span>
            {carMetrics.total > 0 ? `${carMetrics.total} processes awaiting investigation or verification` : 'Zero active CAPA backlogs'}
          </div>

          <div className="module-card-footer-link">
            <span>Manage CARs in Reports</span>
            <ChevronRight size={14} />
          </div>
        </div>

        {/* QDDR Summary Card */}
        <div
          className="occurring-module-card module-card--qddr"
          onClick={() => handleCardClick('qddr')}
          title="Click to view all active Quality Defect Reports"
        >
          <div className="module-card-top">
            <div className="module-card-badge-wrap">
              <div className="module-icon-circle icon-qddr">
                <PackageX size={18} />
              </div>
              <div>
                <h3 className="module-name-title">Defects &amp; Disposal (QDDR)</h3>
                <p className="module-name-sub">Inbound &amp; Warehouse Discrepancies</p>
              </div>
            </div>
            <div className="module-active-counter counter-qddr">
              {loading ? '…' : qddrMetrics.total}
            </div>
          </div>

          <div className="module-pill-row">
            {qddrMetrics.topDiscrepancies.length > 0 ? (
              qddrMetrics.topDiscrepancies.map(([disc, count]) => (
                <span key={disc} className="module-pill pill-medium">
                  {disc}: {count}
                </span>
              ))
            ) : (
              <span className="module-pill pill-info">✓ No Active QDDRs</span>
            )}
          </div>

          <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: '#1A435A' }}>Damaged Stock: </span>
            {qddrMetrics.total > 0 ? `${qddrMetrics.total} physical shipments segregated / reported` : 'Warehouse receiving clear'}
          </div>

          <div className="module-card-footer-link">
            <span>Manage QDDRs in Reports</span>
            <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </section>
  )
}

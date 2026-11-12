// src/components/Dashboard/OccurringIssuesSummary.jsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import {
  FileCheck2,
  PackageX,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  Clock,
  MapPin,
  ChevronRight
} from 'lucide-react'
import './OccurringIssuesSummary.css'

function getRelativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const diff = now - new Date(dateStr)
  const secs = Math.floor(diff / 1000)
  const mins = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (mins > 0) return `${mins}m ago`
  return 'Just now'
}

export default function OccurringIssuesSummary({ onRefresh }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'car' | 'qddr'
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  const [activeCars, setActiveCars] = useState([])
  const [activeQddrs, setActiveQddrs] = useState([])

  const loadOccurringIssues = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [carResult, qddrResult] = await Promise.all([
        supabase
          .from('car_reports')
          .select('*, audit_schedules(id, title, scheduled_date)')
          .not('status', 'ilike', 'closed')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('qddr_reports')
          .select('*')
          .not('status', 'ilike', 'closed')
          .order('created_at', { ascending: false })
          .limit(100),
        isManualRefresh && onRefresh ? onRefresh().catch(() => {}) : Promise.resolve()
      ])

      const carsList = (carResult?.data || [])
        .filter(c => String(c.status || '').trim().toLowerCase() !== 'closed')

      const qddrsList = (qddrResult?.data || [])
        .filter(q => String(q.status || '').trim().toLowerCase() !== 'closed')

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
    loadOccurringIssues()
  }, [loadOccurringIssues])

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

  // ─── Normalise Unified List of Occurring Issues ────────────────────────────

  const unifiedIssuesList = useMemo(() => {
    const list = []

    // 1. Process CARs
    ;(Array.isArray(activeCars) ? activeCars : []).forEach((c) => {
      const tags = []
      if (c.type_of_nonconformance) {
        tags.push(c.type_of_nonconformance)
      } else {
        if (c.quality_food_safety) tags.push('Quality / Food Safety')
        if (c.customer_complaint) tags.push('Customer Complaint')
        if (c.vendor_nonconformance) tags.push('Vendor Non-Conformance')
        if (c.internal_audit) tags.push('Internal Audit')
        if (c.environment_health_safety) tags.push('EHS Issue')
      }

      const headlineText = tags.length > 0 ? tags.join(', ') : (c.product_material_name || 'Corrective Action Required')
      const isQuality = (c.type_of_nonconformance || '').toLowerCase().includes('quality') || Boolean(c.quality_food_safety)

      list.push({
        id: `car-${c.id}`,
        rawId: c.id,
        type: 'car',
        typeLabel: 'CAR',
        referenceNo: String(c.reference_no || `CAR #${c.id}`),
        headline: String(headlineText),
        detail: String(c.product_material_name ? `${c.product_material_name} ${c.control_no ? `(${c.control_no})` : ''}` : (c.details_of_nonconformance ? String(c.details_of_nonconformance).slice(0, 60) : '')),
        location: String(c.requesting_department || c.responsible_department || 'QA Department'),
        severity: isQuality ? 'High' : 'Medium',
        status: String(c.status || 'OPEN'),
        createdAt: c.created_at,
        relativeTime: getRelativeTime(c.created_at)
      })
    })

    // 2. Process QDDRs
    ;(Array.isArray(activeQddrs) ? activeQddrs : []).forEach((q) => {
      const discTypes = []
      if (q.crushed_dented) discTypes.push('Crushed/Dented')
      if (q.holes_punctures) discTypes.push('Holes/Punctures')
      if (q.wet_leaked) discTypes.push('Wet/Leaked')
      if (q.open_carton) discTypes.push('Open Carton')
      if (q.deformed_torn) discTypes.push('Deformed/Torn')
      if (q.opened_seal) discTypes.push('Opened Seal')

      const headlineText = discTypes.length > 0 ? discTypes.join(', ') : (q.material_description || 'Defect / Discrepancy')

      list.push({
        id: `qddr-${q.id}`,
        rawId: q.id,
        type: 'qddr',
        typeLabel: 'QDDR',
        referenceNo: String(q.reference_no || `QDDR #${q.id}`),
        headline: String(headlineText),
        detail: String(q.material_description ? `${q.material_description}${q.qty ? ` (Qty: ${q.qty})` : ''}` : (q.reason_of_discrepancy ? String(q.reason_of_discrepancy).slice(0, 60) : '')),
        location: String(q.location || 'Receiving Bay'),
        severity: (q.wet_leaked || q.opened_seal) ? 'High' : 'Medium',
        status: String(q.status || 'OPEN'),
        createdAt: q.created_at,
        relativeTime: getRelativeTime(q.created_at)
      })
    })

    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [activeCars, activeQddrs])

  const filteredIssues = useMemo(() => {
    return unifiedIssuesList.filter((item) => {
      if (activeTab !== 'all' && item.type !== activeTab) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchRef = item.referenceNo.toLowerCase().includes(q)
        const matchHeadline = item.headline.toLowerCase().includes(q)
        const matchDetail = item.detail.toLowerCase().includes(q)
        const matchLocation = item.location.toLowerCase().includes(q)
        if (!matchRef && !matchHeadline && !matchDetail && !matchLocation) {
          return false
        }
      }

      return true
    })
  }, [unifiedIssuesList, activeTab, searchQuery])

  const totalActiveCount = unifiedIssuesList.length

  const handleRowClick = (item) => {
    navigate('/reports', { state: { tab: item.type } })
  }

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

      {/* ── Interactive Issues Feed Section ── */}
      <div className="occurring-issues-interactive">
        <div className="issues-controls-row">
          {/* Tabs */}
          <div className="issues-tabs-list">
            <button
              type="button"
              className={`issues-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All Occurring</span>
              <span className="issues-tab-badge">{totalActiveCount}</span>
            </button>
            <button
              type="button"
              className={`issues-tab-btn ${activeTab === 'car' ? 'active' : ''}`}
              onClick={() => setActiveTab('car')}
            >
              <span>CAR</span>
              <span className="issues-tab-badge">{carMetrics.total}</span>
            </button>
            <button
              type="button"
              className={`issues-tab-btn ${activeTab === 'qddr' ? 'active' : ''}`}
              onClick={() => setActiveTab('qddr')}
            >
              <span>QDDR</span>
              <span className="issues-tab-badge">{qddrMetrics.total}</span>
            </button>
          </div>

          {/* Search Filter */}
          <div className="issues-search-filter-box">
            <input
              type="text"
              className="issues-search-input"
              placeholder="Search reference, issue, product…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Live List */}
        {loading ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
            Loading occurring issues…
          </div>
        ) : filteredIssues.length > 0 ? (
          <div className="occurring-issues-list">
            {filteredIssues.map((issue) => {
              const sev = String(issue.severity || '').toLowerCase()
              const sevClass =
                sev === 'critical'
                  ? 'status-badge--critical'
                  : sev === 'high'
                  ? 'status-badge--high'
                  : sev === 'medium'
                  ? 'status-badge--medium'
                  : 'status-badge--low'

              return (
                <div
                  key={issue.id}
                  className="occurring-issue-row"
                  onClick={() => handleRowClick(issue)}
                  title={`Click to open ${issue.typeLabel} reports`}
                >
                  <div className="issue-row-main">
                    <span className={`issue-module-tag module-tag--${issue.type}`}>
                      {issue.typeLabel}
                    </span>

                    <div className="issue-info-wrap">
                      <div className="issue-title-line">
                        <span className="issue-ref-no">{issue.referenceNo}</span>
                        <span className="issue-headline">{issue.headline}</span>
                      </div>

                      <div className="issue-meta-line">
                        {issue.detail && (
                          <span className="issue-meta-item">
                            {issue.detail}
                          </span>
                        )}
                        {issue.location && (
                          <span className="issue-meta-item">
                            <MapPin size={11} style={{ opacity: 0.7 }} />
                            {issue.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="issue-row-right">
                    <span className={`issue-status-badge ${sevClass}`}>
                      {issue.severity}
                    </span>
                    <span className="issue-time">
                      <Clock size={11} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                      {issue.relativeTime}
                    </span>
                    <div className="issue-action-arrow">
                      <ChevronRight size={16} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="occurring-issues-empty">
            <div className="empty-icon-wrap">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="empty-title">
              {searchQuery ? 'No matching issues found' : 'No occurring issues in this category'}
            </h4>
            <p className="empty-subtitle">
              {searchQuery
                ? 'Try adjusting your search terms or switch tabs.'
                : 'All reports for this module are currently closed and verified.'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

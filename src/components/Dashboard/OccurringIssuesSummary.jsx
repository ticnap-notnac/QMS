// src/components/Dashboard/OccurringIssuesSummary.jsx
import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import { fetchAllReports } from '@/services/ncrService'
import {
  AlertTriangle,
  FileCheck2,
  PackageX,
  ArrowRight,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  ExternalLink,
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
  const [activeTab, setActiveTab] = useState('all') // 'all' | 'ncr' | 'car' | 'qddr'
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)

  // Raw active data lists
  const [activeNcrs, setActiveNcrs] = useState([])
  const [activeCars, setActiveCars] = useState([])
  const [activeQddrs, setActiveQddrs] = useState([])

  const loadOccurringIssues = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)

    try {
      const [ncrResult, carResult, qddrResult] = await Promise.all([
        // 1. Fetch active NCRs
        fetchAllReports().catch((err) => {
          console.warn('Failed to fetch NCRs for issues summary:', err)
          return []
        }),
        // 2. Fetch active CARs
        supabase
          .from('car_reports')
          .select('*, audit_schedules(id, title, scheduled_date)')
          .not('status', 'ilike', 'closed')
          .order('created_at', { ascending: false })
          .limit(100),
        // 3. Fetch active QDDRs
        supabase
          .from('qddr_reports')
          .select('*')
          .not('status', 'ilike', 'closed')
          .order('created_at', { ascending: false })
          .limit(100),
        // 4. Optionally refresh dashboard metrics
        isManualRefresh && onRefresh ? onRefresh().catch(() => {}) : Promise.resolve()
      ])

      // Filter active NCRs (status !== 'CLOSED')
      const ncrsList = (Array.isArray(ncrResult) ? ncrResult : [])
        .filter(r => String(r.status || '').trim().toUpperCase() !== 'CLOSED')

      const carsList = (carResult?.data || [])
        .filter(c => String(c.status || '').trim().toLowerCase() !== 'closed')

      const qddrsList = (qddrResult?.data || [])
        .filter(q => String(q.status || '').trim().toLowerCase() !== 'closed')

      setActiveNcrs(ncrsList)
      setActiveCars(carsList)
      setActiveQddrs(qddrsList)
    } catch (err) {
      console.error('Error loading occurring issues summary:', err)
      setError('Could not load occurring issues data.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadOccurringIssues()
  }, [loadOccurringIssues])

  // ─── Analytics Aggregations ────────────────────────────────────────────────

  // NCR Metrics: Severity counts & top recurring categories
  const ncrMetrics = useMemo(() => {
    const severities = { critical: 0, high: 0, medium: 0, low: 0 }
    const catCounts = {}

    activeNcrs.forEach((n) => {
      const sev = String(n.severity || 'low').toLowerCase()
      if (severities[sev] !== undefined) severities[sev]++
      else severities.low++

      const catName = n.issue_types?.issue_type_name || n.issue_type || n.category || 'General Defect'
      catCounts[catName] = (catCounts[catName] || 0) + 1
    })

    const topCategories = Object.entries(catCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)

    return {
      total: activeNcrs.length,
      severities,
      topCategories
    }
  }, [activeNcrs])

  // CAR Metrics: Status counts & top non-conformance types
  const carMetrics = useMemo(() => {
    const typeCounts = {
      'Quality / Food Safety': 0,
      'Customer Complaint': 0,
      'Vendor Non-Conformance': 0,
      'Internal Audit': 0,
      'EHS Issue': 0
    }

    activeCars.forEach((c) => {
      if (c.quality_food_safety) typeCounts['Quality / Food Safety']++
      if (c.customer_complaint) typeCounts['Customer Complaint']++
      if (c.vendor_nonconformance) typeCounts['Vendor Non-Conformance']++
      if (c.internal_audit) typeCounts['Internal Audit']++
      if (c.environment_health_safety) typeCounts['EHS Issue']++
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

  // QDDR Metrics: Discrepancy types counts
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

    // 1. Process NCRs
    ;(Array.isArray(activeNcrs) ? activeNcrs : []).forEach((n) => {
      list.push({
        id: `ncr-${n.id}`,
        rawId: n.id,
        type: 'ncr',
        typeLabel: 'NCR',
        referenceNo: String(n.reference_no || `NCR #${n.id}`),
        headline: String(n.issue_types?.issue_type_name || n.issue_type || n.product_types?.product_name || n.product_type || 'Non-Conformance Issue'),
        detail: String(n.product_types?.product_name || n.product_type || (n.description ? `${String(n.description).slice(0, 60)}…` : '')),
        location: String(n.locations?.location_name || n.location || n.departments?.department_name || 'Warehouse'),
        severity: String(n.severity || 'Medium'),
        status: String(n.status || 'OPEN'),
        createdAt: n.created_at,
        relativeTime: getRelativeTime(n.created_at)
      })
    })

    // 2. Process CARs
    ;(Array.isArray(activeCars) ? activeCars : []).forEach((c) => {
      const tags = []
      if (c.quality_food_safety) tags.push('Quality / Food Safety')
      if (c.customer_complaint) tags.push('Customer Complaint')
      if (c.vendor_nonconformance) tags.push('Vendor Non-Conformance')
      if (c.internal_audit) tags.push('Internal Audit')
      if (c.environment_health_safety) tags.push('EHS Issue')

      const headlineText = tags.length > 0 ? tags.join(', ') : (c.product_material_name || 'Corrective Action Required')

      list.push({
        id: `car-${c.id}`,
        rawId: c.id,
        type: 'car',
        typeLabel: 'CAR',
        referenceNo: String(c.reference_no || `CAR #${c.id}`),
        headline: String(headlineText),
        detail: String(c.product_material_name ? `${c.product_material_name} ${c.control_no ? `(${c.control_no})` : ''}` : (c.details_of_nonconformance ? String(c.details_of_nonconformance).slice(0, 60) : '')),
        location: String(c.requesting_department || c.responsible_department || 'QA Department'),
        severity: c.quality_food_safety ? 'High' : 'Medium',
        status: String(c.status || 'OPEN'),
        createdAt: c.created_at,
        relativeTime: getRelativeTime(c.created_at)
      })
    })

    // 3. Process QDDRs
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

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
  }, [activeNcrs, activeCars, activeQddrs])

  // Filtered list based on active tab and search query
  const filteredIssues = useMemo(() => {
    return unifiedIssuesList.filter((item) => {
      // Tab filter
      if (activeTab !== 'all' && item.type !== activeTab) {
        return false
      }

      // Search query filter
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
            Real-time status of active Non-Conformance Reports (NCR), Corrective Actions (CAR), and Quality Defect Reports (QDDR).
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

      {/* ── 3 Module Summary Cards Grid ── */}
      <div className="occurring-summary-cards-grid">
        {/* NCR Summary Card */}
        <div
          className="occurring-module-card module-card--ncr"
          onClick={() => handleCardClick('ncr')}
          title="Click to view all active Non-Conformance Reports"
        >
          <div className="module-card-top">
            <div className="module-card-badge-wrap">
              <div className="module-icon-circle icon-ncr">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="module-name-title">Non-Conformance (NCR)</h3>
                <p className="module-name-sub">Facility &amp; Production Incidents</p>
              </div>
            </div>
            <div className="module-active-counter counter-ncr">
              {loading ? '…' : ncrMetrics.total}
            </div>
          </div>

          <div className="module-pill-row">
            {ncrMetrics.severities.critical > 0 && (
              <span className="module-pill pill-critical">
                {ncrMetrics.severities.critical} Critical
              </span>
            )}
            {ncrMetrics.severities.high > 0 && (
              <span className="module-pill pill-high">
                {ncrMetrics.severities.high} High
              </span>
            )}
            {ncrMetrics.severities.medium > 0 && (
              <span className="module-pill pill-medium">
                {ncrMetrics.severities.medium} Medium
              </span>
            )}
            {ncrMetrics.severities.low > 0 && (
              <span className="module-pill pill-low">
                {ncrMetrics.severities.low} Low
              </span>
            )}
            {ncrMetrics.total === 0 && (
              <span className="module-pill pill-info">✓ All NCRs Resolved</span>
            )}
          </div>

          {ncrMetrics.topCategories.length > 0 && (
            <div style={{ fontSize: '11.5px', color: '#475569', lineHeight: 1.4 }}>
              <span style={{ fontWeight: 600, color: '#1A435A' }}>Top Issues: </span>
              {ncrMetrics.topCategories.map(([cat, count]) => `${cat} (${count})`).join(' • ')}
            </div>
          )}

          <div className="module-card-footer-link">
            <span>Manage NCRs in Reports</span>
            <ChevronRight size={14} />
          </div>
        </div>

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
                <p className="module-name-sub">CAPA &amp; Systemic Remedies</p>
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
                <h3 className="module-name-title">Defect Reports (QDDR)</h3>
                <p className="module-name-sub">Inbound &amp; Warehouse Defects</p>
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
              className={`issues-tab-btn ${activeTab === 'ncr' ? 'active' : ''}`}
              onClick={() => setActiveTab('ncr')}
            >
              <span>NCR</span>
              <span className="issues-tab-badge">{ncrMetrics.total}</span>
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


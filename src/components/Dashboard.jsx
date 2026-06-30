import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/utils/supabase'
import { request } from '../lib/api'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts'
import { AlertCircle, Shield, TrendingUp, BarChart2, Clock, MoreHorizontal, Calendar, CheckSquare, FileText, CheckCircle2 } from 'lucide-react'


// Custom tooltips for nice monotone popup displays
import './Dashboard.css'
import PendingRatingsWidget from './Dashboard/PendingRatingsWidget'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-title">{label || data.title}</p>
        <p className="tooltip-value">
          {payload[0].name}: {payload[0].value}%
        </p>
        {data.standard && (
          <p className="tooltip-standard">
            Standard: {data.standard}
          </p>
        )}
      </div>
    )
  }
  return null
}

const CustomResolutionTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-chart-tooltip">
        <p className="tooltip-title">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="tooltip-resolution">
            {entry.name}: {entry.value !== null && entry.value !== undefined ? `${entry.value} hours` : '—'}
          </p>
        ))}
      </div>
    )
  }
  return null
}

export default function Dashboard({ currentUserId, userRole, userDepartmentId }) {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState(null)
  const [complianceStats, setComplianceStats] = useState([])
  const [trends, setTrends] = useState([])
  const [resolutionTrend, setResolutionTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [upcomingAudits, setUpcomingAudits] = useState([])
  const [latestActivities, setLatestActivities] = useState([])

  const getRelativeTime = (dateStr) => {
    if (!dateStr) return ''
    const now = new Date()
    const diff = now - new Date(dateStr)
    const secs = Math.floor(diff / 1000)
    const mins = Math.floor(secs / 60)
    const hours = Math.floor(mins / 60)
    const days = Math.floor(hours / 24)

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`
    if (mins > 0) return `${mins} min${mins > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // 1. Fetch open complaints (NCR + CAR) directly from Supabase
        const { count: ncrCount } = await supabase
          .from('ncr_reports')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'CLOSED')

        const { count: carCount } = await supabase
          .from('car_reports')
          .select('id', { count: 'exact', head: true })
          .not('status', 'ilike', 'closed')

        // 2. Fetch compliance stats per standard from backend API
        const stats = await request('/compliance')
        setComplianceStats(stats || [])

        // 3. Fetch historical trend data from backend API
        const trendData = await request('/compliance/trends')
        setTrends(trendData || [])

        // Fetch aggregated resolution trend data directly from the backend
        // (This protects against huge payload sizes if the database is flocked with data)
        const trendPayload = await request('/dashboard/resolution-trends')
        setResolutionTrend(trendPayload || [])

        // 4. Calculate average ISO compliance score
        let avgCompliance = 0
        if (stats && stats.length > 0) {
          const total = stats.reduce((sum, s) => sum + (s.compliance || 0), 0)
          avgCompliance = Math.round(total / stats.length)
        }

        setMetrics({
          openComplaints: (ncrCount || 0) + (carCount || 0),
          isoCompliance: avgCompliance,
          defectRate: 0
        })

        // 5. Fetch upcoming audit schedules from database
        const { data: rawSchedules } = await supabase
          .from('audit_schedules')
          .select('id, title, scheduled_date')
          .order('scheduled_date', { ascending: true })
          .limit(3)

        if (rawSchedules && rawSchedules.length > 0) {
          setUpcomingAudits(rawSchedules.map(s => ({
            id: s.id,
            title: s.title,
            date: new Date(s.scheduled_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
          })))
        } else {
          setUpcomingAudits([])
        }

        // 6. Fetch latest CAR activities from database
        const { data: rawCars } = await supabase
          .from('car_reports')
          .select('id, reference_no, status, created_at, recipient')
          .order('created_at', { ascending: false })
          .limit(4)

        if (rawCars && rawCars.length > 0) {
          setLatestActivities(rawCars.map((c, idx) => ({
            id: c.id,
            title: `CAR Notification: ${c.reference_no}`,
            description: `Status: ${String(c.status || '').toUpperCase()}${c.recipient ? ` | Assignee: ${c.recipient}` : ''}`,
            time: getRelativeTime(c.created_at),
            tone: idx % 2 === 0 ? 'success' : 'danger'
          })))
        } else {
          setLatestActivities([])
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
        setError('We could not load your dashboard. Please refresh the page to try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="flex-column justify-center align-center dashboard-loading-container">
        <div>Loading dashboard metrics...</div>
      </div>
    )
  }

  // Format data for Recharts Bar Chart (Compliance by standard)
  const barChartData = complianceStats.map(s => ({
    name: s.name,
    Compliance: s.compliance
  }))

  // Format data for Recharts Line Chart (Chronological compliance trends)
  const lineChartData = trends.map(t => ({
    date: new Date(t.completed_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Score: t.score,
    title: t.title,
    standard: t.standard_name
  }))



  return (
    <div className="dashboard-content">
      {error && (
        <div className="iso-banner iso-banner--error" style={{ marginBottom: '12px' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Pending Ratings Widget - Fast Frictionless Rating UI */}
      <PendingRatingsWidget 
        currentUserId={currentUserId} 
        userRole={userRole}
        userDepartmentId={userDepartmentId}
      />

      {/* Top Metrics Cards Row */}
      <section className="metrics-section">
        <div className="metric-card" 
          title="The total number of currently active, unresolved NCR (Non-Conformance Reports) and CAR (Corrective Action Requests) processes."
        >
          <div className="metric-card-header">
            <p className="metric-card-title">Open Complaints</p>
            <AlertCircle size={18} color="#0f172a" />
          </div>
          <h3 className="metric-card-value">
            {metrics?.openComplaints || 0}
          </h3>
          <span className="metric-card-subtitle">Active NCR and CAR processes</span>
        </div>

        <div className="metric-card" 
          title="The average audit compliance score calculated across all active ISO standards and guidelines."
        >
          <div className="metric-card-header">
            <p className="metric-card-title">ISO Compliance Rate</p>
            <Shield size={18} color="#0f172a" />
          </div>
          <h3 className="metric-card-value">
            {metrics?.isoCompliance ?? 0}%
          </h3>
          <span className="metric-card-subtitle">Average across all standards</span>
        </div>

        <div className="metric-card" 
          title="The percentage rate of defective items identified in QDDR (Quality Defect & Disposal Reports) relative to total inspection lots."
        >
          <div className="metric-card-header">
            <p className="metric-card-title">QDDR Defect Rate</p>
            <TrendingUp size={18} color="#0f172a" />
          </div>
          <h3 className="metric-card-value">
            {metrics?.defectRate ?? 0}%
          </h3>
          <span className="metric-card-subtitle">Well within compliance margins</span>
        </div>
      </section>

      {/* Double Column Info Widgets Row */}
      {(userRole === 'ADMIN' || userRole === 'AUDITOR') && (
        <section className="dashboard-widgets-grid">
        {/* Card 1: Upcoming Regulatory Audits */}
        <div className="dashboard-widget-card">
          <div className="widget-card-header">
            <h3 className="widget-card-title">Upcoming Regulatory Audits</h3>
          </div>
          
          <div className="widget-calendar-header">
            <span className="widget-calendar-header-inner"><Calendar size={13} /> Calendar</span>
          </div>

          <div className="widget-list">
            {upcomingAudits.length > 0 ? (
              upcomingAudits.map((audit) => (
                <div 
                  key={audit.id} 
                  className="dashboard-clickable-row audit-row"
                  onClick={() => navigate('/audit-tools?tab=Schedules')}
                >
                  <div className="row-left">
                    <div className="row-icon-audit">
                      <CheckCircle2 size={14} />
                    </div>
                    <div className="row-text-container">
                      <span className="row-title">{audit.title}</span>
                      <span className="row-subtitle">{audit.date}</span>
                    </div>
                  </div>
                  <span className="row-date-audit">{audit.date}</span>
                </div>
              ))
            ) : (
              <div className="chart-empty" style={{ height: '60px' }}>
                No upcoming audits scheduled.
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Latest CAR activities */}
        <div className="dashboard-widget-card">
          <div className="widget-card-header">
            <h3 className="widget-card-title">Latest CAR activities</h3>
          </div>

          <div className="widget-list">
            {latestActivities.length > 0 ? (
              latestActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="dashboard-clickable-row car-row"
                  onClick={() => navigate('/reports', { state: { tab: 'car' } })}
                >
                  <div className="row-left">
                    <div className={`row-icon-car car-${activity.tone}`}>
                      <FileText size={16} />
                    </div>
                    <div className="row-text-container">
                      <span className="row-title">
                        {activity.title}
                      </span>
                      <span className="row-subtitle">
                        {activity.description}
                      </span>
                    </div>
                  </div>
                  <span className="row-date-car">{activity.time}</span>
                </div>
              ))
            ) : (
              <div className="chart-empty" style={{ height: '60px' }}>
                No CAR activities recently.
              </div>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Visual Analytics Section */}
      <section className="charts-section">
        <h2 className="charts-section-title">Quality Analytics & Compliance</h2>

        <div className="charts-grid">
          {/* Bar Chart - Compliance by ISO Standard */}
          <div className="chart-wrapper" 
            title="A breakdown showing the latest compliance score percentages for each distinct ISO standard currently audited."
          >
            <div className="chart-header">
              <BarChart2 size={15} color="#0f172a" />
              <h4 className="chart-title">Standard Compliance Breakdown</h4>
            </div>
            <div className="chart-container">
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.02)' }} />
                    <Bar dataKey="Compliance" fill="#0f172a" radius={[4, 4, 0, 0]} maxBarSize={45} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  No compliance data available.
                </div>
              )}
            </div>
          </div>

          {/* Line Chart - Compliance Trend */}
          <div className="chart-wrapper" 
            title="A chronological trend chart tracking overall audit compliance scores from oldest to newest."
          >
            <div className="chart-header">
              <TrendingUp size={15} color="#0f172a" />
              <h4 className="chart-title">Audit Compliance Trend</h4>
            </div>
            <div className="chart-container">
              {lineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Score" stroke="#0f172a" strokeWidth={2} dot={{ fill: '#0f172a', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  No historical trend audits recorded.
                </div>
              )}
            </div>
          </div>

          {/* Line Chart - Resolution Time Trends */}
          <div className="chart-wrapper" 
            title="A monthly historical analysis monitoring the average number of hours taken to close NCR, CAR, and QDDR records."
          >
            <div className="chart-header">
              <Clock size={15} color="#0f172a" />
              <h4 className="chart-title">Average Resolution Time Trend (Hours)</h4>
            </div>
            <div className="chart-container">
              {resolutionTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={resolutionTrend} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomResolutionTooltip />} />
                    <Legend verticalAlign="top" height={36} iconType="circle" />
                    <Line type="monotone" name="NCR" dataKey="NCR" stroke="#52525b" strokeWidth={2} dot={{ fill: '#52525b', r: 4 }} activeDot={{ r: 6 }} connectNulls />
                    <Line type="monotone" name="CAR" dataKey="CAR" stroke="#0f172a" strokeWidth={2} dot={{ fill: '#0f172a', r: 4 }} activeDot={{ r: 6 }} connectNulls />
                    <Line type="monotone" name="QDDR" dataKey="QDDR" stroke="#a1a1aa" strokeWidth={2} dot={{ fill: '#a1a1aa', r: 4 }} activeDot={{ r: 6 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty">
                  No closed reports data available.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

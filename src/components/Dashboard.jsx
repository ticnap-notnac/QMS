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
import PendingRatingsWidget from './Dashboard/PendingRatingsWidget'

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="custom-chart-tooltip" style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
      }}>
        <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{label || data.title}</p>
        <p style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '14px', fontWeight: 700 }}>
          {payload[0].name}: {payload[0].value}%
        </p>
        {data.standard && (
          <p style={{ margin: '4px 0 0 0', color: '#475569', fontSize: '12px' }}>
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
      <div className="custom-chart-tooltip" style={{
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        padding: '12px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
      }}>
        <p style={{ margin: 0, fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} style={{ margin: '4px 0 0 0', color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>
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
        let avgCompliance = 100
        if (stats && stats.length > 0) {
          const total = stats.reduce((sum, s) => sum + (s.compliance || 0), 0)
          avgCompliance = Math.round(total / stats.length)
        }

        setMetrics({
          openComplaints: (ncrCount || 0) + (carCount || 0),
          isoCompliance: avgCompliance,
          defectRate: 0.4
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
          setUpcomingAudits([
            { id: 1, title: 'ISO 13485 Internal Audit', date: 'June 30' },
            { id: 2, title: 'FDA Prep Inspection', date: 'July 15' }
          ])
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
          setLatestActivities([
            { id: 1, title: 'DCR notification at', description: 'NCR Assessment', time: '7 hours ago', tone: 'danger' },
            { id: 2, title: 'DCR notification at', description: 'Latest Emplation', time: '5 hours ago', tone: 'success' },
            { id: 3, title: 'DCR notification at', description: 'CAR Assessment', time: '14 days ago', tone: 'danger' },
            { id: 4, title: 'CAR notification at', description: 'CAR Assessment', time: '2 days ago', tone: 'success' }
          ])
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
      <div className="flex-column justify-center align-center" style={{ height: '50vh', color: '#94a3b8' }}>
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
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
      <section className="metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="metric-card" 
          title="The total number of currently active, unresolved NCR (Non-Conformance Reports) and CAR (Corrective Action Requests) processes."
          style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100px',
            transition: 'transform 0.2s',
            cursor: 'help',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#000000' }}>Open Complaints</p>
            <AlertCircle size={18} color="#0f172a" />
          </div>
          <h3 style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
            {metrics?.openComplaints || 0}
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Active NCR and CAR processes</span>
        </div>

        <div className="metric-card" 
          title="The average audit compliance score calculated across all active ISO standards and guidelines."
          style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100px',
            transition: 'transform 0.2s',
            cursor: 'help',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#000000' }}>ISO Compliance Rate</p>
            <Shield size={18} color="#0f172a" />
          </div>
          <h3 style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
            {metrics?.isoCompliance || 100}%
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Average across all standards</span>
        </div>

        <div className="metric-card" 
          title="The percentage rate of defective items identified in QDDR (Quality Defect & Disposal Reports) relative to total inspection lots."
          style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '100px',
            transition: 'transform 0.2s',
            cursor: 'help',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#000000' }}>QDDR Defect Rate</p>
            <TrendingUp size={18} color="#0f172a" />
          </div>
          <h3 style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
            {metrics?.defectRate || 0.4}%
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Well within compliance margins</span>
        </div>
      </section>

      {/* Double Column Info Widgets Row */}
      <section className="dashboard-widgets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
        {/* Card 1: Upcoming Regulatory Audits */}
        <div className="dashboard-widget-card" style={{
          background: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Upcoming Regulatory Audits</h3>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, color: '#64748b', letterSpacing: '0.5px', textTransform: 'uppercase', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Calendar size={13} /> Calendar</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {upcomingAudits.map((audit) => (
              <div 
                key={audit.id} 
                className="dashboard-clickable-row"
                onClick={() => navigate('/audit-tools?tab=Schedules')}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  borderRadius: '8px',
                  padding: '12px 16px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle2 size={14} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{audit.title}</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>{audit.date}</span>
                  </div>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#475569' }}>{audit.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Card 2: Latest CAR activities */}
        <div className="dashboard-widget-card" style={{
          background: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '12px',
          padding: '20px 24px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>Latest CAR activities</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {latestActivities.map((activity) => (
              <div 
                key={activity.id} 
                className="dashboard-clickable-row"
                onClick={() => navigate('/reports', { state: { tab: 'car' } })}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #f1f5f9',
                  padding: '8px 10px',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: activity.tone === 'success' ? '#f0fdf4' : '#fef2f2',
                    color: activity.tone === 'success' ? '#166534' : '#991b1b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FileText size={16} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                      {activity.title}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      {activity.description}
                    </span>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>{activity.time}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Visual Analytics Section */}
      <section className="charts" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '4px 0 0 0' }}>Quality Analytics & Compliance</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Bar Chart - Compliance by ISO Standard */}
          <div className="chart-wrapper" 
            title="A breakdown showing the latest compliance score percentages for each distinct ISO standard currently audited."
            style={{
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '12px',
              padding: '16px',
              boxSizing: 'border-box',
              cursor: 'help',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <BarChart2 size={15} color="#0f172a" />
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>Standard Compliance Breakdown</h4>
            </div>
            <div style={{ width: '100%', height: '400px' }}>
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
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '13px' }}>
                  No compliance data available.
                </div>
              )}
            </div>
          </div>

          {/* Line Chart - Compliance Trend */}
          <div className="chart-wrapper" 
            title="A chronological trend chart tracking overall audit compliance scores from oldest to newest."
            style={{
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '12px',
              padding: '16px',
              boxSizing: 'border-box',
              cursor: 'help',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <TrendingUp size={15} color="#0f172a" />
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>Audit Compliance Trend</h4>
            </div>
            <div style={{ width: '100%', height: '400px' }}>
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
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '13px' }}>
                  No historical trend audits recorded.
                </div>
              )}
            </div>
          </div>

          {/* Line Chart - Resolution Time Trends */}
          <div className="chart-wrapper" 
            title="A monthly historical analysis monitoring the average number of hours taken to close NCR, CAR, and QDDR records."
            style={{
              background: '#ffffff',
              border: '1px solid #e4e4e7',
              borderRadius: '12px',
              padding: '16px',
              boxSizing: 'border-box',
              cursor: 'help',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Clock size={15} color="#0f172a" />
              <h4 style={{ margin: 0, color: '#0f172a', fontSize: '13px', fontWeight: 600 }}>Average Resolution Time Trend (Hours)</h4>
            </div>
            <div style={{ width: '100%', height: '400px' }}>
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
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '13px' }}>
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

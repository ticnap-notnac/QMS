import { useState, useEffect } from 'react'
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
import { AlertCircle, Shield, TrendingUp, BarChart2, Clock } from 'lucide-react'

// Helper to parse and calculate resolution time in hours
const parseResolutionTimeToHours = (resTime, start, end) => {
  if (resTime) {
    const match = String(resTime).match(/(\d+)\s*(day|hour)/i)
    if (match) {
      const value = parseInt(match[1], 10)
      const unit = match[2].toLowerCase()
      if (unit.startsWith('day')) {
        return value * 24
      }
      return value
    }
  }
  if (start && end) {
    const diff = new Date(end) - new Date(start)
    if (diff > 0) {
      return Number((diff / (1000 * 60 * 60)).toFixed(1))
    }
  }
  return null
}

// Helper to aggregate resolution times monthly
const groupResolutionTimesByMonth = (ncrs, cars, qddrs) => {
  const months = {}

  const addValue = (dateStr, val, type) => {
    if (val === null || isNaN(val)) return
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return
    const monthKey = d.toLocaleString('default', { month: 'short' }) + ' ' + d.getFullYear()
    if (!months[monthKey]) {
      months[monthKey] = {
        ncrSum: 0, ncrCount: 0,
        carSum: 0, carCount: 0,
        qddrSum: 0, qddrCount: 0,
        rawDate: d
      }
    }
    months[monthKey][`${type}Sum`] += val
    months[monthKey][`${type}Count`] += 1
  }

  ncrs.forEach(item => {
    const val = parseResolutionTimeToHours(item.resolution_time, item.created_at, null)
    addValue(item.created_at, val, 'ncr')
  })

  cars.forEach(item => {
    const val = parseResolutionTimeToHours(item.resolution_time, item.created_at || item.request_date, item.verification_date || item.updated_at)
    addValue(item.created_at || item.request_date, val, 'car')
  })

  qddrs.forEach(item => {
    const val = parseResolutionTimeToHours(null, item.created_at, item.updated_at)
    addValue(item.created_at, val, 'qddr')
  })

  return Object.entries(months)
    .map(([month, data]) => {
      const ncrAvg = data.ncrCount > 0 ? Number((data.ncrSum / data.ncrCount).toFixed(1)) : null
      const carAvg = data.carCount > 0 ? Number((data.carSum / data.carCount).toFixed(1)) : null
      const qddrAvg = data.qddrCount > 0 ? Number((data.qddrSum / data.qddrCount).toFixed(1)) : null
      return {
        month,
        NCR: ncrAvg,
        CAR: carAvg,
        QDDR: qddrAvg,
        rawDate: data.rawDate
      }
    })
    .sort((a, b) => a.rawDate - b.rawDate)
}

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
          <p style={{ margin: '4px 0 0 0', color: '#475569', fontSize: '11px' }}>
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
  const [metrics, setMetrics] = useState(null)
  const [complianceStats, setComplianceStats] = useState([])
  const [trends, setTrends] = useState([])
  const [resolutionTrend, setResolutionTrend] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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

        // Fetch closed reports for resolution time analytics
        const [closedNcrsRes, closedCarsRes, closedQddrsRes] = await Promise.all([
          supabase
            .from('ncr_reports')
            .select('created_at, resolution_time')
            .eq('status', 'CLOSED'),
          supabase
            .from('car_reports')
            .select('created_at, request_date, resolution_time, verification_date, updated_at')
            .eq('status', 'closed'),
          supabase
            .from('qddr_reports')
            .select('created_at, updated_at')
            .eq('status', 'closed')
        ])

        const parsedTrends = groupResolutionTimesByMonth(
          closedNcrsRes.data || [],
          closedCarsRes.data || [],
          closedQddrsRes.data || []
        )
        setResolutionTrend(parsedTrends)

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
        <div className="metric-card" style={{
          background: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '100px',
          transition: 'transform 0.2s',
          cursor: 'default',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#000000' }}>Open Complaints</p>
            <AlertCircle size={18} color="#0f172a" />
          </div>
          <h3 style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
            {metrics?.openComplaints || 0}
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Active NCR and CAR processes</span>
        </div>

        <div className="metric-card" style={{
          background: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '100px',
          transition: 'transform 0.2s',
          cursor: 'default',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#000000' }}>ISO Compliance Rate</p>
            <Shield size={18} color="#0f172a" />
          </div>
          <h3 style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
            {metrics?.isoCompliance || 100}%
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Average across all standards</span>
        </div>

        <div className="metric-card" style={{
          background: '#ffffff',
          border: '1px solid #e4e4e7',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '100px',
          transition: 'transform 0.2s',
          cursor: 'default',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#475569' }}>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#000000' }}>QDDR Defect Rate</p>
            <TrendingUp size={18} color="#0f172a" />
          </div>
          <h3 style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: 700, color: '#0f172a' }}>
            {metrics?.defectRate || 0.4}%
          </h3>
          <span style={{ fontSize: '11px', color: '#64748b' }}>Well within compliance margins</span>
        </div>
      </section>

      {/* Visual Analytics Section */}
      <section className="charts" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', margin: '4px 0 0 0' }}>Quality Analytics & Compliance</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Bar Chart - Compliance by ISO Standard */}
          <div className="chart-wrapper" style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '16px',
            boxSizing: 'border-box',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}>
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
          <div className="chart-wrapper" style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '16px',
            boxSizing: 'border-box',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}>
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
          <div className="chart-wrapper" style={{
            background: '#ffffff',
            border: '1px solid #e4e4e7',
            borderRadius: '12px',
            padding: '16px',
            boxSizing: 'border-box',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)'
          }}>
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

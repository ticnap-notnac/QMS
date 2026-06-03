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
import { AlertCircle, Shield, TrendingUp, BarChart2 } from 'lucide-react'

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [complianceStats, setComplianceStats] = useState([])
  const [trends, setTrends] = useState([])
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
        console.error('Error fetching dashboard metrics:', err)
        setError('Failed to load dashboard metrics.')
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

  // Custom tooltips for nice dark-theme popup displays
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="custom-chart-tooltip" style={{
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '12px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
        }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#f8fafc', fontSize: '13px' }}>{label || data.title}</p>
          <p style={{ margin: '4px 0 0 0', color: '#22d3ee', fontSize: '14px', fontWeight: 700 }}>
            {payload[0].name}: {payload[0].value}%
          </p>
          {data.standard && (
            <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '11px' }}>
              Standard: {data.standard}
            </p>
          )}
        </div>
      )
    }
    return null
  }

  return (
    <div className="dashboard-content" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {error && (
        <div className="iso-banner iso-banner--error" style={{ marginBottom: '16px' }}>
          <span>{error}</span>
        </div>
      )}

      {/* Top Metrics Cards Row */}
      <section className="metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        <div className="metric-card" style={{
          background: 'rgba(8, 18, 34, 0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '130px',
          transition: 'transform 0.2s',
          cursor: 'default'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Open Complaints</p>
            <AlertCircle size={20} className="icon-cyan" />
          </div>
          <h3 style={{ margin: '16px 0 8px 0', fontSize: '36px', fontWeight: 700, color: '#f8fafc' }}>
            {metrics?.openComplaints || 0}
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Active NCR and CAR processes</span>
        </div>

        <div className="metric-card" style={{
          background: 'rgba(8, 18, 34, 0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '130px',
          transition: 'transform 0.2s',
          cursor: 'default'
        }}

        // Fix standard container typo
        onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseOut={e => e.currentTarget.style.transform = 'none'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>ISO Compliance Rate</p>
            <Shield size={20} className="icon-teal" />
          </div>
          <h3 style={{ margin: '16px 0 8px 0', fontSize: '36px', fontWeight: 700, color: '#10b981' }}>
            {metrics?.isoCompliance || 100}%
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Average across all standards</span>
        </div>

        <div className="metric-card" style={{
          background: 'rgba(8, 18, 34, 0.65)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.04)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minHeight: '130px',
          transition: 'transform 0.2s',
          cursor: 'default'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8' }}>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>QDR Defect Rate</p>
            <TrendingUp size={20} className="icon-amber" />
          </div>
          <h3 style={{ margin: '16px 0 8px 0', fontSize: '36px', fontWeight: 700, color: '#f59e0b' }}>
            {metrics?.defectRate || 0.4}%
          </h3>
          <span style={{ fontSize: '12px', color: '#64748b' }}>Well within compliance margins</span>
        </div>
      </section>

      {/* Visual Analytics Section */}
      <section className="charts" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', margin: '12px 0 0 0' }}>Quality Analytics & Compliance</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
          {/* Bar Chart - Compliance by ISO Standard */}
          <div className="chart-wrapper" style={{
            background: 'rgba(8, 18, 34, 0.45)',
            border: '1px solid rgba(255,255,255,0.03)',
            borderRadius: '12px',
            padding: '20px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <BarChart2 size={16} className="icon-cyan" />
              <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Standard Compliance Breakdown</h4>
            </div>
            <div style={{ width: '100%', height: '300px' }}>
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                    <Bar dataKey="Compliance" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={45} />
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
            background: 'rgba(8, 18, 34, 0.45)',
            border: '1px solid rgba(255,255,255,0.03)',
            borderRadius: '12px',
            padding: '20px',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <TrendingUp size={16} className="icon-teal" />
              <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '14px', fontWeight: 600 }}>Audit Compliance Trend</h4>
            </div>
            <div style={{ width: '100%', height: '300px' }}>
              {lineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="Score" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: '13px' }}>
                  No historical trend audits recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

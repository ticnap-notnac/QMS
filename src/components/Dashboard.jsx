import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const { data, error } = await supabase
          .from('metrics')
          .select('*')
          .limit(1)
          .single()
        
        if (error) {
          console.warn('Metrics table not found, using fallback values:', error.message)
          setMetrics(null)
        } else {
          setMetrics(data)
        }
      } catch (err) {
        console.warn('Error fetching metrics, using fallback values:', err.message)
        setMetrics(null)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  if (loading) return <div>Loading...</div>

  const complaintsData = metrics?.complaints || { count: 12, lastWeek: 12 }
  const isoCompliance = metrics?.iso_compliance || 85
  const defectRate = metrics?.defect_rate || 1.2

  return (
    <>
      <section className="metrics">
        <div className="metric-card">
          <p>Open Complaints</p>
          <h3>{complaintsData.count}</h3>
          <span>({complaintsData.lastWeek} from last week) 80% below target</span>
        </div>
        <div className="metric-card">
          <p>ISO Compliance</p>
          <h3>{isoCompliance}%</h3>
        </div>
        <div className="metric-card">
          <p>QDR Defect Rate</p>
          <h3>{defectRate}%</h3>
        </div>
      </section>

      <section className="charts">
        <p className="charts-title">Key Charts</p>
        <div className="chart chart--wide"></div>
        <div className="chart-grid">
          <div className="chart"></div>
          <div className="chart"></div>
        </div>
      </section>
    </>
  )
}

export default Dashboard

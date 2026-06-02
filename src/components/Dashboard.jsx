import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'

function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch open NCR count
        const { count: ncrCount } = await supabase
          .from('ncr_reports')
          .select('id', { count: 'exact', head: true })
          .neq('status', 'CLOSED')

        // Fetch open CAR count
        const { count: carCount } = await supabase
          .from('car_reports')
          .select('id', { count: 'exact', head: true })
          .not('status', 'ilike', 'closed')

        setMetrics({
          complaints: { count: (ncrCount || 0) + (carCount || 0), lastWeek: 2 },
          iso_compliance: 94,
          defect_rate: 0.6
        })
      } catch (err) {
        console.warn('Error fetching metrics dynamically:', err.message)
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

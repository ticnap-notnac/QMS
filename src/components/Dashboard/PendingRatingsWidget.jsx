import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import StarRating from '../UI/StarRating'
import { rateReport } from '@/services/ncrService'
import { CheckCircle } from 'lucide-react'

export default function PendingRatingsWidget({ currentUserId, userRole, userDepartmentId }) {
  const [pendingReports, setPendingReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [ratingError, setRatingError] = useState(null)
  const [submittingId, setSubmittingId] = useState(null)
  const [successId, setSuccessId] = useState(null)

  useEffect(() => {
    if (!currentUserId || !userRole) {
      setLoading(false)
      return
    }

    const fetchPendingRatings = async () => {
      try {
        const normalizedRole = String(userRole).toLowerCase().trim()
        const isAuditorOrAdmin = normalizedRole === 'auditor' || normalizedRole === 'admin'
        
        let query = supabase
          .from('ncr_reports')
          .select('id, reference_no, description, corrective_action, department_id, reported_by')
          .eq('status', 'CLOSED')

        if (!isAuditorOrAdmin) {
          // If not auditor/admin, must be in the same department
          if (userDepartmentId) {
            query = query.eq('department_id', userDepartmentId)
          } else {
            // Fallback just in case: only show their own reported ones if no dept
            query = query.eq('reported_by', currentUserId)
          }
        }

        const { data: reports, error: reportsErr } = await query

        if (reportsErr) {
          console.warn('Failed to fetch reports with reported_by', reportsErr)
        }

        if (!reports || reports.length === 0) {
          setLoading(false)
          return
        }

        const reportIds = reports.map(r => r.id)

        // Find which of these reports the user has ALREADY rated
        const { data: ratings, error: ratingsErr } = await supabase
          .from('ncr_ratings')
          .select('report_id')
          .eq('user_id', currentUserId)
          .in('report_id', reportIds)

        const ratedIds = new Set((ratings || []).map(r => r.report_id))

        // The ones left are pending!
        const pending = reports.filter(r => !ratedIds.has(r.id))
        setPendingReports(pending)
      } catch (err) {
        console.error('Error fetching pending ratings for widget:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPendingRatings()
  }, [currentUserId])

  const handleRate = async (report, ratingValue) => {
    setRatingError(null)
    setSubmittingId(report.id)
    try {
      await rateReport(report.id, ratingValue)
      
      // Show success state briefly before sliding it away
      setSuccessId(report.id)
      setTimeout(() => {
        setPendingReports(prev => prev.filter(r => r.id !== report.id))
        setSuccessId(null)
        setSubmittingId(null)
      }, 800)

    } catch (err) {
      setRatingError(err.message || 'Failed to submit rating')
      setSubmittingId(null)
    }
  }

  if (loading || pendingReports.length === 0) return null

  // ONLY show one at a time (the first one)
  const currentReport = pendingReports[0]
  const isSuccess = successId === currentReport.id
  const isSubmitting = submittingId === currentReport.id

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(13,148,136,0.1) 100%)',
      border: '1px solid rgba(34,211,238,0.2)',
      borderRadius: '8px',
      padding: '16px',
      marginBottom: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      transition: 'all 0.4s ease-in-out',
      opacity: isSuccess ? 0 : 1,
      transform: isSuccess ? 'translateY(-10px)' : 'translateY(0)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>👋</span>
          Your feedback is requested!
        </h3>
        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
          {pendingReports.length} pending
        </span>
      </div>

      <div style={{ background: '#fff', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 'bold' }}>{currentReport.reference_no}</div>
        <div style={{ fontSize: '13px', color: '#334155' }}>
          <strong>Issue:</strong> {currentReport.description}
        </div>
        {currentReport.corrective_action && (
          <div style={{ fontSize: '13px', color: '#334155' }}>
            <strong>Corrective Action Taken:</strong> {currentReport.corrective_action}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px' }}>
        <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>
          How effective was this fix?
        </span>
        <div style={{ pointerEvents: isSubmitting || isSuccess ? 'none' : 'auto', opacity: isSubmitting ? 0.6 : 1 }}>
          <StarRating
            rating={0}
            onRatingChange={(val) => handleRate(currentReport, val)}
            readOnly={false}
          />
        </div>
        {isSubmitting && !isSuccess && <span style={{ fontSize: '12px', color: '#64748b' }}>Submitting...</span>}
        {isSuccess && <span style={{ fontSize: '12px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={14}/> Thanks!</span>}
        {ratingError && <span style={{ fontSize: '12px', color: '#ef4444' }}>{ratingError}</span>}
      </div>
    </div>
  )
}

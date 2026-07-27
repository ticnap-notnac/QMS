import { useEffect, useState } from 'react'
import { fetchLogs, recordLogRead } from '@/services/logService'
import Toast from '@/components/UI/Toast'
import { Filter } from 'lucide-react'

export default function SystemLogsPanel({ onClose, searchQuery = '' }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)
  
  const [showFilter, setShowFilter] = useState(false)
  const [levelFilter, setLevelFilter] = useState('')

  // ⚓ Set a larger batch limit since we are using a continuous scroll box now
  const [limit] = useState(200) 

  const load = async (opts = {}) => {
    setLoading(true)
    setToast(null)
    try {
      // Pull directly from offset 0 to feed the continuous scrolling grid view
      const offset = 0 
      const res = await fetchLogs({ 
        limit: opts.limit ?? limit, 
        offset, 
        filters: opts.filters || {} 
      })
      setLogs(res.data || [])

      // record that the current user viewed logs
      try { await recordLogRead({ query: null, count: res.count || (res.data || []).length }) } catch (e) { }
    } catch (err) {
      setToast({ message: 'We could not load the system logs. Please try again.', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => load())
  }, [])

  const filteredLogs = logs.filter((l) => {
    if (levelFilter && l.level !== levelFilter) return false
    
    const q = (searchQuery || '').trim().toLowerCase()
    if (!q) return true
    
    const actionStr = typeof l.action === 'string' ? l.action : JSON.stringify(l.action || l.details || l.metadata)
    return (
      actionStr.toLowerCase().includes(q) ||
      (l.level && l.level.toLowerCase().includes(q)) ||
      (l.source && l.source.toLowerCase().includes(q)) ||
      (l.user_display && l.user_display.toLowerCase().includes(q)) ||
      (l.user_auth_id && l.user_auth_id.toLowerCase().includes(q))
    )
  })

  return (
    <div className="system-logs-panel">
      <div className="panel-header">
        <h3>System Logs</h3>
        <div className="panel-actions" style={{ position: 'relative' }}>
          <button onClick={() => load()} className="btn">Refresh</button>
          <button onClick={() => setShowFilter(!showFilter)} className="btn btn--ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} /> Filter
          </button>
          
          {showFilter && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '8px', background: 'white', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', zIndex: 10, minWidth: '150px' }}>
              <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#475569', textTransform: 'uppercase' }}>Filter by Level</div>
              <select 
                value={levelFilter} 
                onChange={(e) => setLevelFilter(e.target.value)}
                style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '13px' }}
              >
                <option value="">All Levels</option>
                <option value="audit">Audit</option>
                <option value="info">Info</option>
                <option value="warn">Warn</option>
                <option value="error">Error</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {!loading && !toast && (
        /* ── 📱 SAFE CONTAINED WRAPPER WINDOW ── */
        <div className="logs-table iso-table-wrap">
          <table className="iso-table system-logs-table">
            <thead>
              <tr>
                <th>When</th>
                <th>Level</th>
                <th>Source</th>
                <th>Action / Details</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.level}</td>
                  <td>{l.source || '-'}</td>
                  <td>
                    <div style={{ fontWeight: '500', color: '#0f172a' }}>
                      {typeof l.action === 'string' ? l.action : JSON.stringify(l.action)}
                    </div>
                    {(l.details || l.metadata) && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>
                        {JSON.stringify(l.details || l.metadata)}
                      </div>
                    )}
                  </td>
                  <td>{l.user_display || l.user_auth_id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* 🛑 PAGINATION ELEMENT SUCCESSFULLY REMOVED FROM HERE FOR CLEAN FEED GRID SCROLLING */}
        </div>
      )}
    </div>
  )
}
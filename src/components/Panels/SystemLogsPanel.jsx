import { useEffect, useState } from 'react'
import { fetchLogs, recordLogRead } from '@/services/logService'

export default function SystemLogsPanel({ onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  // ⚓ Set a larger batch limit since we are using a continuous scroll box now
  const [limit] = useState(200) 

  const load = async (opts = {}) => {
    setLoading(true)
    setError(null)
    try {
      // Pull directly from offset 0 to feed the continuous scrolling grid view
      const offset = 0 
      const res = await fetchLogs({ 
        limit: opts.limit ?? limit, 
        offset, 
        filters: opts.filters || (query ? { action: query } : {}) 
      })
      setLogs(res.data || [])

      // record that the current user viewed logs
      try { await recordLogRead({ query: query || null, count: res.count || (res.data || []).length }) } catch (e) { }
    } catch (err) {
      setError('We could not load the system logs. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => load())
  }, [])

  const handleSearch = async () => {
    await load({ filters: query ? { action: query } : {} })
  }

  return (
    <div className="system-logs-panel">
      <div className="panel-header">
        <h3>System Logs</h3>
        <div className="panel-actions">
          <input 
            type="text" 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            placeholder="Search action or text..." 
            className="admin-search-input" 
          />
          <button onClick={handleSearch} className="btn">Search</button>
          <button onClick={() => load()} className="btn">Refresh</button>
          <button onClick={onClose} className="btn btn--ghost">Close</button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        /* ── 📱 SAFE CONTAINED WRAPPER WINDOW ── */
        <div className="logs-table iso-table-wrap">
          <table className="iso-table system-logs-table">
            <thead>
              <tr>
                <th style={{ width: '18%' }}>When</th>
                <th style={{ width: '10%' }}>Level</th>
                <th style={{ width: '12%' }}>Source</th>
                <th style={{ width: '45%' }}>Action / Details</th>
                <th style={{ width: '15%' }}>User</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.level}</td>
                  <td>{l.source || '-'}</td>
                  <td>
                    {typeof l.action === 'string' ? l.action : JSON.stringify(l.action || l.details || l.metadata)}
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
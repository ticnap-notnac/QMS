import { useEffect, useState } from 'react'
import { fetchLogs, recordLogRead } from '@/controllers/logController'

export default function SystemLogsPanel({ onClose }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(20)
  const [total, setTotal] = useState(0)
  const [query, setQuery] = useState('')

  const load = async (opts = {}) => {
    setLoading(true)
    setError(null)
    try {
      const offset = (opts.page ?? page) * (opts.limit ?? limit)
      const res = await fetchLogs({ limit: opts.limit ?? limit, offset, filters: opts.filters || (query ? { action: query } : {}) })
      setLogs(res.data || [])
      setTotal(res.count || 0)

      // record that the current user viewed logs
      try { await recordLogRead({ query: query || null, count: res.count || (res.data || []).length }) } catch (e) { }
    } catch (err) {
      setError(err?.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load({ page: 0 }) }, [])

  const handleSearch = async () => {
    setPage(0)
    await load({ page: 0, filters: query ? { action: query } : {} })
  }


  const totalPages = Math.max(1, Math.ceil((total || logs.length) / limit))

  return (
    <div className="system-logs-panel">
      <div className="panel-header">
        <h3>System Logs</h3>
        <div className="panel-actions">
          <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search action or text..." className="admin-search-input" />
          <button onClick={handleSearch} className="btn">Search</button>
          <button onClick={() => load({ page: 0 })} className="btn">Refresh</button>
          <button onClick={onClose} className="btn btn--ghost">Close</button>
        </div>
      </div>

      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}

      {!loading && !error && (
        <div className="logs-table">
          <table>
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
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{new Date(l.created_at).toLocaleString()}</td>
                  <td>{l.level}</td>
                  <td>{l.source || '-'}</td>
                  <td style={{maxWidth:400,overflow:'hidden',textOverflow:'ellipsis'}}>{typeof l.action === 'string' ? l.action : JSON.stringify(l.action || l.details || l.metadata)}</td>
                  <td>{l.user_auth_id || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination">
            <button onClick={() => { if (page>0) { setPage(p=>p-1); load({ page: page-1 }) } }} disabled={page===0}>Prev</button>
            <span>Page {page+1} / {totalPages}</span>
            <button onClick={() => { if (page < totalPages-1) { setPage(p=>p+1); load({ page: page+1 }) } }} disabled={page >= totalPages-1}>Next</button>
          </div>
        </div>
      )}
    </div>
  )
}

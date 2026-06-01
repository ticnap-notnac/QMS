import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar.jsx'
import { Folder, FileText, Search, ArrowLeft } from 'lucide-react'
import './DCCPage.css'
import './PagesStyles.css'
import SystemLogsPanel from '../components/SystemLogsPanel.jsx'
import { supabase } from '../utils/supabase'

export default function DCCPage({
  activePage,
  onPageChange,
  isUserMenuOpen,
  onToggleMenu,
  onLogout,
  isNotificationsOpen,
  onToggleNotifications,
  userRole,
  userName,
  userPosition,
  setIsAdminPanelOpen,
  setIsAuditToolsOpen,
  setProfileTargetTab,
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState(null)
  const folderItems = [
    { id: 'system_logs', label: 'System Logs' },
    { id: 'iso_modules', label: 'ISO Modules' },
  ]

  const [standards, setStandards] = useState([])
  const [loadingStandards, setLoadingStandards] = useState(false)
  const [clauses, setClauses] = useState([])
  const [loadingClauses, setLoadingClauses] = useState(false)
  const [selectedStandard, setSelectedStandard] = useState(null)

  const [recentlyViewed, setRecentlyViewed] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('dcc_recently_viewed')
      if (raw) setRecentlyViewed(JSON.parse(raw))
    } catch (e) {
      // ignore
    }
  }, [])

  useEffect(() => {
    // when user opens ISO Modules, load active standards
    if (selectedFolder?.id === 'iso_modules') {
      loadActiveStandards()
    }
  }, [selectedFolder])

  function saveRecentlyViewed(list) {
    try {
      localStorage.setItem('dcc_recently_viewed', JSON.stringify(list))
    } catch (e) {}
  }

  function addRecentlyViewed(item) {
    const entry = { id: item.id, label: item.label, path: item.path || null, when: new Date().toISOString() }
    setRecentlyViewed((prev) => {
      const deduped = [entry].concat(prev.filter((p) => p.id !== entry.id)).slice(0, 10)
      saveRecentlyViewed(deduped)
      return deduped
    })
  }

  function openFolder(item) {
    setSelectedFolder(item)
    addRecentlyViewed(item)
  }

  async function loadActiveStandards() {
    setLoadingStandards(true)
    try {
      const { data, error } = await supabase
        .from('iso_standards')
        .select('id, name, version')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      const enriched = await Promise.all((data || []).map(async (s) => {
        const { data: groups } = await supabase
          .from('iso_clause_groups')
          .select('id')
          .eq('standard_id', s.id)

        const groupIds = (groups || []).map(g => g.id)
        let clauseCount = 0
        if (groupIds.length) {
          const { count } = await supabase
            .from('iso_clauses')
            .select('id', { count: 'exact', head: true })
            .in('group_id', groupIds)

          clauseCount = count || 0
        }

        return { ...s, clauseCount }
      }))

      setStandards(enriched)
    } catch (e) {
      console.error('Failed to load ISO standards:', e?.message || e)
      setStandards([])
    } finally {
      setLoadingStandards(false)
    }
  }

  async function loadClausesForStandard(standardId) {
    setLoadingClauses(true)
    try {
      // First, fetch clause groups for the standard
      const { data: groups, error: groupsError } = await supabase
        .from('iso_clause_groups')
        .select('id')
        .eq('standard_id', standardId)

      if (groupsError) throw groupsError

      const groupIds = (groups || []).map(g => g.id)

      if (groupIds.length === 0) {
        setClauses([])
        return
      }

      // Then fetch all clauses whose group_id is in the group's ids (no is_active filter)
      const { data: clausesData, error: clausesError } = await supabase
        .from('iso_clauses')
        .select('id, clause_number, title, description, is_active, group_id')
        .in('group_id', groupIds)
        .order('clause_number', { ascending: true })

      if (clausesError) throw clausesError

      // Client-side numeric-aware sort for `clause_number` (handles '4.10' > '4.2')
      const sortedClauses = (clausesData || []).slice().sort((a, b) => {
        const parseParts = (s) => (s ? s.split('.').map(p => {
          const n = parseInt(p, 10)
          return Number.isNaN(n) ? 0 : n
        }) : [0])

        const pa = parseParts(a?.clause_number)
        const pb = parseParts(b?.clause_number)

        for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
          const na = pa[i] ?? 0
          const nb = pb[i] ?? 0
          if (na !== nb) return na - nb
        }

        // Fallback to locale compare if numerically identical
        return (a?.clause_number || '').localeCompare(b?.clause_number || '', undefined, { numeric: true })
      })

      setClauses(sortedClauses)
    } catch (e) {
      console.error('Failed to load clauses:', e?.message || e)
      setClauses([])
    } finally {
      setLoadingClauses(false)
    }
  }

  // Build folder content outside JSX
  let folderContent = null
  if (!selectedFolder) {
    folderContent = (
      <div className="flex-column">
        <div className="search-container-centered">
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search documents or folders..." className="search-bar-field" />
          <Search size={16} className="search-icon-absolute" />
        </div>

        <div className="folder-grid">
          {folderItems.map((item) => (
            <div key={item.id} onClick={() => openFolder(item)} className="folder-item">
              <div className="folder-square-block"><Folder size={22} className="icon-fill-soft" /></div>
              <span className="folder-item-label">{item.label}</span>
            </div>
          ))}
        </div>

        <div className="text-left">
          <h3 className="recently-viewed-heading">Recently Viewed</h3>
          {recentlyViewed.length === 0 ? (
            <div className="recent-empty">No recently viewed items.</div>
          ) : (
            recentlyViewed.map(rv => (
              <div key={rv.id} className="recent-document-card dcc-recent-document-card" onClick={() => openFolder({ id: rv.id, label: rv.label })}>
                <FileText size={18} className="icon-green" />
                <div className="col-gap-2">
                  <span className="recent-doc-title">{rv.label}</span>
                  <span className="recent-doc-sub">{new Date(rv.when).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  } else {
    folderContent = (
      <div className="flex-column full-height">
        <div className="top-row">
          <button onClick={() => setSelectedFolder(null)} className="back-button"><ArrowLeft size={18} /></button>
          <div className="search-container-centered">
            <input type="text" placeholder={`Search ${selectedFolder.label}...`} className="search-bar-field" />
            <Search size={16} className="search-icon-absolute" />
          </div>
        </div>

        {selectedFolder.id === 'system_logs' ? (
          userRole === 'admin' ? (
            <div className="row-gap-40">
              <div className="glass-card-dcc system-logs-wrapper">
                <SystemLogsPanel onClose={() => setSelectedFolder(null)} />
              </div>
            </div>
          ) : (
            <div className="empty-state">You do not have permission to view System Logs.</div>
          )
        ) : selectedFolder.id === 'iso_modules' ? (
          <div className="row-gap-40">
            {!selectedStandard ? (
              <div>
                <h3 className="recently-viewed-heading">ISO Modules</h3>
                {loadingStandards ? (
                  <div>Loading standards...</div>
                ) : standards.length === 0 ? (
                  <div className="empty-state">No active ISO standards found.</div>
                ) : (
                  <div className="folder-grid">
                    {standards.map(s => (
                      <div key={s.id} className="folder-item folder-item-iso" onClick={async () => { setSelectedStandard(s); await loadClausesForStandard(s.id) }}>
                        <div className="folder-square-block"><Folder size={22} className="icon-fill-soft" /></div>
                        <div>
                          <div className="folder-item-label">{s.name} {s.version ? `- ${s.version}` : ''}</div>
                          <div className="recent-doc-sub">{s.clauseCount || 0} clauses</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-column full-height">

                <div className="row-gap-20">
                  <div className="breadcrumb">ISO Modules &gt; {selectedStandard.name} - {selectedStandard.version || '-'}</div>

                  {loadingClauses ? (
                    <div>Loading clauses...</div>
                  ) : clauses.length === 0 ? (
                    <div className="empty-state">No clauses found for this standard.</div>
                  ) : (
                    <div className="glass-card-dcc">
                      <table className="iso-table" style={{ width: '100%' }}>
                        <thead>
                          <tr>
                            <th>Clause</th>
                            <th>Title</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {clauses.map(cl => (
                            <tr key={cl.id} className={cl.is_active ? '' : 'muted-row'}>
                              <td style={{ width: '120px' }}>{cl.clause_number}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <div>{cl.title}</div>
                                </div>
                                <div className="clause-description">
                                  {cl.description ? cl.description : <span className="muted">No description added</span>}
                                </div>
                              </td>
                              <td style={{ width: '120px' }}>
                                {!cl.is_active ? <span className="iso-status-pill is-inactive">Inactive</span> : null}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="row-gap-40">
            <div className="empty-state">This folder is empty or has no preview. Use the search or upload documents.</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="dcc-root">
      
      {/* --- CALLS THE UNIFIED, CLEAN REPOSITORIES NAVBAR --- */}
      <Navbar
        activePage={activePage}
        onPageChange={onPageChange}
        isUserMenuOpen={isUserMenuOpen}
        onToggleMenu={onToggleMenu}
        onLogout={onLogout}
        isNotificationsOpen={isNotificationsOpen}
        onToggleNotifications={onToggleNotifications}
        userRole={userRole}
        userName={userName}
        userPosition={userPosition}
        setIsAdminPanelOpen={setIsAdminPanelOpen}
        setIsAuditToolsOpen={setIsAuditToolsOpen}
        setProfileTargetTab={setProfileTargetTab}
      />

      {/* --- CENTRAL MAIN CANVAS MATRIX --- */}
      <div className="dcc-main-wrapper">
        <div className="glass-card-dcc">
          {folderContent}
        </div>
      </div>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  PlusCircle,
  Save,
  Trash2,
  List,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import SettingsNavbar from '@/components/SettingsNavbar'
import AdminNavbar from '@/components/AdminNavbar'
import Toast from '@/components/Toast'
import { logAction } from '@/services/logService'
import { supabase as sharedSupabase } from '@/utils/supabase'
import './ISOStandardsPage.css'
const initialStandardForm = {
  name: '',
  description: '',
  version: '',
}
const initialClauseForm = {
  clauseNumber: '',
  title: '',
  description: '',
}
const stripQuotes = (value) => value.replace(/['\"]/g, '').trim()
export default function ISOStandardsPage({
  userRole,
  userName,
  userPosition,
  supabaseUrl,
  supabaseAnonKey,
  currentUserId,
}) {
  const supabaseClient = useMemo(() => {
    const resolvedUrl = stripQuotes(supabaseUrl || import.meta.env.VITE_SUPABASE_URL || '')
    const resolvedKey = stripQuotes(
      supabaseAnonKey || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
    )
    if (resolvedUrl && resolvedKey) {
      return createClient(resolvedUrl, resolvedKey)
    }
    return sharedSupabase
  }, [supabaseAnonKey, supabaseUrl])
  const [toast, setToast] = useState(null)
  const [activeSection, setActiveSection] = useState('Add Standard')
  const [clauseMode, setClauseMode] = useState('single')
  const [standards, setStandards] = useState([])
  const [loadingStandards, setLoadingStandards] = useState(true)
  const [standardsError, setStandardsError] = useState('')
  const [standardForm, setStandardForm] = useState(initialStandardForm)
  const [clauseForm, setClauseForm] = useState(initialClauseForm)
  const [bulkPaste, setBulkPaste] = useState('')
  const [selectedStandardId, setSelectedStandardId] = useState('')
  const [savingStandard, setSavingStandard] = useState(false)
  const [savingClause, setSavingClause] = useState(false)
  const [standardError, setStandardError] = useState('')
  const [clauseError, setClauseError] = useState('')
  const [bulkSavedCount, setBulkSavedCount] = useState(null)
  const [toggleError, setToggleError] = useState('')
  const [updatingStandardIds, setUpdatingStandardIds] = useState({})
  const [deletingStandardIds, setDeletingStandardIds] = useState({})
  const [updatedStandardId, setUpdatedStandardId] = useState('')
  const [clauses, setClauses] = useState([])
  const [loadingClauses, setLoadingClauses] = useState(false)
  const [deletingClauseIds, setDeletingClauseIds] = useState({})
  const getCurrentAuthId = async () => {
    try {
      const { data } = await supabaseClient.auth.getUser()
      return data?.user?.id || null
    } catch (error) {
      return null
    }
  }
  const logIsoActivity = async (action, details = {}) => {
    await logAction({
      level: 'audit',
      source: 'iso_standards',
      action,
      details: {
        ...details,
        actor: userName || null,
      },
    })
  }
  useEffect(() => {
    const timer = updatedStandardId
      ? window.setTimeout(() => setUpdatedStandardId(''), 1800)
      : null
    return () => {
      if (timer) window.clearTimeout(timer)
    }
  }, [updatedStandardId])
  useEffect(() => {
    const loadStandards = async () => {
      setLoadingStandards(true)
      setStandardsError('')
      try {
        const { data, error } = await supabaseClient
          .from('iso_standards')
          .select('id, name, description, version, is_active, created_at')
          .order('created_at', { ascending: false })
        if (error) throw new Error(error.message)
        setStandards(data || [])
        setSelectedStandardId((current) => current || data?.[0]?.id || '')
      } catch (error) {
        setStandardsError(error.message || 'Failed to load ISO standards.')
      } finally {
        setLoadingStandards(false)
      }
    }
    loadStandards()
  }, [supabaseClient])
  useEffect(() => {
    if (selectedStandardId && standards.some((standard) => standard.id === selectedStandardId)) return
    setSelectedStandardId(standards[0]?.id || '')
  }, [selectedStandardId, standards])
  const refreshStandards = async () => {
    const { data, error } = await supabaseClient
      .from('iso_standards')
      .select('id, name, description, version, is_active, created_at')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    setStandards(data || [])
    setSelectedStandardId((current) => current || data?.[0]?.id || '')
  }
  const loadClausesForStandard = async (standardId) => {
    setLoadingClauses(true)
    try {
      const { data: groups, error: groupError } = await supabaseClient
        .from('iso_clause_groups')
        .select('id')
        .eq('standard_id', standardId)

      if (groupError) throw new Error(groupError.message)
      if (!groups || groups.length === 0) {
        setClauses([])
        return
      }

      const groupIds = groups.map(g => g.id)
      const { data: clausesData, error: clausesError } = await supabaseClient
        .from('iso_clauses')
        .select('*')
        .in('group_id', groupIds)

      if (clausesError) throw new Error(clausesError.message)

      const sorted = (clausesData || []).sort((a, b) => a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true }))
      setClauses(sorted)
    } catch (err) {
      console.error(err)
      setToast({ message: 'Failed to load clauses.', type: 'error' })
    } finally {
      setLoadingClauses(false)
    }
  }
  useEffect(() => {
    if (activeSection === 'Manage Clauses' && selectedStandardId) {
      loadClausesForStandard(selectedStandardId)
    }
  }, [activeSection, selectedStandardId, supabaseClient])
  const handleDeleteClause = async (clause) => {
    const confirmed = window.confirm(`Are you sure you want to delete clause ${clause.clause_number}?`)
    if (!confirmed) return
    setDeletingClauseIds(prev => ({ ...prev, [clause.id]: true }))
    try {
      const { error } = await supabaseClient
        .from('iso_clauses')
        .delete()
        .eq('id', clause.id)

      if (error) throw new Error(error.message)

      setClauses(current => current.filter(c => c.id !== clause.id))
      setToast({ message: `Clause ${clause.clause_number} deleted.`, type: 'success' })
      await logIsoActivity('DELETE_ISO_CLAUSE', { clause_number: clause.clause_number, title: clause.title })
    } catch (err) {
      console.error(err)
      setToast({ message: 'Failed to delete clause.', type: 'error' })
    } finally {
      setDeletingClauseIds(prev => ({ ...prev, [clause.id]: false }))
    }
  }
  const ensureClauseGroup = async (standardId) => {
    const { data: existingGroup, error: groupError } = await supabaseClient
      .from('iso_clause_groups')
      .select('id, title, group_number')
      .eq('standard_id', standardId)
      .order('group_number', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (groupError) throw new Error(groupError.message)
    if (existingGroup?.id) return existingGroup.id
    const standard = standards.find((item) => item.id === standardId)
    const { data: createdGroup, error: createGroupError } = await supabaseClient
      .from('iso_clause_groups')
      .insert({
        standard_id: standardId,
        group_number: '1',
        title: standard?.name ? `${standard.name} Clauses` : 'Clauses',
      })
      .select('id')
      .single()
    if (createGroupError) throw new Error(createGroupError.message)
    return createdGroup.id
  }
  const handleStandardSubmit = async (event) => {
    event.preventDefault()
    const name = standardForm.name.trim()
    const version = standardForm.version.trim()
    if (!name) {
      setStandardError('Name is required.')
      return
    }
    if (!version) {
      setStandardError('Version is required.')
      return
    }
    setSavingStandard(true)
    setStandardError('')
    try {
      const { error } = await supabaseClient
        .from('iso_standards')
        .insert({
          name,
          description: standardForm.description.trim() || null,
          version,
          is_active: true,
        })
        .select('id')
      if (error) throw new Error(error.message)
      await refreshStandards()
      await logIsoActivity('iso_standard_create', {
        name,
        version,
        description: standardForm.description.trim() || null,
      })
      setStandardForm(initialStandardForm)
      setToast({ message: 'ISO standard saved successfully.', type: 'success' })
    } catch (error) {
      setStandardError(error.message || 'Failed to save ISO standard.')
    } finally {
      setSavingStandard(false)
    }
  }
  const handleSingleClauseSubmit = async (event) => {
    event.preventDefault()
    setClauseError('')
    setBulkSavedCount(null)
    const clauseNumber = clauseForm.clauseNumber.trim()
    const title = clauseForm.title.trim()
    if (!selectedStandardId) {
      setClauseError('Select an ISO standard first.')
      return
    }
    if (!clauseNumber) {
      setClauseError('Clause number is required.')
      return
    }
    if (!title) {
      setClauseError('Title is required.')
      return
    }
    setSavingClause(true)
    try {
      const groupId = await ensureClauseGroup(selectedStandardId)
      const payload = {
        group_id: groupId,
        clause_number: clauseNumber,
        title,
        description: clauseForm.description.trim() || null,
        is_active: true,
      }
      // Attempt to find an existing clause for this group + clause number
      const { data: existing, error: findError } = await supabaseClient
        .from('iso_clauses')
        .select('id')
        .eq('group_id', groupId)
        .eq('clause_number', clauseNumber)
        .maybeSingle()
      if (findError) throw new Error(findError.message)
      if (existing?.id) {
        // Update the existing clause
        const { error: updateError } = await supabaseClient
          .from('iso_clauses')
          .update({ title: payload.title, description: payload.description, is_active: payload.is_active })
          .eq('id', existing.id)
          .select('id')
        if (updateError) throw new Error(updateError.message)
      } else {
        // Insert a new clause
        const { error: insertError } = await supabaseClient
          .from('iso_clauses')
          .insert(payload)
          .select('id')
        if (insertError) throw new Error(insertError.message)
        await logIsoActivity('iso_clause_create', {
          standardId: selectedStandardId,
          clauseNumber,
          title,
          description: clauseForm.description.trim() || null,
        })
      }
      setClauseForm(initialClauseForm)
      setToast({ message: 'Clause saved successfully.', type: 'success' })
    } catch (error) {
      setClauseError(error.message || 'Failed to save clause.')
    } finally {
      setSavingClause(false)
    }
  }
  const handleBulkSubmit = async (event) => {
    event.preventDefault()
    setClauseError('')
    setBulkSavedCount(null)
    if (!selectedStandardId) {
      setClauseError('Select an ISO standard first.')
      return
    }
    const lines = bulkPaste
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (!lines.length) {
      setClauseError('Paste at least one clause line.')
      return
    }
    const parsedRows = []
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index]
      const separatorIndex = line.indexOf(' ')
      if (separatorIndex === -1) {
        setClauseError(`Line ${index + 1} must include a clause number and title.`)
        return
      }
      const clauseNumber = line.slice(0, separatorIndex).trim()
      const title = line.slice(separatorIndex + 1).trim()
      if (!clauseNumber || !title) {
        setClauseError(`Line ${index + 1} is missing a clause number or title.`)
        return
      }
      parsedRows.push({ clause_number: clauseNumber, title })
    }
    setSavingClause(true)
    try {
      const groupId = await ensureClauseGroup(selectedStandardId)
      const payload = parsedRows.map((row) => ({
        id: crypto.randomUUID(),
        group_id: groupId,
        clause_number: row.clause_number,
        title: row.title,
        description: null,
        is_active: true,
      }))
      const { data, error } = await supabaseClient
        .from('iso_clauses')
        .upsert(payload, { onConflict: 'id' })
        .select('id')
      if (error) throw new Error(error.message)
      const savedCount = data?.length || payload.length
      await logIsoActivity('iso_clause_bulk_create', {
        standardId: selectedStandardId,
        count: savedCount,
        clauses: payload.map((row) => ({ clauseNumber: row.clause_number, title: row.title })),
      })
      setBulkPaste('')
      setBulkSavedCount(savedCount)
      setToast({ message: `${savedCount} clauses saved successfully.`, type: 'success' })
    } catch (error) {
      setClauseError(error.message || 'Failed to save clauses.')
    } finally {
      setSavingClause(false)
    }
  }
  const handleToggleStandard = async (standard) => {
    const nextValue = !standard.is_active
    setToggleError('')
    setUpdatingStandardIds((current) => ({ ...current, [standard.id]: true }))
    try {
      const { error } = await supabaseClient
        .from('iso_standards')
        .update({ is_active: nextValue })
        .eq('id', standard.id)
      if (error) throw new Error(error.message)
      setStandards((current) => current.map((item) => (
        item.id === standard.id ? { ...item, is_active: nextValue } : item
      )))
      setUpdatedStandardId(standard.id)
    } catch (error) {
      setToggleError(error.message || 'Failed to update ISO standard.')
    } finally {
      setUpdatingStandardIds((current) => ({ ...current, [standard.id]: false }))
    }
  }
  const handleDeleteStandard = async (standard) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${standard.name}? This will also delete all associated clauses and cannot be undone.`
    )
    if (!confirmed) {
      return
    }
    setToggleError('')
    setDeletingStandardIds((current) => ({ ...current, [standard.id]: true }))
    try {
      const { error } = await supabaseClient
        .from('iso_standards')
        .delete()
        .eq('id', standard.id)
      if (error) {
        console.error('Delete error:', error)
        throw new Error(error.message)
      }
      const standardLabel = `${standard.name}${standard.version ? ` - ${standard.version}` : ''}`
      const performedBy = await getCurrentAuthId()
      await logIsoActivity('DELETE_ISO_STANDARD', {
        entity_type: 'iso_standard',
        entity_id: standard.id,
        entity_name: standardLabel,
        performed_by: performedBy,
        timestamp: new Date().toISOString(),
        details: `Deleted ISO standard '${standardLabel}' along with all associated clause groups and clauses.`,
      })
      await refreshStandards()
      setToast({ message: `${standard.name} has been deleted.`, type: 'success' })
    } catch (error) {
      console.error('Failed to delete standard:', error)
      setToast({ message: 'Failed to delete standard.', type: 'error' })
    } finally {
      setDeletingStandardIds((current) => ({ ...current, [standard.id]: false }))
    }
  }
  const activeTab = 'ISO Standards'
  return (
    <div className="page-root">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {userRole === 'admin' ? (
        <main className="page-main-wide iso-standards-page">
          <h1 className="page-title">Admin - ISO Standards</h1>
          <SettingsNavbar userRole={userRole} />
          <div className="glass-card-rounded-bottom">
            <div className="admin-inner-panel iso-standards-panel">
              <div className="admin-top-row">
                <div className="admin-tabs-wrap">
                  <AdminNavbar activeTab={activeTab} />
                </div>
              </div>
              <div className="glass-card-content iso-standards-content">
                <div className="iso-section-tabs" role="tablist" aria-label="ISO standards sections">
                  <button
                    type="button"
                    className={`iso-section-tab ${activeSection === 'Add Standard' ? 'active' : ''}`}
                    onClick={() => setActiveSection('Add Standard')}
                  >
                    <PlusCircle size={16} />
                    Add Standard
                  </button>
                  <button
                    type="button"
                    className={`iso-section-tab ${activeSection === 'Add Clauses' ? 'active' : ''}`}
                    onClick={() => setActiveSection('Add Clauses')}
                  >
                    <Save size={16} />
                    Add Clauses
                  </button>
                  <button
                    type="button"
                    className={`iso-section-tab ${activeSection === 'Toggle Standards' ? 'active' : ''}`}
                    onClick={() => setActiveSection('Toggle Standards')}
                  >
                    <CheckCircle2 size={16} />
                    Toggle Standards
                  </button>
                  <button
                    type="button"
                    className={`iso-section-tab ${activeSection === 'Manage Clauses' ? 'active' : ''}`}
                    onClick={() => setActiveSection('Manage Clauses')}
                  >
                    <List size={16} />
                    Manage Clauses
                  </button>
                </div>
                {standardsError ? (
                  <div className="iso-banner iso-banner--error">
                    <AlertCircle size={16} />
                    <span>{standardsError}</span>
                  </div>
                ) : null}
                {activeSection === 'Add Standard' && (
                  <section className="iso-section-card">
                    <div className="iso-section-header">
                      <div>
                        <h2>Add Standard</h2>
                        <p>Create a new ISO standard record. It will be active immediately.</p>
                      </div>
                    </div>
                    <form className="iso-form" onSubmit={handleStandardSubmit}>
                      <div className="iso-grid iso-grid--3">
                        <div className="form-group iso-form-group">
                          <label htmlFor="iso-standard-name">Name</label>
                          <input
                            id="iso-standard-name"
                            type="text"
                            className="form-input iso-input"
                            value={standardForm.name}
                            onChange={(event) => setStandardForm((current) => ({ ...current, name: event.target.value }))}
                            placeholder="ISO 9001"
                          />
                        </div>
                        <div className="form-group iso-form-group">
                          <label htmlFor="iso-standard-version">Version</label>
                          <input
                            id="iso-standard-version"
                            type="text"
                            className="form-input iso-input"
                            value={standardForm.version}
                            onChange={(event) => setStandardForm((current) => ({ ...current, version: event.target.value }))}
                            placeholder="2015"
                          />
                        </div>
                        <div className="form-group iso-form-group iso-form-group--wide">
                          <label htmlFor="iso-standard-description">Description</label>
                          <input
                            id="iso-standard-description"
                            type="text"
                            className="form-input iso-input"
                            value={standardForm.description}
                            onChange={(event) => setStandardForm((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Quality management requirements"
                          />
                        </div>
                      </div>
                      {standardError ? <div className="iso-inline-message iso-inline-message--error">{standardError}</div> : null}
                      <div className="iso-actions-row">
                        <button type="submit" className="iso-primary-button" disabled={savingStandard}>
                          {savingStandard ? <LoaderCircle size={16} className="iso-spinner" /> : null}
                          {savingStandard ? 'Saving...' : 'Save Standard'}
                        </button>
                      </div>
                    </form>
                  </section>
                )}
                {activeSection === 'Add Clauses' && (
                  <section className="iso-section-card">
                    <div className="iso-section-header">
                      <div>
                        <h2>Add Clauses</h2>
                        <p>Choose single-clause entry or bulk paste for fast clause creation.</p>
                      </div>
                    </div>
                    <div className="iso-subtabs" role="tablist" aria-label="Clause entry modes">
                      <button
                        type="button"
                        className={`iso-subtab ${clauseMode === 'single' ? 'active' : ''}`}
                        onClick={() => setClauseMode('single')}
                      >
                        Single clause
                      </button>
                      <button
                        type="button"
                        className={`iso-subtab ${clauseMode === 'bulk' ? 'active' : ''}`}
                        onClick={() => setClauseMode('bulk')}
                      >
                        Bulk paste
                      </button>
                    </div>
                    <div className="form-group iso-form-group iso-standard-select-group">
                      <label htmlFor="iso-standard-select">ISO Standard</label>
                      <select
                        id="iso-standard-select"
                        className="form-input iso-input"
                        value={selectedStandardId}
                        onChange={(event) => setSelectedStandardId(event.target.value)}
                        disabled={loadingStandards || standards.length === 0}
                      >
                        <option value="">{loadingStandards ? 'Loading standards...' : 'Select a standard'}</option>
                        {standards.map((standard) => (
                          <option key={standard.id} value={standard.id}>
                            {standard.name} {standard.version ? `- ${standard.version}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    {clauseError ? <div className="iso-inline-message iso-inline-message--error">{clauseError}</div> : null}
                    {clauseMode === 'single' ? (
                      <form className="iso-form" onSubmit={handleSingleClauseSubmit}>
                        <div className="iso-grid iso-grid--3">
                          <div className="form-group iso-form-group">
                            <label htmlFor="iso-clause-number">Clause Number</label>
                            <input
                              id="iso-clause-number"
                              type="text"
                              className="form-input iso-input"
                              value={clauseForm.clauseNumber}
                              onChange={(event) => setClauseForm((current) => ({ ...current, clauseNumber: event.target.value }))}
                              placeholder="4.1"
                            />
                          </div>
                          <div className="form-group iso-form-group iso-form-group--wide">
                            <label htmlFor="iso-clause-title">Title</label>
                            <input
                              id="iso-clause-title"
                              type="text"
                              className="form-input iso-input"
                              value={clauseForm.title}
                              onChange={(event) => setClauseForm((current) => ({ ...current, title: event.target.value }))}
                              placeholder="Context of the Organization"
                            />
                          </div>
                        </div>
                        <div className="form-group iso-form-group">
                          <label htmlFor="iso-clause-description">Description</label>
                          <textarea
                            id="iso-clause-description"
                            className="form-input iso-input iso-textarea"
                            rows={4}
                            value={clauseForm.description}
                            onChange={(event) => setClauseForm((current) => ({ ...current, description: event.target.value }))}
                            placeholder="Optional clause description"
                          />
                        </div>
                        <div className="iso-actions-row">
                          <button type="submit" className="iso-primary-button" disabled={savingClause || loadingStandards}>
                            {savingClause ? <LoaderCircle size={16} className="iso-spinner" /> : null}
                            {savingClause ? 'Saving...' : 'Save Clause'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form className="iso-form" onSubmit={handleBulkSubmit}>
                        <div className="form-group iso-form-group">
                          <label htmlFor="iso-bulk-paste">Bulk Paste</label>
                          <textarea
                            id="iso-bulk-paste"
                            className="form-input iso-input iso-textarea iso-textarea--bulk"
                            rows={10}
                            value={bulkPaste}
                            onChange={(event) => setBulkPaste(event.target.value)}
                            placeholder={`4.1 Context of the Organization\n4.2 Understanding Needs of Interested Parties\n9.1 Monitoring, Measurement, Analysis`}
                          />
                          <p className="iso-help-text">Use one clause per line in the format: clause number, then a space, then the title.</p>
                        </div>
                        {bulkSavedCount !== null ? (
                          <div className="iso-inline-message iso-inline-message--success">
                            {bulkSavedCount} clauses saved.
                          </div>
                        ) : null}
                        <div className="iso-actions-row">
                          <button type="submit" className="iso-primary-button" disabled={savingClause || loadingStandards}>
                            {savingClause ? <LoaderCircle size={16} className="iso-spinner" /> : null}
                            {savingClause ? 'Saving...' : 'Save Clauses'}
                          </button>
                        </div>
                      </form>
                    )}
                  </section>
                )}
                {activeSection === 'Manage Clauses' && (
                  <section className="iso-section-card">
                    <div className="iso-section-header">
                      <div>
                        <h2>Manage Clauses</h2>
                        <p>View and delete clauses for a specific ISO standard.</p>
                      </div>
                    </div>
                    <div className="form-group iso-form-group iso-standard-select-group" style={{ marginBottom: '24px' }}>
                      <label htmlFor="iso-manage-standard-select">ISO Standard</label>
                      <select
                        id="iso-manage-standard-select"
                        className="form-input iso-input"
                        value={selectedStandardId}
                        onChange={(event) => setSelectedStandardId(event.target.value)}
                        disabled={loadingStandards || standards.length === 0}
                      >
                        <option value="">{loadingStandards ? 'Loading standards...' : 'Select a standard'}</option>
                        {standards.map((standard) => (
                          <option key={standard.id} value={standard.id}>
                            {standard.name} {standard.version ? `- ${standard.version}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="iso-table-wrap">
                      <table className="iso-table">
                        <thead>
                          <tr>
                            <th style={{ width: '15%' }}>Clause No.</th>
                            <th style={{ width: '65%' }}>Title</th>
                            <th style={{ width: '20%' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingClauses ? (
                            <tr><td colSpan={3} className="iso-empty-state">Loading clauses...</td></tr>
                          ) : clauses.length === 0 ? (
                            <tr><td colSpan={3} className="iso-empty-state">No clauses found for this standard.</td></tr>
                          ) : (
                            clauses.map(clause => {
                              const deleting = Boolean(deletingClauseIds[clause.id])
                              return (
                                <tr key={clause.id}>
                                  <td><strong>{clause.clause_number}</strong></td>
                                  <td>{clause.title}</td>
                                  <td>
                                    <button
                                      type="button"
                                      className="iso-delete-button"
                                      onClick={() => handleDeleteClause(clause)}
                                      disabled={deleting}
                                    >
                                      <Trash2 size={14} />
                                      {deleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
                {activeSection === 'Toggle Standards' && (
                  <section className="iso-section-card">
                    <div className="iso-section-header iso-section-header--tight">
                      <div>
                        <h2>Toggle Standards Active/Inactive</h2>
                        <p>Turn standards on or off without deleting the underlying record.</p>
                      </div>
                    </div>
                    {toggleError ? <div className="iso-inline-message iso-inline-message--error">{toggleError}</div> : null}
                    <div className="iso-table-wrap">
                      <table className="iso-table">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Version</th>
                            <th>Status</th>
                            <th>Toggle</th>
                            <th>Confirmation</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loadingStandards ? (
                            <tr>
                              <td colSpan={6} className="iso-empty-state">
                                Loading standards...
                              </td>
                            </tr>
                          ) : standards.length === 0 ? (
                            <tr>
                              <td colSpan={6} className="iso-empty-state">
                                No ISO standards have been created yet.
                              </td>
                            </tr>
                          ) : (
                            standards.map((standard) => {
                              const busy = Boolean(updatingStandardIds[standard.id])
                              const deleting = Boolean(deletingStandardIds[standard.id])
                              return (
                                <tr key={standard.id}>
                                  <td>
                                    <div className="iso-table-title">{standard.name}</div>
                                    {standard.description ? <div className="iso-table-subtext">{standard.description}</div> : null}
                                  </td>
                                  <td>{standard.version || '-'}</td>
                                  <td>
                                    <span className={`iso-status-pill ${standard.is_active ? 'is-active' : 'is-inactive'}`}>
                                      {standard.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className={`iso-toggle ${standard.is_active ? 'is-on' : 'is-off'}`}
                                      onClick={() => handleToggleStandard(standard)}
                                      disabled={busy}
                                      aria-pressed={standard.is_active}
                                      aria-label={`Toggle ${standard.name}`}
                                    >
                                      <span className="iso-toggle-track">
                                        <span className="iso-toggle-thumb" />
                                      </span>
                                      <span className="iso-toggle-text">{busy ? 'Saving...' : standard.is_active ? 'On' : 'Off'}</span>
                                    </button>
                                  </td>
                                  <td>
                                    {updatedStandardId === standard.id ? (
                                      <span className="iso-updated-note">
                                        <CheckCircle2 size={14} />
                                        Updated
                                      </span>
                                    ) : (
                                      <span className="iso-updated-note iso-updated-note--muted">Idle</span>
                                    )}
                                  </td>
                                  <td>
                                    <button
                                      type="button"
                                      className="iso-delete-button"
                                      onClick={() => handleDeleteStandard(standard)}
                                      disabled={busy || deleting}
                                      aria-label={`Delete ${standard.name}`}
                                    >
                                      <Trash2 size={14} />
                                      {deleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </main>
      ) : (
        <main className="page-main-centered">
          <h1 className="page-title">Access Denied</h1>
          <div className="access-denied-text">You don't have permission to access this page.</div>
        </main>
      )}
    </div>
  )
}

import { LoaderCircle, Trash2, CheckCircle2 } from 'lucide-react'

export function AddStandardSection({
  standardForm,
  setStandardForm,
  handleStandardSubmit,
  savingStandard,
  standardError
}) {
  return (
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
  )
}

export function AddClausesSection({
  clauseMode,
  setClauseMode,
  selectedStandardId,
  setSelectedStandardId,
  loadingStandards,
  standards,
  clauseError,
  handleSingleClauseSubmit,
  clauseForm,
  setClauseForm,
  savingClause,
  handleBulkSubmit,
  bulkPaste,
  setBulkPaste,
  bulkSavedCount
}) {
  return (
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
  )
}

export function ManageClausesSection({
  selectedStandardId,
  setSelectedStandardId,
  loadingStandards,
  standards,
  loadingClauses,
  clauses,
  deletingClauseIds,
  handleDeleteClause
}) {
  return (
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
              <th style={{ width: '20%' }} className="text-center">Actions</th>
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
                    <td className="text-center">
                      <div className="action-buttons-wrapper">
                        <button
                          type="button"
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteClause(clause)}
                          disabled={deleting}
                          title="Delete Clause"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

export function ToggleStandardsSection({
  loadingStandards,
  standards,
  toggleError,
  updatingStandardIds,
  deletingStandardIds,
  updatedStandardId,
  handleToggleStandard,
  handleDeleteStandard
}) {
  return (
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
              <th className="text-center">Actions</th>
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
                    <td className="text-center">
                      <div className="action-buttons-wrapper">
                        <button
                          type="button"
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteStandard(standard)}
                          disabled={busy || deleting}
                          title="Delete Standard"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

import React, { useState, useEffect, useCallback } from 'react'
import {
  Key,
  Webhook,
  FileSpreadsheet,
  Terminal,
  Copy,
  Check,
  ShieldCheck,
  Trash2,
  Power,
  Send,
  Download,
  Upload,
  RefreshCw,
  FileJson,
  AlertCircle,
  CheckCircle2,
  Database,
  Activity
} from 'lucide-react'
import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import AdminNavbar from '@/components/Navbars/AdminNavbar'
import Toast from '@/components/UI/Toast.jsx'
import { hasAdminPanelAccess } from '@/utils/roleUtils.js'
import { supabase } from '@/utils/supabase'
import { API_BASE_URL } from '@/lib/api'
import {
  fetchApiKeys,
  createApiKey,
  toggleApiKeyStatus,
  removeApiKey,
  fetchWebhooks,
  createWebhookConfig,
  removeWebhookConfig,
  triggerTestWebhook,
  fetchSyncedInventoryRecords,
  importInventoryRecordsBatch,
  fetchIntegrationLogs,
  simulatorPushInventoryWithApiKey,
  simulatorPollClosedQddrsWithApiKey,
  simulatorAcknowledgeQddrWithApiKey,
  exportClosedQddrsToFile
} from '@/services/integrationService'
import './AdminPanel.css'

const SAMPLE_SU_PRESETS = [
  {
    batch_code_su_number: '10SE27JST2',
    material_code: '1011',
    material_description: 'AL Crema Asada Can 48x370ml',
    expiry_date: '10.09.2027',
    po_reference: 'PO-2026-8841',
    drwb_number: 'DR-99201',
    brand_supplier: 'Alaska Milk Corp.',
    trucker_broker: 'YCH Logistics',
    plate_number: 'NAA 4821',
    container_number: 'CAXU6439352',
    location: 'Receiving Bay A',
    stock_qty: 500
  },
  {
    batch_code_su_number: '20JL27TCB3',
    material_code: '1165',
    material_description: 'Cow Evapsarap 48x360ml',
    expiry_date: '20.07.2027',
    po_reference: 'PO-2026-9104',
    drwb_number: 'DR-99418',
    brand_supplier: 'FrieslandCampina',
    trucker_broker: 'FastCargo Logistics',
    plate_number: 'CBE 9012',
    container_number: 'MSKU8812041',
    location: 'Cold Storage Zone 2',
    stock_qty: 400
  }
]

function parseCsvManifest(csvText) {
  const lines = String(csvText || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.replace(/^"|"$/g, '').trim())
    const obj = {}
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? ''
    })
    return obj
  })
}

export default function IntegrationsPage({ userRole, userPermissions }) {
  const canAccess = hasAdminPanelAccess(userRole, userPermissions, ['manage_categories', 'manage_users', 'manage_roles'])

  const [subTab, setSubTab] = useState('api_keys') // 'api_keys' | 'webhooks' | 'data_io' | 'simulator'
  const [toast, setToast] = useState(null)
  const [loading, setLoading] = useState(false)

  // 1. API Keys State
  const [apiKeys, setApiKeys] = useState([])
  const [keyName, setKeyName] = useState('Client WMS / Inventory ERP')
  const [keyScopes, setKeyScopes] = useState(['inventory:write', 'inventory:read', 'qddr:read', 'qddr:write'])
  const [keyExpiresDays, setKeyExpiresDays] = useState('90')
  const [newlyCreatedKey, setNewlyCreatedKey] = useState(null)
  const [copiedKey, setCopiedKey] = useState(false)

  // 2. Webhooks State
  const [webhooks, setWebhooks] = useState([])
  const [whName, setWhName] = useState('Client Inventory Stock Reduction Webhook')
  const [whUrl, setWhUrl] = useState(`${API_BASE_URL}/v1/external/simulator/webhook-receiver`)
  const [whSecret, setWhSecret] = useState('')
  const [testingWebhook, setTestingWebhook] = useState(false)

  // 3. Inventory Records & Logs State
  const [inventoryItems, setInventoryItems] = useState([])
  const [closedQddrs, setClosedQddrs] = useState([])
  const [logs, setLogs] = useState([])

  // 4. Simulator State
  const [simApiKey, setSimApiKey] = useState('')
  const [simForm, setSimForm] = useState(SAMPLE_SU_PRESETS[0])
  const [simResponse, setSimResponse] = useState(null)
  const [simBusy, setSimBusy] = useState(false)

  const loadAllIntegrationData = useCallback(async () => {
    if (!canAccess) return
    setLoading(true)
    try {
      const [keysRes, whRes, invRes, logsRes, qddrRes] = await Promise.all([
        fetchApiKeys().catch(() => []),
        fetchWebhooks().catch(() => []),
        fetchSyncedInventoryRecords().catch(() => []),
        fetchIntegrationLogs(40).catch(() => []),
        supabase
          .from('qddr_reports')
          .select('*')
          .ilike('status', 'closed')
          .order('id', { ascending: false })
          .limit(100)
      ])
      setApiKeys(keysRes)
      setWebhooks(whRes)
      setInventoryItems(invRes)
      setLogs(logsRes)
      setClosedQddrs(qddrRes?.data || [])
    } finally {
      setLoading(false)
    }
  }, [canAccess])

  useEffect(() => {
    loadAllIntegrationData()
  }, [loadAllIntegrationData])

  const handleToggleScope = (scope) => {
    setKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    )
  }

  const handleGenerateKey = async (e) => {
    e.preventDefault()
    if (!keyName.trim()) {
      setToast({ message: 'Please enter a name for the API key.', type: 'error' })
      return
    }
    try {
      const created = await createApiKey({
        name: keyName.trim(),
        scopes: keyScopes,
        expiresInDays: Number(keyExpiresDays) > 0 ? Number(keyExpiresDays) : null
      })
      if (created) {
        setNewlyCreatedKey(created)
        if (created.raw_key) {
          setSimApiKey(created.raw_key)
        }
        setToast({ message: 'API Key generated! Copy it now — it will only be shown once.', type: 'success' })
        loadAllIntegrationData()
      }
    } catch (err) {
      setToast({ message: err.message || 'Failed to generate API key.', type: 'error' })
    }
  }

  const handleToggleKeyActive = async (keyObj) => {
    try {
      await toggleApiKeyStatus(keyObj.id, !keyObj.is_active)
      setToast({
        message: keyObj.is_active ? `Revoked API key "${keyObj.name}"` : `Reactivated API key "${keyObj.name}"`,
        type: 'success'
      })
      loadAllIntegrationData()
    } catch (err) {
      setToast({ message: err.message || 'Could not update API key status.', type: 'error' })
    }
  }

  const handleDeleteKey = async (id) => {
    try {
      await removeApiKey(id)
      setToast({ message: 'API key permanently removed.', type: 'success' })
      loadAllIntegrationData()
    } catch (err) {
      setToast({ message: err.message || 'Could not delete API key.', type: 'error' })
    }
  }

  const handleCreateWebhook = async (e) => {
    e.preventDefault()
    try {
      await createWebhookConfig({
        name: whName,
        target_url: whUrl,
        secret_token: whSecret
      })
      setToast({ message: 'Outbound Webhook registered with HMAC-SHA256 signing.', type: 'success' })
      loadAllIntegrationData()
    } catch (err) {
      setToast({ message: err.message || 'Could not register webhook.', type: 'error' })
    }
  }

  const handleTestWebhook = async (url, secret) => {
    setTestingWebhook(true)
    try {
      const res = await triggerTestWebhook({ target_url: url || whUrl, secret_token: secret || whSecret })
      setToast({
        message: `Signed webhook ping dispatched (${res?.signature?.slice(0, 20)}...)`,
        type: 'success'
      })
      loadAllIntegrationData()
    } catch (err) {
      setToast({ message: err.message || 'Webhook ping failed.', type: 'error' })
    } finally {
      setTestingWebhook(false)
    }
  }

  const handleDownloadSampleCsvTemplate = () => {
    const headers = [
      'batch_code_su_number',
      'material_code',
      'material_description',
      'expiry_date',
      'po_reference',
      'drwb_number',
      'brand_supplier',
      'trucker_broker',
      'plate_number',
      'container_number',
      'location',
      'stock_qty'
    ]
    const rows = SAMPLE_SU_PRESETS.map((r) => headers.map((h) => r[h] ?? '').join(','))
    const csv = [headers.join(','), ...rows].join('\r\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'ResQ_SU_Inventory_Import_Template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportManifestFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      let items = []
      if (file.name.toLowerCase().endsWith('.json')) {
        const parsed = JSON.parse(text)
        items = Array.isArray(parsed) ? parsed : (parsed.items || parsed.records || [parsed])
      } else {
        items = parseCsvManifest(text)
      }

      if (!items.length) {
        setToast({ message: 'No valid SU inventory rows found in the uploaded file.', type: 'error' })
        return
      }

      const res = await importInventoryRecordsBatch(items, 'csv_import')
      setToast({
        message: `Imported ${res?.count || items.length} SU inventory record(s) for QDDR label autofill!`,
        type: 'success'
      })
      loadAllIntegrationData()
    } catch (err) {
      setToast({ message: err.message || 'Failed to import manifest file.', type: 'error' })
    }
  }

  // Simulator Actions (Using actual /api/v1/external endpoints with X-API-Key)
  const handleSimPushSuStock = async (e) => {
    e.preventDefault()
    if (!simApiKey.trim()) {
      setToast({ message: 'Paste an active API key first (or generate one in Tab 1).', type: 'error' })
      return
    }
    setSimBusy(true)
    setSimResponse(null)
    try {
      const res = await simulatorPushInventoryWithApiKey(simApiKey, simForm)
      setSimResponse({ status: 200, endpoint: 'POST /api/v1/external/inventory/sync', data: res })
      setToast({
        message: `Synced SU #${simForm.batch_code_su_number} (${simForm.stock_qty} cases) via API Key! Scan or pull this SU in QDDR now.`,
        type: 'success'
      })
      loadAllIntegrationData()
    } catch (err) {
      setSimResponse({
        status: err.status || 401,
        endpoint: 'POST /api/v1/external/inventory/sync',
        error: err.message,
        data: err.payload
      })
      setToast({ message: err.message, type: 'error' })
      loadAllIntegrationData()
    } finally {
      setSimBusy(false)
    }
  }

  const handleSimPollClosedQddrs = async () => {
    if (!simApiKey.trim()) {
      setToast({ message: 'Paste an active API key first (or generate one in Tab 1).', type: 'error' })
      return
    }
    setSimBusy(true)
    try {
      const res = await simulatorPollClosedQddrsWithApiKey(simApiKey, false)
      setSimResponse({ status: 200, endpoint: 'GET /api/v1/external/qddr/closed', data: res })
      setToast({ message: `Polled ${res?.count || 0} closed QDDR report(s) via API Key.`, type: 'success' })
      loadAllIntegrationData()
    } catch (err) {
      setSimResponse({
        status: err.status || 401,
        endpoint: 'GET /api/v1/external/qddr/closed',
        error: err.message,
        data: err.payload
      })
      setToast({ message: err.message, type: 'error' })
      loadAllIntegrationData()
    } finally {
      setSimBusy(false)
    }
  }

  const handleSimAcknowledgeQddr = async (refNo) => {
    if (!simApiKey.trim()) {
      setToast({ message: 'Paste an active API key in the Simulator input first.', type: 'error' })
      return
    }
    setSimBusy(true)
    try {
      const res = await simulatorAcknowledgeQddrWithApiKey(simApiKey, refNo, 'Deducted in Mock WMS Simulator')
      setSimResponse({ status: 200, endpoint: `POST /api/v1/external/qddr/${refNo}/acknowledge`, data: res })
      setToast({ message: `Acknowledged stock deduction for ${refNo}!`, type: 'success' })
      loadAllIntegrationData()
    } catch (err) {
      setToast({ message: err.message, type: 'error' })
    } finally {
      setSimBusy(false)
    }
  }

  if (!canAccess) {
    return (
      <div className="page-root">
        <main className="page-main-centered">
          <h1 className="page-title">Access Denied</h1>
          <div className="access-denied-text">You don't have permission to access this page.</div>
        </main>
      </div>
    )
  }

  return (
    <div className="page-root">
      <main className="page-main-wide">
        <h1 className="page-title">External Inventory Integrations</h1>
        <SettingsNavbar userRole={userRole} />

        <div className="glass-card-rounded-bottom">
          <div className="admin-inner-panel">
            <div className="search-row">
              <div className="admin-top-row">
                <div className="admin-tabs-wrap">
                  <AdminNavbar activeTab="Integrations" />
                </div>
              </div>
            </div>

            <div className="glass-card-content" style={{ padding: '16px 24px 28px' }}>
              {/* Security & Architecture Banner */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '12px 16px',
                  marginBottom: '18px',
                  background: 'linear-gradient(135deg, rgba(26,67,90,0.06) 0%, rgba(8,145,178,0.08) 100%)',
                  border: '1px solid rgba(8, 145, 178, 0.28)',
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={22} color="#0891b2" />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1A435A' }}>
                      3-Tier Inventory Integration Gateway (REST API Keys • Signed Webhooks • CSV/JSON Data Export)
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      Secured via SHA-256 one-way key hashing, least-privilege scopes on <code>/api/v1/external</code>, 60 req/min rate limiting, PII data minimization, and HMAC-SHA256 webhook signatures.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadAllIntegrationData}
                  disabled={loading}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#1A435A',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <RefreshCw size={13} className={loading ? 'iso-spinner' : ''} /> Refresh
                </button>
              </div>

              {/* 4 Sub-Tabs */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                {[
                  { id: 'api_keys', label: '1. API Keys (REST API)', icon: Key },
                  { id: 'webhooks', label: '2. Outbound Webhooks', icon: Webhook },
                  { id: 'data_io', label: '3. Data Import / Export (CSV & JSON)', icon: FileSpreadsheet },
                  { id: 'simulator', label: '4. Live Client WMS Simulator (Demo)', icon: Terminal }
                ].map((t) => {
                  const Icon = t.icon
                  const active = subTab === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSubTab(t.id)}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '7px',
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        borderRadius: '8px',
                        border: active ? '1px solid #0891b2' : '1px solid #cbd5e1',
                        background: active ? '#1A435A' : '#ffffff',
                        color: active ? '#ffffff' : '#1A435A',
                        cursor: 'pointer'
                      }}
                    >
                      <Icon size={14} /> {t.label}
                    </button>
                  )
                })}
              </div>

              {/* ── TAB 1: API KEYS ── */}
              {subTab === 'api_keys' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {newlyCreatedKey?.raw_key && (
                    <div
                      style={{
                        background: '#ecfdf5',
                        border: '1px solid #10b981',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckCircle2 size={16} /> Copy Your New API Key Now (Shown Only Once!)
                        </span>
                        <button
                          type="button"
                          onClick={() => setNewlyCreatedKey(null)}
                          style={{ background: 'none', border: 'none', fontSize: '12px', color: '#047857', cursor: 'pointer', fontWeight: 600 }}
                        >
                          Dismiss
                        </button>
                      </div>
                      <div style={{ fontSize: '12px', color: '#047857' }}>
                        For security, only the SHA-256 hash is stored in the database. We also pre-filled this key in the <strong>Live Client WMS Simulator</strong> tab for testing.
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <code
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: '#ffffff',
                            border: '1px solid #6ee7b7',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 700,
                            color: '#064e3b',
                            wordBreak: 'break-all'
                          }}
                        >
                          {newlyCreatedKey.raw_key}
                        </code>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(newlyCreatedKey.raw_key)
                            setCopiedKey(true)
                            setTimeout(() => setCopiedKey(false), 2000)
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '12.5px',
                            fontWeight: 600,
                            background: '#059669',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          {copiedKey ? <><Check size={14} /> Copied!</> : <><Copy size={14} /> Copy Key</>}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Generate API Key Form */}
                  <form
                    onSubmit={handleGenerateKey}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1A435A' }}>
                      Generate Scoped External API Key
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div>
                        <label className="label-field">Integration / Client System Name:</label>
                        <input
                          type="text"
                          value={keyName}
                          onChange={(e) => setKeyName(e.target.value)}
                          className="input-field"
                          placeholder="e.g. Client SAP WMS Production"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-field">Key Expiration:</label>
                        <select
                          value={keyExpiresDays}
                          onChange={(e) => setKeyExpiresDays(e.target.value)}
                          className="input-field"
                        >
                          <option value="30">30 Days</option>
                          <option value="90">90 Days (Recommended)</option>
                          <option value="365">1 Year</option>
                          <option value="0">Never Expires</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="label-field" style={{ marginBottom: '6px', display: 'block' }}>
                        Allowed Least-Privilege Scopes:
                      </label>
                      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        {[
                          { id: 'inventory:write', desc: 'Push SU / Stock records for QDDR autofill' },
                          { id: 'inventory:read', desc: 'Read synced SU / Stock levels' },
                          { id: 'qddr:read', desc: 'Poll Closed QDDRs for stock reduction' },
                          { id: 'qddr:write', desc: 'Acknowledge QDDR stock deduction' }
                        ].map((s) => (
                          <label key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#334155', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={keyScopes.includes(s.id)}
                              onChange={() => handleToggleScope(s.id)}
                            />
                            <code>{s.id}</code> <span style={{ color: '#64748b' }}>({s.desc})</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button type="submit" className="btn-add-action" style={{ margin: 0 }}>
                        + Generate API Key
                      </button>
                    </div>
                  </form>

                  {/* Active & Revoked Keys Table */}
                  <div className="reports-table-scroll-wrap">
                    <table className="iso-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Key Prefix</th>
                          <th>Scopes</th>
                          <th>Status</th>
                          <th>Last Used</th>
                          <th>Expires</th>
                          <th className="text-center-important">Kill-Switch / Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiKeys.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '18px' }}>
                              No API keys generated yet. Create one above to connect an external inventory system.
                            </td>
                          </tr>
                        ) : (
                          apiKeys.map((k) => (
                            <tr key={k.id}>
                              <td style={{ fontWeight: 600 }}>{k.name}</td>
                              <td><code>{k.key_prefix}</code></td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                  {(k.scopes || []).map((sc) => (
                                    <span
                                      key={sc}
                                      style={{
                                        fontSize: '11px',
                                        padding: '2px 6px',
                                        background: '#e0f2fe',
                                        color: '#0369a1',
                                        borderRadius: '4px',
                                        fontWeight: 600
                                      }}
                                    >
                                      {sc}
                                    </span>
                                  ))}
                                </div>
                              </td>
                              <td>
                                <span className={`iso-status-pill ${k.is_active ? 'is-closed' : 'is-open'}`}>
                                  {k.is_active ? 'Active' : 'Revoked'}
                                </span>
                              </td>
                              <td style={{ fontSize: '12px' }}>
                                {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}
                              </td>
                              <td style={{ fontSize: '12px' }}>
                                {k.expires_at ? new Date(k.expires_at).toLocaleDateString() : 'Never'}
                              </td>
                              <td className="text-center-important">
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleKeyActive(k)}
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 10px',
                                      fontSize: '11.5px',
                                      fontWeight: 600,
                                      borderRadius: '6px',
                                      border: '1px solid #cbd5e1',
                                      background: k.is_active ? '#fef2f2' : '#ecfdf5',
                                      color: k.is_active ? '#dc2626' : '#059669',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    <Power size={12} /> {k.is_active ? 'Revoke' : 'Activate'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteKey(k.id)}
                                    className="btn-action-icon-danger"
                                    title="Delete Key"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 2: WEBHOOKS ── */}
              {subTab === 'webhooks' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <form
                    onSubmit={handleCreateWebhook}
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#1A435A' }}>
                      Configure Outbound Webhook (Triggered Automatically When Any QDDR is Closed)
                    </div>
                    <div style={{ fontSize: '12px', color: '#475569' }}>
                      Every time a QDDR transitions to <strong>Closed</strong>, ResQ pushes a sanitized JSON payload signed with <code>X-ResQ-Signature: sha256=&lt;hmac&gt;</code> so the client's inventory system can automatically deduct the damaged stock quantity.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                      <div>
                        <label className="label-field">Webhook Name:</label>
                        <input
                          type="text"
                          value={whName}
                          onChange={(e) => setWhName(e.target.value)}
                          className="input-field"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-field">Target Webhook Receiver URL:</label>
                        <input
                          type="url"
                          value={whUrl}
                          onChange={(e) => setWhUrl(e.target.value)}
                          className="input-field"
                          placeholder="https://client-wms.example.com/webhooks/resq"
                          required
                        />
                      </div>
                      <div>
                        <label className="label-field">HMAC-SHA256 Signing Secret (Optional — auto-generated if blank):</label>
                        <input
                          type="text"
                          value={whSecret}
                          onChange={(e) => setWhSecret(e.target.value)}
                          className="input-field"
                          placeholder="whsec_..."
                        />
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => handleTestWebhook(whUrl, whSecret)}
                        disabled={testingWebhook}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '7px 14px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          color: '#0891b2',
                          background: 'rgba(8, 145, 178, 0.1)',
                          border: '1px solid rgba(8, 145, 178, 0.35)',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Send size={13} /> Send Test Signed Ping
                      </button>
                      <button type="submit" className="btn-add-action" style={{ margin: 0 }}>
                        + Save Webhook
                      </button>
                    </div>
                  </form>

                  <div className="reports-table-scroll-wrap">
                    <table className="iso-table">
                      <thead>
                        <tr>
                          <th>Webhook Name</th>
                          <th>Target URL</th>
                          <th>Event</th>
                          <th>HMAC Secret</th>
                          <th>Last Triggered</th>
                          <th>Last HTTP Status</th>
                          <th className="text-center-important">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {webhooks.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ textAlign: 'center', color: '#64748b', padding: '18px' }}>
                              No outbound webhooks configured yet. Click "+ Save Webhook" above to register the default receiver.
                            </td>
                          </tr>
                        ) : (
                          webhooks.map((w) => (
                            <tr key={w.id}>
                              <td style={{ fontWeight: 600 }}>{w.name}</td>
                              <td style={{ fontSize: '12px', wordBreak: 'break-all' }}><code>{w.target_url}</code></td>
                              <td><code>qddr.closed</code></td>
                              <td><code>{String(w.secret_token || '').slice(0, 12)}...</code></td>
                              <td style={{ fontSize: '12px' }}>
                                {w.last_triggered_at ? new Date(w.last_triggered_at).toLocaleString() : 'Never'}
                              </td>
                              <td>
                                {w.last_status_code ? (
                                  <span className={`iso-status-pill ${w.last_status_code === 200 ? 'is-closed' : 'is-open'}`}>
                                    HTTP {w.last_status_code}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="text-center-important">
                                <div style={{ display: 'inline-flex', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleTestWebhook(w.target_url, w.secret_token)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      borderRadius: '5px',
                                      border: '1px solid #cbd5e1',
                                      background: '#f8fafc',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Test Ping
                                  </button>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await removeWebhookConfig(w.id)
                                      loadAllIntegrationData()
                                    }}
                                    className="btn-action-icon-danger"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ── TAB 3: DATA IMPORT & EXPORT (CSV / JSON) ── */}
              {subTab === 'data_io' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
                  {/* Outbound Closed QDDR Stock Deduction Export */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A435A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Download size={17} color="#0891b2" /> Outbound: Export Closed QDDR Stock Deductions
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>
                      For clients using flat-file ERP/WMS batch uploads, export all <strong>Closed QDDRs ({closedQddrs.length})</strong> as a structured CSV or JSON file containing Material Code, Batch/SU Number, PO Reference, Discrepancy Tags, and Affected Quantity to deduct.
                      <br />
                      <em>Note: Inventory Managers can also multi-select specific Closed QDDRs directly on the QDDR Reports page.</em>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => exportClosedQddrsToFile(closedQddrs, 'csv')}
                        disabled={closedQddrs.length === 0}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          background: '#0891b2',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: closedQddrs.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <Download size={14} /> Export All Closed QDDRs (CSV)
                      </button>
                      <button
                        type="button"
                        onClick={() => exportClosedQddrsToFile(closedQddrs, 'json')}
                        disabled={closedQddrs.length === 0}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          background: '#ffffff',
                          color: '#1A435A',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: closedQddrs.length === 0 ? 'not-allowed' : 'pointer'
                        }}
                      >
                        <FileJson size={14} /> Export All Closed QDDRs (JSON)
                      </button>
                    </div>
                  </div>

                  {/* Inbound SU Receiving Manifest Import */}
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A435A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Upload size={17} color="#0891b2" /> Inbound: Import SU / Receiving Stock Manifest (CSV / JSON)
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#475569' }}>
                      Upload a CSV or JSON manifest exported from the client's inventory system so that scanning an SU label in the QDDR form automatically pulls any available PO Reference, DR/WB Number, Supplier, Trucker, Plate Number, Container Number, and Location.
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <label
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          background: '#1A435A',
                          color: '#ffffff',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Upload size={14} /> Upload CSV / JSON Manifest
                        <input
                          type="file"
                          accept=".csv,.json"
                          onChange={handleImportManifestFile}
                          style={{ display: 'none' }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={handleDownloadSampleCsvTemplate}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          background: '#ffffff',
                          color: '#1A435A',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          cursor: 'pointer'
                        }}
                      >
                        <Download size={14} /> Download Sample CSV Template
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ── TAB 4: LIVE CLIENT WMS SIMULATOR (DEFENSE DEMO) ── */}
              {subTab === 'simulator' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  <div
                    style={{
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A435A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Terminal size={17} color="#0891b2" /> Live Client WMS / Inventory System Simulator
                        </div>
                        <div style={{ fontSize: '12px', color: '#475569' }}>
                          Demonstrate real API Key authentication (<code>X-API-Key</code>), SU Label Autofill enrichment, and automatic stock reduction when a QDDR is closed.
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {SAMPLE_SU_PRESETS.map((preset, i) => (
                          <button
                            key={preset.batch_code_su_number}
                            type="button"
                            onClick={() => setSimForm(preset)}
                            style={{
                              padding: '5px 10px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              background: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Load Preset #{i + 1}: SU {preset.batch_code_su_number}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Step A: API Key Input */}
                    <div>
                      <label className="label-field">
                        Step 1 — Client API Key (<code>X-API-Key</code> Header):
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          type="text"
                          value={simApiKey}
                          onChange={(e) => setSimApiKey(e.target.value)}
                          className="input-field"
                          style={{ flex: 1, fontFamily: 'monospace' }}
                          placeholder="Paste your resq_live_... key generated in Tab 1"
                        />
                        <button
                          type="button"
                          onClick={handleSimPollClosedQddrs}
                          disabled={simBusy}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            fontSize: '12px',
                            fontWeight: 600,
                            background: '#ffffff',
                            color: '#1A435A',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            cursor: 'pointer'
                          }}
                        >
                          <Database size={14} /> Poll Closed QDDRs (GET /api/v1/external/qddr/closed)
                        </button>
                      </div>
                    </div>

                    {/* Step B: Push SU Record Form */}
                    <form onSubmit={handleSimPushSuStock} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1A435A' }}>
                        Step 2 — Push SU &amp; Shipment Record from Mock WMS to ResQ (<code>POST /api/v1/external/inventory/sync</code>):
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                        <div>
                          <label className="label-field">Batch / SU Number *</label>
                          <input
                            type="text"
                            value={simForm.batch_code_su_number}
                            onChange={(e) => setSimForm({ ...simForm, batch_code_su_number: e.target.value })}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="label-field">Material Code *</label>
                          <input
                            type="text"
                            value={simForm.material_code}
                            onChange={(e) => setSimForm({ ...simForm, material_code: e.target.value })}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="label-field">Material Description</label>
                          <input
                            type="text"
                            value={simForm.material_description}
                            onChange={(e) => setSimForm({ ...simForm, material_description: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">Initial Stock Qty (Cases)</label>
                          <input
                            type="number"
                            value={simForm.stock_qty}
                            onChange={(e) => setSimForm({ ...simForm, stock_qty: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">PO Reference (Optional)</label>
                          <input
                            type="text"
                            value={simForm.po_reference}
                            onChange={(e) => setSimForm({ ...simForm, po_reference: e.target.value })}
                            className="input-field"
                            placeholder="Leave blank to test partial autofill"
                          />
                        </div>
                        <div>
                          <label className="label-field">DR / WB Number (Optional)</label>
                          <input
                            type="text"
                            value={simForm.drwb_number}
                            onChange={(e) => setSimForm({ ...simForm, drwb_number: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">Brand / Supplier (Optional)</label>
                          <input
                            type="text"
                            value={simForm.brand_supplier}
                            onChange={(e) => setSimForm({ ...simForm, brand_supplier: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">Trucker / Broker (Optional)</label>
                          <input
                            type="text"
                            value={simForm.trucker_broker}
                            onChange={(e) => setSimForm({ ...simForm, trucker_broker: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">Plate Number (Optional)</label>
                          <input
                            type="text"
                            value={simForm.plate_number}
                            onChange={(e) => setSimForm({ ...simForm, plate_number: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">Container Number (Optional)</label>
                          <input
                            type="text"
                            value={simForm.container_number}
                            onChange={(e) => setSimForm({ ...simForm, container_number: e.target.value })}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label-field">Location (Optional)</label>
                          <input
                            type="text"
                            value={simForm.location}
                            onChange={(e) => setSimForm({ ...simForm, location: e.target.value })}
                            className="input-field"
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="submit"
                          disabled={simBusy}
                          className="btn-add-action"
                          style={{ margin: 0 }}
                        >
                          <Send size={14} style={{ marginRight: '6px' }} />
                          Push SU Record via API Key
                        </button>
                      </div>
                    </form>

                    {simResponse && (
                      <div
                        style={{
                          background: '#0f172a',
                          color: '#e2e8f0',
                          borderRadius: '8px',
                          padding: '12px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}
                      >
                        <div style={{ color: simResponse.status === 200 ? '#34d399' : '#f87171', fontWeight: 700, marginBottom: '6px' }}>
                          {simResponse.endpoint} → HTTP {simResponse.status}
                        </div>
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                          {JSON.stringify(simResponse.data || { error: simResponse.error }, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── LIVE SYNCED INVENTORY TABLE (Always visible below tabs for transparent verification) ── */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A435A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={16} color="#0891b2" /> Synced External Inventory Records (SU Autofill Cache &amp; Live Stock Deduction Tracker)
                </div>
                <div className="reports-table-scroll-wrap">
                  <table className="iso-table">
                    <thead>
                      <tr>
                        <th>SU / Batch No.</th>
                        <th>Mat. Code</th>
                        <th>Material Description</th>
                        <th>PO Ref / DR-WB</th>
                        <th>Supplier / Trucker</th>
                        <th className="text-center-important">Initial Stock</th>
                        <th className="text-center-important">Deducted (Closed QDDR)</th>
                        <th className="text-center-important">Current Stock</th>
                        <th>Last QDDR Deduction</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inventoryItems.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>
                            No external SU records synced yet. Push a record from the Live WMS Simulator or import a CSV/JSON manifest.
                          </td>
                        </tr>
                      ) : (
                        inventoryItems.map((item) => (
                          <tr key={item.id}>
                            <td style={{ fontWeight: 700, color: '#0891b2' }}>{item.batch_code_su_number}</td>
                            <td><code>{item.material_code || '—'}</code></td>
                            <td>{item.material_description || '—'}</td>
                            <td style={{ fontSize: '12px' }}>
                              {[item.po_reference, item.drwb_number].filter(Boolean).join(' / ') || '—'}
                            </td>
                            <td style={{ fontSize: '12px' }}>
                              {[item.brand_supplier, item.trucker_broker, item.plate_number].filter(Boolean).join(' • ') || '—'}
                            </td>
                            <td className="text-center-important">{item.initial_stock_qty}</td>
                            <td className="text-center-important" style={{ color: item.deducted_qty > 0 ? '#dc2626' : '#64748b', fontWeight: 700 }}>
                              {item.deducted_qty > 0 ? `-${item.deducted_qty}` : '0'}
                            </td>
                            <td className="text-center-important" style={{ fontWeight: 700, color: '#059669' }}>
                              {item.current_stock_qty}
                            </td>
                            <td>
                              {item.last_qddr_ref ? (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <span className="iso-status-pill is-closed">{item.last_qddr_ref}</span>
                                  {simApiKey && (
                                    <button
                                      type="button"
                                      onClick={() => handleSimAcknowledgeQddr(item.last_qddr_ref)}
                                      style={{
                                        fontSize: '11px',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        border: '1px solid #cbd5e1',
                                        background: '#ffffff',
                                        cursor: 'pointer'
                                      }}
                                      title="Acknowledge deduction via API Key"
                                    >
                                      Ack
                                    </button>
                                  )}
                                </div>
                              ) : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ── INTEGRATION SECURITY & SYNC AUDIT LOG ── */}
              <div style={{ marginTop: '24px' }}>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A435A', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={16} color="#0891b2" /> Integration Security &amp; Activity Audit Trail
                </div>
                <div className="reports-table-scroll-wrap">
                  <table className="iso-table">
                    <thead>
                      <tr>
                        <th>Timestamp</th>
                        <th>Channel</th>
                        <th>Event</th>
                        <th>Key / Ref</th>
                        <th>Summary</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: '#64748b', padding: '16px' }}>
                            No integration activity recorded yet.
                          </td>
                        </tr>
                      ) : (
                        logs.slice(0, 15).map((log) => (
                          <tr key={log.id}>
                            <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>
                              {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                            </td>
                            <td><code>{log.channel}</code></td>
                            <td><code>{log.event_type}</code></td>
                            <td style={{ fontSize: '12px' }}>{log.reference_no || log.key_prefix || '—'}</td>
                            <td style={{ fontSize: '12.5px' }}>{log.summary}</td>
                            <td>
                              <span className={`iso-status-pill ${log.status === 'success' ? 'is-closed' : 'is-open'}`}>
                                {log.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      </main>
    </div>
  )
}

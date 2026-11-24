import { API_BASE_URL, request } from '@/lib/api'

// ─── Internal / Admin Integration Service ────────────────────────────────────

export async function fetchApiKeys() {
  const res = await request('/integrations/api-keys')
  return res?.data || []
}

export async function createApiKey({ name, scopes, expiresInDays }) {
  const res = await request('/integrations/api-keys', {
    method: 'POST',
    body: JSON.stringify({ name, scopes, expiresInDays })
  })
  return res?.data || null
}

export async function toggleApiKeyStatus(id, isActive) {
  const res = await request(`/integrations/api-keys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: Boolean(isActive) })
  })
  return res?.data || null
}

export async function removeApiKey(id) {
  return await request(`/integrations/api-keys/${id}`, {
    method: 'DELETE'
  })
}

export async function fetchWebhooks() {
  const res = await request('/integrations/webhooks')
  return res?.data || []
}

export async function createWebhookConfig({ name, target_url, secret_token, is_active = true }) {
  const res = await request('/integrations/webhooks', {
    method: 'POST',
    body: JSON.stringify({ name, target_url, secret_token, is_active })
  })
  return res?.data || null
}

export async function removeWebhookConfig(id) {
  return await request(`/integrations/webhooks/${id}`, {
    method: 'DELETE'
  })
}

export async function triggerTestWebhook({ target_url, secret_token }) {
  return await request('/integrations/webhooks/test', {
    method: 'POST',
    body: JSON.stringify({ target_url, secret_token })
  })
}

export async function fetchSyncedInventoryRecords() {
  const res = await request('/integrations/inventory')
  return res?.data || []
}

export async function importInventoryRecordsBatch(items = [], source = 'csv_import') {
  return await request('/integrations/inventory/import', {
    method: 'POST',
    body: JSON.stringify({ items, source })
  })
}

export async function lookupInventoryBySuOrMaterial({ batchCodeSuNumber = '', materialCode = '' }) {
  const params = new URLSearchParams()
  if (batchCodeSuNumber) params.set('batch_code_su_number', batchCodeSuNumber)
  if (materialCode) params.set('material_code', materialCode)
  const res = await request(`/integrations/lookup?${params.toString()}`)
  return res?.data || null
}

export async function fetchIntegrationLogs(limit = 50) {
  const res = await request(`/integrations/logs?limit=${limit}`)
  return res?.data || []
}

export async function recordDataExportAudit({ format = 'csv', count = 0, reference_nos = [] }) {
  return await request('/integrations/export-log', {
    method: 'POST',
    body: JSON.stringify({ format, count, reference_nos })
  }).catch(() => {})
}

// ─── External Public API v1 Calls (Used by Live WMS Simulator with X-API-Key) ──

async function externalRequest(path, apiKey, options = {}) {
  const cleanKey = String(apiKey || '').trim()
  const res = await fetch(`${API_BASE_URL}/v1/external${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(cleanKey ? { 'X-API-Key': cleanKey } : {}),
      ...(options.headers || {})
    }
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    const err = new Error(data?.error || `HTTP ${res.status}: External API request failed`)
    err.status = res.status
    err.payload = data
    throw err
  }
  return data
}

export async function simulatorPushInventoryWithApiKey(apiKey, items) {
  return await externalRequest('/inventory/sync', apiKey, {
    method: 'POST',
    body: JSON.stringify({ items: Array.isArray(items) ? items : [items] })
  })
}

export async function simulatorFetchInventoryWithApiKey(apiKey) {
  return await externalRequest('/inventory', apiKey, {
    method: 'GET'
  })
}

export async function simulatorPollClosedQddrsWithApiKey(apiKey, onlyUnsynced = false) {
  return await externalRequest(`/qddr/closed?unsynced=${onlyUnsynced}`, apiKey, {
    method: 'GET'
  })
}

export async function simulatorAcknowledgeQddrWithApiKey(apiKey, idOrRef, notes = '') {
  return await externalRequest(`/qddr/${encodeURIComponent(idOrRef)}/acknowledge`, apiKey, {
    method: 'POST',
    body: JSON.stringify({ notes })
  })
}

// ─── Shared Closed QDDR Stock Deduction Data Exporter (CSV & JSON) ───────────

const DISCREPANCY_FLAG_KEYS = [
  'holes_punctures',
  'deformed_torn',
  'open_carton',
  'crushed_dented',
  'wet_leaked',
  'stain_graffiti',
  'bulging',
  'improper_stretch_wrapping',
  'wrong_no_batchcode',
  'opened_seal',
  'no_label_broken_label',
  'short_pack',
  'excess_shipment',
  'documentation_error',
  'picking_discrepancy'
]

export function formatClosedQddrForInventoryExport(qddr) {
  const tags = Array.isArray(qddr.discrepancy_types)
    ? qddr.discrepancy_types
    : DISCREPANCY_FLAG_KEYS.filter((k) => Boolean(qddr[k]))

  return {
    Reference_No: qddr.reference_no || `QDDR-${qddr.id}`,
    Status: String(qddr.status || 'closed').toUpperCase(),
    Action_Required: 'DEDUCT_OR_QUARANTINE_STOCK',
    Date: qddr.date ? String(qddr.date).split('T')[0] : '',
    Time: qddr.time || '',
    Location: qddr.location || '',
    Material_Code: qddr.material_code || '',
    Material_Description: qddr.material_description || '',
    Batch_SU_Number: qddr.batch_code_su_number || '',
    Deduct_Qty: Number(qddr.qty ?? qddr.affected_qty ?? 0),
    PO_Reference: qddr.po_reference || '',
    DRWB_Number: qddr.drwb_number || '',
    Brand_Supplier: qddr.brand_supplier || '',
    Trucker_Broker: qddr.trucker_broker || '',
    Plate_Number: qddr.plate_number || '',
    Container_Number: qddr.container_number || '',
    Discrepancy_Types: tags.join('; '),
    Reason_Of_Discrepancy: qddr.reason_of_discrepancy || '',
    Corrective_Action: qddr.corrective_action || '',
    Preventive_Action: qddr.preventive_action || '',
    Inventory_Sync_Status: qddr.inventory_sync_status || 'exported'
  }
}

function escapeCsvCell(value) {
  const str = value === null || value === undefined ? '' : String(value).replace(/\r?\n/g, ' ')
  if (/[",]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function exportClosedQddrsToFile(qddrList = [], format = 'csv') {
  const validRows = (Array.isArray(qddrList) ? qddrList : [qddrList])
    .filter(Boolean)
    .map(formatClosedQddrForInventoryExport)

  if (validRows.length === 0) return false

  const dateStamp = new Date().toISOString().slice(0, 10)
  const cleanFormat = String(format || 'csv').toLowerCase()

  let blob = null
  let fileName = `ResQ_Inventory_Stock_Deduction_${dateStamp}.${cleanFormat}`

  if (cleanFormat === 'json') {
    const jsonPayload = {
      export_type: 'RESQ_CLOSED_QDDR_STOCK_DEDUCTION',
      exported_at: new Date().toISOString(),
      total_records: validRows.length,
      total_deduct_qty: validRows.reduce((sum, r) => sum + (Number(r.Deduct_Qty) || 0), 0),
      records: validRows
    }
    blob = new Blob([JSON.stringify(jsonPayload, null, 2)], { type: 'application/json;charset=utf-8;' })
  } else {
    const headers = Object.keys(validRows[0])
    const csvLines = [
      headers.join(','),
      ...validRows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(','))
    ]
    blob = new Blob(['\uFEFF' + csvLines.join('\r\n')], { type: 'text/csv;charset=utf-8;' })
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', fileName)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  await recordDataExportAudit({
    format: cleanFormat,
    count: validRows.length,
    reference_nos: validRows.map((r) => r.Reference_No)
  })

  return true
}

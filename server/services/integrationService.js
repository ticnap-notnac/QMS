import crypto from 'crypto'
import { supabase } from '../lib/supabase.js'
import { ensureIntegrationSchema } from '../lib/ensureIntegrationSchema.js'
import { hashApiKey } from '../middlewares/apiKeyMiddleware.js'
import { writeAudit } from '../lib/audit.js'
import logger from '../utils/logger.js'

const QDDR_DISCREPANCY_FLAGS = [
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

function extractActiveDiscrepancyTags(qddr) {
  if (!qddr) return []
  return QDDR_DISCREPANCY_FLAGS.filter((key) => Boolean(qddr[key]))
}

/**
 * Data Minimization helper: strips internal user IDs, emails, and private internal fields
 * so external systems only receive stock-discrepancy information.
 */
export function buildSanitizedClosedQddrPayload(qddr) {
  const activeTags = extractActiveDiscrepancyTags(qddr)
  return {
    event: 'qddr.closed',
    id: qddr.id,
    reference_no: qddr.reference_no || `QDDR-${qddr.id}`,
    action_required: 'DEDUCT_OR_QUARANTINE_STOCK',
    status: 'closed',
    date: qddr.date || null,
    time: qddr.time || null,
    location: qddr.location || null,
    material_code: qddr.material_code || null,
    material_description: qddr.material_description || null,
    batch_code_su_number: qddr.batch_code_su_number || null,
    po_reference: qddr.po_reference || null,
    drwb_number: qddr.drwb_number || null,
    brand_supplier: qddr.brand_supplier || null,
    trucker_broker: qddr.trucker_broker || null,
    plate_number: qddr.plate_number || null,
    container_number: qddr.container_number || null,
    affected_qty: Number(qddr.qty) || 0,
    discrepancy_types: activeTags,
    others: qddr.others || null,
    reason_of_discrepancy: qddr.reason_of_discrepancy || null,
    corrective_action: qddr.corrective_action || null,
    preventive_action: qddr.preventive_action || null,
    inventory_sync_status: qddr.inventory_sync_status || 'pending',
    inventory_synced_at: qddr.inventory_synced_at || null,
    closed_at: qddr.updated_at || new Date().toISOString()
  }
}

export async function logIntegrationEvent({
  direction = 'inbound',
  channel = 'api',
  eventType,
  status = 'success',
  keyPrefix = null,
  referenceNo = null,
  summary = '',
  payload = null,
  ipAddress = null
}) {
  try {
    await ensureIntegrationSchema()
    await supabase.from('integration_sync_logs').insert([{
      direction,
      channel,
      event_type: eventType,
      status,
      key_prefix: keyPrefix,
      reference_no: referenceNo,
      summary,
      payload,
      ip_address: ipAddress
    }])
  } catch (err) {
    logger.warn(`[integrationService] Failed to record integration log: ${err.message}`)
  }
}

// ─── 1. API Key Management ───────────────────────────────────────────────────

export async function listApiKeys() {
  await ensureIntegrationSchema()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_by, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function generateNewApiKey({ name, scopes, expiresInDays, actorAuthId }) {
  await ensureIntegrationSchema()
  const cleanName = String(name || '').trim()
  if (!cleanName) {
    const err = new Error('API key name is required.')
    err.status = 400
    throw err
  }

  const allowedScopes = ['inventory:write', 'inventory:read', 'qddr:read', 'qddr:write']
  const cleanScopes = Array.isArray(scopes) && scopes.length > 0
    ? scopes.filter((s) => allowedScopes.includes(s))
    : ['inventory:write', 'inventory:read', 'qddr:read']

  const randomToken = crypto.randomBytes(24).toString('hex')
  const rawKey = `resq_live_${randomToken}`
  const keyPrefix = `${rawKey.slice(0, 16)}...`
  const keyHash = hashApiKey(rawKey)

  let expiresAt = null
  if (expiresInDays && Number(expiresInDays) > 0) {
    expiresAt = new Date(Date.now() + Number(expiresInDays) * 24 * 60 * 60 * 1000).toISOString()
  }

  const { data, error } = await supabase
    .from('api_keys')
    .insert([{
      name: cleanName,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: cleanScopes,
      is_active: true,
      expires_at: expiresAt,
      created_by: actorAuthId || null
    }])
    .select('id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at')
    .maybeSingle()

  if (error) throw error

  await writeAudit({
    level: 'audit',
    source: 'integrations',
    action: 'api_key_create',
    userAuthId: actorAuthId,
    details: { id: data.id, name: cleanName, key_prefix: keyPrefix, scopes: cleanScopes }
  })

  await logIntegrationEvent({
    direction: 'internal',
    channel: 'admin',
    eventType: 'api_key.created',
    status: 'success',
    keyPrefix,
    summary: `Generated new API key "${cleanName}" (${keyPrefix}) with scopes [${cleanScopes.join(', ')}]`
  })

  return {
    ...data,
    raw_key: rawKey // Returned ONCE at creation time
  }
}

export async function toggleOrRevokeApiKey({ id, isActive, actorAuthId }) {
  await ensureIntegrationSchema()
  const nextActive = Boolean(isActive)

  const { data, error } = await supabase
    .from('api_keys')
    .update({ is_active: nextActive })
    .eq('id', id)
    .select('id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at')
    .maybeSingle()

  if (error) throw error
  if (!data) {
    const err = new Error('API key not found.')
    err.status = 404
    throw err
  }

  await writeAudit({
    level: 'audit',
    source: 'integrations',
    action: nextActive ? 'api_key_activate' : 'api_key_revoke',
    userAuthId: actorAuthId,
    details: { id: data.id, name: data.name, key_prefix: data.key_prefix }
  })

  await logIntegrationEvent({
    direction: 'internal',
    channel: 'admin',
    eventType: nextActive ? 'api_key.activated' : 'api_key.revoked',
    status: 'success',
    keyPrefix: data.key_prefix,
    summary: `${nextActive ? 'Reactivated' : 'Revoked'} API key "${data.name}" (${data.key_prefix})`
  })

  return data
}

export async function deleteApiKeyRecord({ id, actorAuthId }) {
  await ensureIntegrationSchema()
  const { data: existing } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix')
    .eq('id', id)
    .maybeSingle()

  const { error } = await supabase.from('api_keys').delete().eq('id', id)
  if (error) throw error

  if (existing) {
    await writeAudit({
      level: 'audit',
      source: 'integrations',
      action: 'api_key_delete',
      userAuthId: actorAuthId,
      details: existing
    })
  }
  return { success: true }
}

// ─── 2. External Inventory Items Sync, Import & SU Label Lookup ──────────────

function normalizeInventoryItemInput(raw = {}, defaultSource = 'api') {
  const batchSu = String(
    raw.batch_code_su_number ||
    raw.su_number ||
    raw.batch_code ||
    raw.Batch_SU_Number ||
    ''
  ).trim()

  const materialCode = String(
    raw.material_code ||
    raw.item_code ||
    raw.sku ||
    raw.Material_Code ||
    ''
  ).trim()

  const materialDescription = String(
    raw.material_description ||
    raw.item_description ||
    raw.product_name ||
    raw.Material_Description ||
    ''
  ).trim()

  const cleanStr = (val) => {
    if (val === undefined || val === null) return null
    const str = String(val).trim()
    return str.length > 0 ? str : null
  }

  const parsedStock = raw.stock_qty ?? raw.current_stock_qty ?? raw.initial_stock_qty ?? raw.qty ?? null
  const stockNum = parsedStock !== null && parsedStock !== '' && !Number.isNaN(Number(parsedStock))
    ? Math.max(0, parseInt(parsedStock, 10))
    : 0

  return {
    batch_code_su_number: batchSu || (materialCode ? `MAT-${materialCode}` : ''),
    material_code: cleanStr(materialCode),
    material_description: cleanStr(materialDescription),
    expiry_date: cleanStr(raw.expiry_date || raw.Expiry_Date),
    po_reference: cleanStr(raw.po_reference || raw.po_number || raw.PO_Reference),
    drwb_number: cleanStr(raw.drwb_number || raw.dr_number || raw.DRWB_Number),
    brand_supplier: cleanStr(raw.brand_supplier || raw.supplier || raw.Supplier),
    trucker_broker: cleanStr(raw.trucker_broker || raw.trucker || raw.Trucker_Broker),
    plate_number: cleanStr(raw.plate_number || raw.Plate_Number),
    container_number: cleanStr(raw.container_number || raw.Container_Number),
    location: cleanStr(raw.location || raw.Location),
    initial_stock_qty: stockNum,
    current_stock_qty: stockNum,
    unit: cleanStr(raw.unit) || 'cases',
    source: cleanStr(raw.source) || defaultSource,
    updated_at: new Date().toISOString()
  }
}

export async function upsertExternalInventoryItems({ items = [], source = 'api', keyPrefix = null, ipAddress = null }) {
  await ensureIntegrationSchema()
  const rawList = Array.isArray(items) ? items : [items]
  const normalizedList = rawList
    .map((item) => normalizeInventoryItemInput(item, source))
    .filter((item) => Boolean(item.batch_code_su_number))

  if (normalizedList.length === 0) {
    const err = new Error('At least one valid inventory item with batch_code_su_number (or material_code) is required.')
    err.status = 400
    throw err
  }

  const results = []
  const metadataFields = [
    'material_code',
    'material_description',
    'expiry_date',
    'po_reference',
    'drwb_number',
    'brand_supplier',
    'trucker_broker',
    'plate_number',
    'container_number',
    'location'
  ]

  for (const row of normalizedList) {
    const { data: existingItem } = await supabase
      .from('external_inventory_items')
      .select('*')
      .ilike('batch_code_su_number', row.batch_code_su_number)
      .maybeSingle()

    let payloadToSave = row
    if (existingItem) {
      const existingInitial = Number(existingItem.initial_stock_qty) || 0
      const incomingStock = Number(row.current_stock_qty) || 0
      const preservedInitial =
        existingInitial > 0 ? Math.max(existingInitial, incomingStock) : incomingStock

      const merged = {
        ...row,
        batch_code_su_number: existingItem.batch_code_su_number,
        initial_stock_qty: preservedInitial,
        current_stock_qty: incomingStock
      }

      for (const field of metadataFields) {
        if ((merged[field] === null || merged[field] === undefined || merged[field] === '') && existingItem[field]) {
          merged[field] = existingItem[field]
        }
      }

      payloadToSave = merged
    }

    const { data, error } = await supabase
      .from('external_inventory_items')
      .upsert([payloadToSave], { onConflict: 'batch_code_su_number' })
      .select('*')
      .maybeSingle()

    if (error) throw error
    if (data) results.push(data)

    // Also keep `products` catalog in sync if material_description is present
    const resolvedMaterialDesc = payloadToSave.material_description
    if (resolvedMaterialDesc) {
      const cleanProdName = resolvedMaterialDesc.replace(/\s*\(\s*exp\s*:?.*?\)\s*$/i, '').trim()
      if (cleanProdName) {
        const { data: existingProd } = await supabase
          .from('products')
          .select('id')
          .ilike('product_name', cleanProdName)
          .maybeSingle()
        if (!existingProd) {
          try {
            await supabase.from('products').insert([{ product_name: cleanProdName }])
          } catch {
            // Non-blocking catalog sync
          }
        }
      }
    }
  }

  await logIntegrationEvent({
    direction: 'inbound',
    channel: source === 'csv_import' ? 'csv_import' : 'api',
    eventType: 'inventory.synced',
    status: 'success',
    keyPrefix,
    referenceNo: results[0]?.batch_code_su_number || null,
    summary: `Synced ${results.length} inventory SU record(s) via ${source.toUpperCase()}`,
    payload: { count: results.length, sample_su: results[0]?.batch_code_su_number },
    ipAddress
  })

  return results
}

export async function listExternalInventoryItems() {
  await ensureIntegrationSchema()
  const { data, error } = await supabase
    .from('external_inventory_items')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) throw error
  return data || []
}

/**
 * Looks up synced external inventory metadata by SU/Batch code and/or Material code.
 * Used by both `scanPalletLabel` (automatic on SU photo/barcode scan) and manual SU lookup button.
 * Only returns non-empty fields so missing information gracefully degrades without overwriting user input.
 */
export async function lookupExternalInventoryForQddr({ batchCodeSuNumber = '', materialCode = '' } = {}) {
  await ensureIntegrationSchema()
  const cleanBatch = String(batchCodeSuNumber || '').trim()
  const cleanMat = String(materialCode || '').trim()

  if (!cleanBatch && !cleanMat) return null

  let match = null

  if (cleanBatch) {
    const { data } = await supabase
      .from('external_inventory_items')
      .select('*')
      .ilike('batch_code_su_number', cleanBatch)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) match = data
  }

  if (!match && cleanMat) {
    const { data } = await supabase
      .from('external_inventory_items')
      .select('*')
      .ilike('material_code', cleanMat)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) match = data
  }

  if (!match) return null

  // Build clean object containing ONLY non-empty fields
  const enriched = {
    inventory_matched: true,
    inventory_source: match.source || 'api',
    available_stock_qty: match.current_stock_qty
  }

  const candidateFields = [
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
    'location'
  ]

  for (const field of candidateFields) {
    const val = match[field]
    if (val !== null && val !== undefined && String(val).trim() !== '') {
      enriched[field] = String(val).trim()
    }
  }

  return enriched
}

// ─── 3. Webhooks & Outbound Closed QDDR Stock Reduction Push ─────────────────

export async function listWebhooks() {
  await ensureIntegrationSchema()
  const { data, error } = await supabase
    .from('integration_webhooks')
    .select('id, name, target_url, secret_token, events, is_active, last_triggered_at, last_status_code, created_at')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createOrUpdateWebhook({ name, targetUrl, secretToken, isActive = true }) {
  await ensureIntegrationSchema()
  const cleanName = String(name || 'Client Inventory Webhook').trim()
  const cleanUrl = String(targetUrl || '').trim()

  if (!cleanUrl || !/^https?:\/\//i.test(cleanUrl)) {
    const err = new Error('A valid http:// or https:// Webhook Target URL is required.')
    err.status = 400
    throw err
  }

  const secret = String(secretToken || '').trim() || `whsec_${crypto.randomBytes(16).toString('hex')}`

  const { data, error } = await supabase
    .from('integration_webhooks')
    .insert([{
      name: cleanName,
      target_url: cleanUrl,
      secret_token: secret,
      events: ['qddr.closed'],
      is_active: Boolean(isActive)
    }])
    .select('*')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function deleteWebhook({ id }) {
  await ensureIntegrationSchema()
  const { error } = await supabase.from('integration_webhooks').delete().eq('id', id)
  if (error) throw error
  return { success: true }
}

export function signWebhookPayload(payloadObj, secret) {
  const timestamp = Math.floor(Date.now() / 1000)
  const rawBody = JSON.stringify(payloadObj)
  const hmac = crypto
    .createHmac('sha256', String(secret || ''))
    .update(`${timestamp}.${rawBody}`)
    .digest('hex')
  return {
    signature: `sha256=${hmac}`,
    timestamp: String(timestamp),
    rawBody
  }
}

/**
 * Automatically executes when a QDDR transitions to `status = 'closed'`.
 * 1. Deducts `qty` from matching `external_inventory_items` record (if present) so the
 *    External API & Simulator reflect the stock reduction immediately.
 * 2. Dispatches HMAC-SHA256 signed webhook payloads to all active registered webhooks.
 */
export async function dispatchClosedQddrToInventoryIntegration(qddr) {
  try {
    await ensureIntegrationSchema()
    if (!qddr) return

    const sanitizedPayload = buildSanitizedClosedQddrPayload(qddr)
    const affectedQty = Math.max(0, Number(qddr.qty) || 0)
    const batchSu = String(qddr.batch_code_su_number || '').trim()
    const matCode = String(qddr.material_code || '').trim()

    let stockDeductedInfo = null

    // 1. Reduce stock on matching external_inventory_items record if synced
    if (batchSu || matCode) {
      let existingItem = null
      if (batchSu) {
        const { data } = await supabase
          .from('external_inventory_items')
          .select('*')
          .ilike('batch_code_su_number', batchSu)
          .maybeSingle()
        existingItem = data
      }
      if (!existingItem && matCode) {
        const { data } = await supabase
          .from('external_inventory_items')
          .select('*')
          .ilike('material_code', matCode)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        existingItem = data
      }

      if (existingItem) {
        const previousStock = Number(existingItem.current_stock_qty) || 0
        const nextStock = Math.max(0, previousStock - affectedQty)
        const nextDeducted = (Number(existingItem.deducted_qty) || 0) + affectedQty

        await supabase
          .from('external_inventory_items')
          .update({
            current_stock_qty: nextStock,
            deducted_qty: nextDeducted,
            last_qddr_ref: sanitizedPayload.reference_no,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingItem.id)

        stockDeductedInfo = {
          batch_code_su_number: existingItem.batch_code_su_number,
          previous_stock_qty: previousStock,
          deducted_qty: affectedQty,
          new_stock_qty: nextStock
        }
      }
    }

    // Update QDDR sync timestamp
    await supabase
      .from('qddr_reports')
      .update({
        inventory_sync_status: 'pushed',
        inventory_synced_at: new Date().toISOString()
      })
      .eq('id', qddr.id)

    await logIntegrationEvent({
      direction: 'outbound',
      channel: 'api_push',
      eventType: 'qddr.closed.stock_deduction',
      status: 'success',
      referenceNo: sanitizedPayload.reference_no,
      summary: stockDeductedInfo
        ? `Closed ${sanitizedPayload.reference_no}: Deducted ${affectedQty} unit(s) from SU ${stockDeductedInfo.batch_code_su_number} (${stockDeductedInfo.previous_stock_qty} → ${stockDeductedInfo.new_stock_qty})`
        : `Closed ${sanitizedPayload.reference_no}: Queued ${affectedQty} damaged unit(s) (SU: ${batchSu || 'N/A'}) for external inventory deduction`,
      payload: {
        ...sanitizedPayload,
        stock_adjustment: stockDeductedInfo
      }
    })

    // 2. Dispatch to active Outbound Webhooks
    const { data: activeWebhooks } = await supabase
      .from('integration_webhooks')
      .select('*')
      .eq('is_active', true)

    for (const wh of activeWebhooks || []) {
      const signed = signWebhookPayload(
        { ...sanitizedPayload, stock_adjustment: stockDeductedInfo },
        wh.secret_token
      )

      let statusCode = 200
      let deliveryStatus = 'success'

      try {
        // Loopback simulator URL or external URL
        if (wh.target_url.includes('/api/v1/external/simulator/webhook-receiver')) {
          statusCode = 200
        } else {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 6000)
          const res = await fetch(wh.target_url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-ResQ-Event': 'qddr.closed',
              'X-ResQ-Signature': signed.signature,
              'X-ResQ-Timestamp': signed.timestamp
            },
            body: signed.rawBody,
            signal: controller.signal
          })
          clearTimeout(timer)
          statusCode = res.status
          if (!res.ok) deliveryStatus = 'failed'
        }
      } catch (whErr) {
        statusCode = 0
        deliveryStatus = 'failed'
      }

      await supabase
        .from('integration_webhooks')
        .update({
          last_triggered_at: new Date().toISOString(),
          last_status_code: statusCode
        })
        .eq('id', wh.id)

      await logIntegrationEvent({
        direction: 'outbound',
        channel: 'webhook',
        eventType: 'webhook.qddr.closed',
        status: deliveryStatus,
        referenceNo: sanitizedPayload.reference_no,
        summary: `Dispatched signed webhook to "${wh.name}" (${wh.target_url}) — HTTP ${statusCode || 'ERR'}`,
        payload: {
          webhook_name: wh.name,
          target_url: wh.target_url,
          signature_header: signed.signature,
          qddr_ref: sanitizedPayload.reference_no
        }
      })
    }

    return { sanitizedPayload, stockDeductedInfo }
  } catch (err) {
    logger.error(`[integrationService] dispatchClosedQddrToInventoryIntegration error: ${err.message}`)
    return null
  }
}

// ─── 4. External API: Poll & Acknowledge Closed QDDRs ────────────────────────

export async function getClosedQddrsForExternalApi({ onlyUnsynced = false, limit = 50, keyPrefix = null, ipAddress = null } = {}) {
  await ensureIntegrationSchema()
  let query = supabase
    .from('qddr_reports')
    .select('*')
    .ilike('status', 'closed')
    .order('id', { ascending: false })
    .limit(Math.min(200, Math.max(1, Number(limit) || 50)))

  if (onlyUnsynced) {
    query = query.neq('inventory_sync_status', 'acknowledged')
  }

  const { data, error } = await query
  if (error) throw error

  const sanitizedList = (data || []).map(buildSanitizedClosedQddrPayload)

  if (keyPrefix) {
    await logIntegrationEvent({
      direction: 'outbound',
      channel: 'api',
      eventType: 'qddr.closed.polled',
      status: 'success',
      keyPrefix,
      summary: `External system polled ${sanitizedList.length} closed QDDR report(s)`,
      ipAddress
    })
  }

  return sanitizedList
}

export async function acknowledgeClosedQddrStockDeduction({ idOrRef, keyPrefix = null, ipAddress = null, notes = '' }) {
  await ensureIntegrationSchema()
  const raw = String(idOrRef || '').trim()

  let query = supabase.from('qddr_reports').select('*')
  if (/^\d+$/.test(raw)) {
    query = query.eq('id', Number(raw))
  } else {
    query = query.ilike('reference_no', raw)
  }

  const { data: qddr, error } = await query.maybeSingle()
  if (error) throw error
  if (!qddr) {
    const err = new Error(`QDDR "${raw}" not found.`)
    err.status = 404
    throw err
  }

  const { data: updated, error: updateErr } = await supabase
    .from('qddr_reports')
    .update({
      inventory_sync_status: 'acknowledged',
      inventory_synced_at: new Date().toISOString()
    })
    .eq('id', qddr.id)
    .select('*')
    .maybeSingle()

  if (updateErr) throw updateErr

  await logIntegrationEvent({
    direction: 'inbound',
    channel: 'api',
    eventType: 'qddr.closed.acknowledged',
    status: 'success',
    keyPrefix,
    referenceNo: qddr.reference_no,
    summary: `External inventory system acknowledged stock deduction of ${qddr.qty || 0} unit(s) for ${qddr.reference_no}${notes ? ` (${notes})` : ''}`,
    ipAddress
  })

  return buildSanitizedClosedQddrPayload(updated)
}

export async function listIntegrationLogs(limit = 50) {
  await ensureIntegrationSchema()
  const { data, error } = await supabase
    .from('integration_sync_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(Math.min(200, Number(limit) || 50))

  if (error) throw error
  return data || []
}

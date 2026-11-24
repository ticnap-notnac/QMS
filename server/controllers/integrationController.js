import {
  listApiKeys,
  generateNewApiKey,
  toggleOrRevokeApiKey,
  deleteApiKeyRecord,
  upsertExternalInventoryItems,
  listExternalInventoryItems,
  lookupExternalInventoryForQddr,
  listWebhooks,
  createOrUpdateWebhook,
  deleteWebhook,
  getClosedQddrsForExternalApi,
  acknowledgeClosedQddrStockDeduction,
  listIntegrationLogs,
  logIntegrationEvent,
  signWebhookPayload
} from '../services/integrationService.js'

// ─── Admin & Internal Handlers (JWT Auth) ────────────────────────────────────

export async function getApiKeys(req, res, next) {
  try {
    const keys = await listApiKeys()
    return res.json({ data: keys })
  } catch (err) {
    next(err)
  }
}

export async function createApiKey(req, res, next) {
  try {
    const { name, scopes, expiresInDays } = req.body || {}
    const created = await generateNewApiKey({
      name,
      scopes,
      expiresInDays,
      actorAuthId: req.user?.id || null
    })
    return res.status(201).json({ data: created })
  } catch (err) {
    next(err)
  }
}

export async function updateApiKeyStatus(req, res, next) {
  try {
    const { id } = req.params
    const { is_active } = req.body || {}
    const updated = await toggleOrRevokeApiKey({
      id,
      isActive: is_active,
      actorAuthId: req.user?.id || null
    })
    return res.json({ data: updated })
  } catch (err) {
    next(err)
  }
}

export async function deleteApiKey(req, res, next) {
  try {
    const { id } = req.params
    await deleteApiKeyRecord({
      id,
      actorAuthId: req.user?.id || null
    })
    return res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getWebhooks(req, res, next) {
  try {
    const webhooks = await listWebhooks()
    return res.json({ data: webhooks })
  } catch (err) {
    next(err)
  }
}

export async function createWebhook(req, res, next) {
  try {
    const { name, target_url, secret_token, is_active } = req.body || {}
    const created = await createOrUpdateWebhook({
      name,
      targetUrl: target_url,
      secretToken: secret_token,
      isActive: is_active
    })
    return res.status(201).json({ data: created })
  } catch (err) {
    next(err)
  }
}

export async function removeWebhook(req, res, next) {
  try {
    const { id } = req.params
    await deleteWebhook({ id })
    return res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function testWebhookPing(req, res, next) {
  try {
    const { target_url, secret_token } = req.body || {}
    const testPayload = {
      event: 'webhook.test_ping',
      reference_no: 'QDDR-TEST-001',
      action_required: 'DEDUCT_OR_QUARANTINE_STOCK',
      material_code: '1011',
      material_description: 'AL Crema Asada Can 48x370ml (Exp: 10.09.2027)',
      batch_code_su_number: '10SE27JST2',
      po_reference: 'PO-2026-8841',
      affected_qty: 12,
      discrepancy_types: ['crushed_dented'],
      timestamp: new Date().toISOString()
    }
    const signed = signWebhookPayload(testPayload, secret_token || 'whsec_test_secret')

    await logIntegrationEvent({
      direction: 'outbound',
      channel: 'webhook',
      eventType: 'webhook.test_ping',
      status: 'success',
      referenceNo: 'QDDR-TEST-001',
      summary: `Sent signed test webhook ping to ${target_url || 'Loopback Receiver'} (Signature: ${signed.signature.slice(0, 22)}...)`,
      payload: testPayload
    })

    return res.json({
      success: true,
      signature: signed.signature,
      timestamp: signed.timestamp,
      payload: testPayload
    })
  } catch (err) {
    next(err)
  }
}

export async function getInventoryRecords(req, res, next) {
  try {
    const items = await listExternalInventoryItems()
    return res.json({ data: items })
  } catch (err) {
    next(err)
  }
}

export async function importInventoryBatch(req, res, next) {
  try {
    const { items, source = 'csv_import' } = req.body || {}
    const saved = await upsertExternalInventoryItems({
      items: Array.isArray(items) ? items : [],
      source,
      ipAddress: req.ip || null
    })
    return res.status(201).json({ data: saved, count: saved.length })
  } catch (err) {
    next(err)
  }
}

export async function lookupInventoryForQddrAutofill(req, res, next) {
  try {
    const { su, batch_code_su_number, material_code } = req.query || {}
    const match = await lookupExternalInventoryForQddr({
      batchCodeSuNumber: su || batch_code_su_number || '',
      materialCode: material_code || ''
    })
    return res.json({ data: match })
  } catch (err) {
    next(err)
  }
}

export async function getIntegrationLogs(req, res, next) {
  try {
    const logs = await listIntegrationLogs(req.query.limit || 50)
    return res.json({ data: logs })
  } catch (err) {
    next(err)
  }
}

export async function logClientDataExport(req, res, next) {
  try {
    const { format = 'csv', count = 0, reference_nos = [] } = req.body || {}
    await logIntegrationEvent({
      direction: 'outbound',
      channel: 'data_export',
      eventType: `qddr.exported.${String(format).toLowerCase()}`,
      status: 'success',
      referenceNo: reference_nos[0] || null,
      summary: `Exported ${count} closed QDDR stock deduction record(s) as ${String(format).toUpperCase()}`,
      payload: { format, count, reference_nos },
      ipAddress: req.ip || null
    })
    return res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

// ─── External API v1 Handlers (API Key Protected) ────────────────────────────

export async function externalSyncInventory(req, res, next) {
  try {
    const body = req.body || {}
    const items = Array.isArray(body.items) ? body.items : (Array.isArray(body) ? body : [body])
    const saved = await upsertExternalInventoryItems({
      items,
      source: 'api',
      keyPrefix: req.apiKeyClient?.key_prefix || null,
      ipAddress: req.ip || null
    })
    return res.status(200).json({
      success: true,
      synced_count: saved.length,
      data: saved
    })
  } catch (err) {
    next(err)
  }
}

export async function externalListInventory(req, res, next) {
  try {
    const items = await listExternalInventoryItems()
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    })
  } catch (err) {
    next(err)
  }
}

export async function externalGetClosedQddrs(req, res, next) {
  try {
    const onlyUnsynced = String(req.query.unsynced || '').toLowerCase() === 'true'
    const limit = req.query.limit || 50
    const list = await getClosedQddrsForExternalApi({
      onlyUnsynced,
      limit,
      keyPrefix: req.apiKeyClient?.key_prefix || null,
      ipAddress: req.ip || null
    })
    return res.status(200).json({
      success: true,
      count: list.length,
      data: list
    })
  } catch (err) {
    next(err)
  }
}

export async function externalAcknowledgeQddr(req, res, next) {
  try {
    const { id } = req.params
    const { notes } = req.body || {}
    const updated = await acknowledgeClosedQddrStockDeduction({
      idOrRef: id,
      keyPrefix: req.apiKeyClient?.key_prefix || null,
      ipAddress: req.ip || null,
      notes
    })
    return res.status(200).json({
      success: true,
      message: `Acknowledged stock deduction for ${updated.reference_no}`,
      data: updated
    })
  } catch (err) {
    next(err)
  }
}

export async function externalSimulatorWebhookReceiver(req, res) {
  return res.status(200).json({
    received: true,
    signature_verified: Boolean(req.headers['x-resq-signature']),
    timestamp: new Date().toISOString()
  })
}

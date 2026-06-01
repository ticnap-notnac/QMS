import { writeAudit } from '../lib/audit.js'
import { getRequestActor } from '../lib/requestUtils.js'
import {
  fetchAllProductTypes,
  resolveOrCreateProductType,
  removeProductType,
} from '../services/productTypeService.js'

// GET /product-types---------------------------------------------------------------------------
export async function getProductTypes(_req, res) {
  try {
    const data = await fetchAllProductTypes()
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

// POST /product-types---------------------------------------------------------------------------
export async function createProductType(req, res) {
  const rawName = req.body?.productName ?? req.body?.product_type_name

  try {
    const { record, created } = await resolveOrCreateProductType(rawName)

    if (created) {
      try {
        await writeAudit({
          level: 'audit',
          source: 'product_types',
          action: 'product_type_create',
          userAuthId: getRequestActor(req),
          details: { id: record?.id ?? null, product_type_name: record?.product_name ?? rawName },
        })
      } catch (auditErr) {
        console.warn('Failed to record product_type_create audit:', auditErr?.message ?? auditErr)
      }

      return res.status(201).json(record)
    }

    // Idempotent — existing record returned, no audit needed.
    return res.status(200).json(record)
  } catch (err) {
    const status = err.statusCode ?? 500
    return res.status(status).json({ error: err.message })
  }
}

// DELETE /product-types/:id---------------------------------------------------------------------------
export async function deleteProductType(req, res) {
  const { id } = req.params

  try {
    const deleted = await removeProductType(id)

    try {
      await writeAudit({
        level: 'audit',
        source: 'product_types',
        action: 'product_type_delete',
        userAuthId: getRequestActor(req),
        details: { id: deleted.id, product_type_name: deleted.product_name ?? null },
      })
    } catch (auditErr) {
      console.warn('Failed to record product_type_delete audit:', auditErr?.message ?? auditErr)
    }

    return res.json({ success: true })
  } catch (err) {
    const status = err.statusCode ?? 500
    return res.status(status).json({ error: err.message })
  }
}
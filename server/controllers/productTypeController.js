import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'
import { getRequestActor } from '../lib/requestUtils.js'

function normalizeProductTypeName(value) {
  return String(value || '').trim()
}

export async function getProductTypes(_req, res) {
  const { data, error } = await supabase
    .from('product_types')
    .select('id, product_name')
    .order('product_name', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json((data || []).map((item) => ({
    id: item.id,
    product_type_name: item.product_name,
  })))
}

export async function createProductType(req, res) {
  const productTypeName = normalizeProductTypeName(req.body?.productName || req.body?.product_type_name)

  if (!productTypeName) {
    return res.status(400).json({ error: 'Product type name is required.' })
  }

  const { data: existing, error: lookupError } = await supabase
    .from('product_types')
    .select('id, product_name')
    .ilike('product_name', productTypeName)
    .maybeSingle()

  if (lookupError) {
    return res.status(500).json({ error: lookupError.message })
  }

  if (existing) {
    return res.status(200).json(existing)
  }

  const { data, error } = await supabase
    .from('product_types')
    .insert([{ product_name: productTypeName }])
    .select('id, product_name')
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'product_types',
      action: 'product_type_create',
      userAuthId: getRequestActor(req),
      details: { id: data?.id ?? null, product_type_name: data?.product_name || productTypeName },
    })
  } catch (auditError) {
    console.warn('Failed to record product_type_create audit:', auditError?.message || auditError)
  }

  return res.status(201).json(data)
}

export async function deleteProductType(req, res) {
  const { id } = req.params

  const { data: existing, error: lookupError } = await supabase
    .from('product_types')
    .select('id, product_name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError) {
    return res.status(500).json({ error: lookupError.message })
  }

  if (!existing) {
    return res.status(404).json({ error: 'Product type not found.' })
  }

  const { error } = await supabase.from('product_types').delete().eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'product_types',
      action: 'product_type_delete',
      userAuthId: getRequestActor(req),
      details: { id: existing.id, product_type_name: existing.product_name || null },
    })
  } catch (auditError) {
    console.warn('Failed to record product_type_delete audit:', auditError?.message || auditError)
  }

  return res.json({ success: true })
}

import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

export async function fetchAllProducts() {
  const { data, error } = await supabase
    .from('products')
    .select('id, product_name, product_type_id')
    .order('product_name', { ascending: true })

  if (error) return { data: null, error }
  return { data: data || [], error: null }
}

export async function createProduct({ productName, actorAuthId }) {
  const name = String(productName || '').trim()
  if (!name) {
    return { data: null, error: null, validationError: 'Product name is required.' }
  }

  const { data: existing, error: lookupError } = await supabase
    .from('products')
    .select('id, product_name, product_type_id')
    .ilike('product_name', name)
    .maybeSingle()

  if (lookupError) return { data: null, error: lookupError }
  if (existing) {
    return { data: existing, error: null, existed: true }
  }

  const { data, error } = await supabase
    .from('products')
    .insert([{ product_name: name }])
    .select('id, product_name, product_type_id')
    .maybeSingle()

  if (error) return { data: null, error }

  try {
    await writeAudit({
      level: 'audit',
      source: 'products',
      action: 'product_create',
      userAuthId: actorAuthId,
      details: { id: data.id, product_name: data.product_name }
    })
  } catch (auditError) {
    console.warn('Failed to record product_create audit:', auditError?.message || auditError)
  }

  return { data, error: null }
}

export async function deleteProduct({ id, actorAuthId }) {
  const { data: existing, error: lookupError } = await supabase
    .from('products')
    .select('id, product_name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError) return { success: false, error: lookupError }
  if (!existing) return { success: false, notFound: true }

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) return { success: false, error }

  try {
    await writeAudit({
      level: 'audit',
      source: 'products',
      action: 'product_delete',
      userAuthId: actorAuthId,
      details: { id: existing.id, product_name: existing.product_name }
    })
  } catch (auditError) {
    console.warn('Failed to record product_delete audit:', auditError?.message || auditError)
  }

  return { success: true, error: null }
}

export async function updateProduct({ id, product_name, actorAuthId }) {
  const name = String(product_name || '').trim()
  if (!name) {
    return { data: null, error: null, validationError: 'Product name is required.' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('products')
    .select('id, product_name')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError }
  if (!existing) return { notFound: true }

  const { data, error } = await supabase
    .from('products')
    .update({ product_name: name })
    .eq('id', id)
    .select('id, product_name, product_type_id')
    .maybeSingle()

  if (error) return { data: null, error, validationError: null }

  try {
    await writeAudit({
      level: 'audit',
      source: 'products',
      action: 'product_update',
      userAuthId: actorAuthId,
      details: { id: data.id, product_name: data.product_name }
    })
  } catch (auditError) {
    console.warn('Failed to record product_update audit:', auditError?.message || auditError)
  }

  return { data, error: null }
}

export async function assignProductsToProductType({ productTypeId, productIds = [], actorAuthId }) {
  const { error: clearError } = await supabase
    .from('products')
    .update({ product_type_id: null })
    .eq('product_type_id', productTypeId)

  if (clearError) return { success: false, error: clearError }

  if (productIds.length > 0) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ product_type_id: productTypeId })
      .in('id', productIds)

    if (updateError) return { success: false, error: updateError }
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'product_types',
      action: 'product_type_products_update',
      userAuthId: actorAuthId,
      details: { productTypeId, productIds }
    })
  } catch (auditError) {
    console.warn('Failed to record product_type_products_update audit:', auditError?.message || auditError)
  }

  return { success: true, error: null }
}

export async function createProductsBulk({ products, actorAuthId }) {
  if (!Array.isArray(products) || products.length === 0) {
    return { data: [], skipped: [], totalAdded: 0, totalSkipped: 0, validationError: 'Please provide at least one product.' }
  }

  const cleaned = []
  const seen = new Set()

  for (const item of products) {
    const rawName = typeof item === 'string' ? item : (item?.productName || item?.product_name || '')
    const name = String(rawName || '').trim()
    const productTypeId = typeof item === 'object' ? (item?.productTypeId || item?.product_type_id || null) : null

    if (!name) continue
    const lower = name.toLowerCase()
    if (seen.has(lower)) continue
    seen.add(lower)

    cleaned.push({
      product_name: name,
      product_type_id: productTypeId ? Number(productTypeId) : null,
    })
  }

  if (cleaned.length === 0) {
    return { data: [], skipped: [], totalAdded: 0, totalSkipped: 0, validationError: 'No valid product names were found.' }
  }

  // Fetch existing products to check for duplicates
  const { data: existingRows, error: lookupError } = await supabase
    .from('products')
    .select('id, product_name')

  if (lookupError) {
    return { data: null, error: lookupError }
  }

  const existingMap = new Set((existingRows || []).map((r) => String(r.product_name || '').trim().toLowerCase()))

  const toInsert = []
  const skipped = []

  for (const item of cleaned) {
    if (existingMap.has(item.product_name.toLowerCase())) {
      skipped.push(item.product_name)
    } else {
      toInsert.push(item)
    }
  }

  if (toInsert.length === 0) {
    return {
      data: [],
      skipped,
      totalAdded: 0,
      totalSkipped: skipped.length,
      error: null,
    }
  }

  const { data: inserted, error: insertError } = await supabase
    .from('products')
    .insert(toInsert)
    .select('id, product_name, product_type_id')

  if (insertError) {
    return { data: null, error: insertError }
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'products',
      action: 'product_bulk_create',
      userAuthId: actorAuthId,
      details: {
        addedCount: (inserted || []).length,
        skippedCount: skipped.length,
        addedProducts: (inserted || []).map((p) => p.product_name),
        skippedProducts: skipped,
      },
    })
  } catch (auditError) {
    console.warn('Failed to record product_bulk_create audit:', auditError?.message || auditError)
  }

  return {
    data: inserted || [],
    skipped,
    totalAdded: (inserted || []).length,
    totalSkipped: skipped.length,
    error: null,
  }
}

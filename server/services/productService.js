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

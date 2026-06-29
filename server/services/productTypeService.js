import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

export async function fetchAllProductTypes() {
  const { data, error } = await supabase
    .from('product_types')
    .select('id, product_name')
    .order('product_name', { ascending: true })

  if (error) return { data: null, error }
  const mapped = (data || []).map((item) => ({
    id: item.id,
    product_type_name: item.product_name
  }))
  return { data: mapped, error: null }
}

export async function createProductType({ productTypeName, actorAuthId }) {
  if (!productTypeName?.trim()) {
    return { data: null, error: null, validationError: 'Product type name is required.' }
  }

  const { data: existing, error: lookupError } = await supabase
    .from('product_types')
    .select('id, product_name')
    .ilike('product_name', productTypeName.trim())
    .maybeSingle()

  if (lookupError) return { data: null, error: lookupError }
  
  const mappedExisting = existing ? { id: existing.id, product_type_name: existing.product_name } : null
  if (existing) {
    return { data: mappedExisting, error: null, existed: true }
  }

  const { data, error } = await supabase
    .from('product_types')
    .insert([{ product_name: productTypeName.trim() }])
    .select('id, product_name')
    .maybeSingle()

  if (error) return { data: null, error }

  const mappedNew = { id: data.id, product_type_name: data.product_name }

  try {
    await writeAudit({
      level: 'audit',
      source: 'product_types',
      action: 'product_type_create',
      userAuthId: actorAuthId,
      details: { id: data.id, product_type_name: data.product_name }
    })
  } catch (auditError) {
    console.warn('Failed to record product_type_create audit:', auditError?.message || auditError)
  }

  return { data: mappedNew, error: null }
}

export async function deleteProductType({ id, actorAuthId }) {
  const { data: existing, error: lookupError } = await supabase
    .from('product_types')
    .select('id, product_name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError) return { success: false, error: lookupError }
  if (!existing) return { success: false, notFound: true }

  const { error } = await supabase.from('product_types').delete().eq('id', id)
  if (error) return { success: false, error }

  try {
    await writeAudit({
      level: 'audit',
      source: 'product_types',
      action: 'product_type_delete',
      userAuthId: actorAuthId,
      details: { id: existing.id, product_type_name: existing.product_name }
    })
  } catch (auditError) {
    console.warn('Failed to record product_type_delete audit:', auditError?.message || auditError)
  }

  return { success: true, error: null }
}

export async function updateProductType({ id, product_type_name, actorAuthId }) {
  if (!product_type_name?.trim()) {
    return { data: null, error: null, validationError: 'Product type name is required.' }
  }

  const { data: existing, error: fetchError } = await supabase
    .from('product_types')
    .select('id, product_name')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { success: false, error: fetchError }
  if (!existing) return { notFound: true }

  const { data, error } = await supabase
    .from('product_types')
    .update({ product_name: product_type_name.trim() })
    .eq('id', id)
    .select('id, product_name')
    .maybeSingle()

  if (error) return { data: null, error, validationError: null }

  const mappedNew = { id: data.id, product_type_name: data.product_name }

  try {
    await writeAudit({
      level: 'audit',
      source: 'product_types',
      action: 'product_type_update',
      userAuthId: actorAuthId,
      details: { id: data.id, product_type_name: data.product_name }
    })
  } catch (auditError) {
    console.warn('Failed to record product_type_update audit:', auditError?.message || auditError)
  }

  return { data: mappedNew, error: null }
}
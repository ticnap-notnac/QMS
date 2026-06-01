import { supabase } from '../lib/supabase.js'

function normalizeProductTypeName(value) {
  return String(value || '').trim()
}

export async function fetchAllProductTypes() {
  const { data, error } = await supabase
    .from('product_types')
    .select('id, product_name')
    .order('product_name', { ascending: true })

  if (error) throw error

  return (data || []).map((item) => ({
    id: item.id,
    product_type_name: item.product_name,
  }))
}

export async function resolveOrCreateProductType(rawName) {
  const productTypeName = normalizeProductTypeName(rawName)

  if (!productTypeName) {
    const err = new Error('Product type name is required.')
    err.statusCode = 400
    throw err
  }

  // Idempotency check — return existing record without creating a duplicate.
  const { data: existing, error: lookupError } = await supabase
    .from('product_types')
    .select('id, product_name')
    .ilike('product_name', productTypeName)
    .maybeSingle()

  if (lookupError) throw lookupError

  if (existing) {
    return { record: existing, created: false }
  }

  const { data, error } = await supabase
    .from('product_types')
    .insert([{ product_name: productTypeName }])
    .select('id, product_name')
    .maybeSingle()

  if (error) throw error

  return { record: data, created: true }
}

export async function removeProductType(id) {
  const { data: existing, error: lookupError } = await supabase
    .from('product_types')
    .select('id, product_name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError) throw lookupError

  if (!existing) {
    const err = new Error('Product type not found.')
    err.statusCode = 404
    throw err
  }

  const { error } = await supabase.from('product_types').delete().eq('id', id)

  if (error) throw error

  return existing
}
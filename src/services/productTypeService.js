import { request } from '@/lib/api'
import { getCurrentAuthId } from '@/services/authService'

async function buildAuthHeaders() {
  const userAuthId = await getCurrentAuthId()
  return userAuthId ? { 'x-user-auth-id': userAuthId } : {}
}

export async function fetchProductTypes() {
  const data = await request('/product-types')
  return (data || []).map((item) => ({
    ...item,
    product_type_name: item.product_type_name || item.product_name || '',
  }))
}

export const loadProductTypes = fetchProductTypes

export async function createProductType(productName) {
  const headers = await buildAuthHeaders()
  return await request('/product-types', { method: 'POST', headers, body: JSON.stringify({ productName }) })
}

export async function deleteProductType(id) {
  const headers = await buildAuthHeaders()
  await request(`/product-types/${id}`, { method: 'DELETE', headers })
  return true
}

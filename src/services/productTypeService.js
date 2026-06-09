import { request } from '@/lib/api'

export async function fetchProductTypes() {
  const data = await request('/product-types')
  return (data || []).map((item) => ({
    ...item,
    product_type_name: item.product_type_name || item.product_name || '',
  }))
}

export const loadProductTypes = fetchProductTypes

export async function createProductType(productName) {
  return await request('/product-types', { method: 'POST', body: JSON.stringify({ productTypeName: productName }) })
}

export async function deleteProductType(id) {
  await request(`/product-types/${id}`, { method: 'DELETE' })
  return true
}

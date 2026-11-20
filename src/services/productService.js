import { request } from '@/lib/api'

export async function fetchProducts() {
  const data = await request('/products')
  return (data || []).map((item) => ({
    ...item,
    product_name: item.product_name || '',
  }))
}

export const loadProducts = fetchProducts

export async function createProduct(productName) {
  return await request('/products', { method: 'POST', body: JSON.stringify({ productName }) })
}

export async function deleteProduct(id) {
  await request(`/products/${id}`, { method: 'DELETE' })
  return true
}

export async function updateProduct(id, product_name) {
  return await request(`/products/${id}`, { method: 'PUT', body: JSON.stringify({ product_name }) })
}

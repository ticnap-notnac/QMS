import { request } from '@/lib/api'

/**
 * Fetches all sites (San Pedro, Makati, etc.)
 * @returns {Promise<Array<{ id: number, site_name: string, site_code: string }>>}
 */
export async function fetchSites() {
  return request('/sites')
}

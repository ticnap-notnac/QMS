// src/services/siteService.js
// Frontend API wrapper for the sites endpoint.
// All API calls go through src/lib/api.js — never call supabase directly from services.

import { request } from '@/lib/api'

/**
 * Fetches all sites (San Pedro, Makati, etc.)
 * @returns {Promise<Array<{ id: number, site_name: string, site_code: string }>>}
 */
export async function fetchSites() {
  return request('/sites')
}

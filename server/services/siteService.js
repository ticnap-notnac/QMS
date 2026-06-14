// server/services/siteService.js
// Business logic for the sites lookup table.
// Follows the Layered Architecture pattern: only this file touches the DB for sites.

import { supabase } from '../lib/supabase.js'

/**
 * Returns all site records ordered by name.
 * @returns {{ data: object[], error: object|null }}
 */
export async function fetchAllSites() {
  const { data, error } = await supabase
    .from('sites')
    .select('id, site_name, site_code')
    .order('site_name', { ascending: true })

  return { data: data ?? [], error }
}

/**
 * Returns the site assigned to a given user by their auth_id.
 * @param {string} authId - Supabase auth UUID
 * @returns {{ data: object|null, error: object|null }}
 */
export async function fetchUserSite(authId) {
  if (!authId) return { data: null, error: null }

  const { data, error } = await supabase
    .from('users')
    .select('site_id, sites(id, site_name, site_code)')
    .eq('auth_id', authId)
    .maybeSingle()

  if (error) return { data: null, error }

  const site = data?.sites ?? null
  return { data: site, error: null }
}

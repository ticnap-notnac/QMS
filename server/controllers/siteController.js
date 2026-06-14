// server/controllers/siteController.js
// Request parsing + service invocation only. No business logic or DB queries here.

import { fetchAllSites } from '../services/siteService.js'

export async function getSites(_req, res, next) {
  try {
    const { data, error } = await fetchAllSites()
    if (error) throw error
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

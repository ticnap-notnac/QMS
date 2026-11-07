import { getRequestActor } from '../lib/requestUtils.js'
import { fetchComplianceStats, fetchComplianceTrends } from '../services/complianceService.js'

/**
 * GET /api/compliance
 * Returns the latest compliance score for all active ISO standards.
 */
export async function getComplianceStats(req, res, next) {
  try {
    const userAuthId = req.user?.id || getRequestActor(req)
    const stats = await fetchComplianceStats(userAuthId)
    return res.json(stats)
  } catch (err) {
    next(err)
  }
}

/**
 * GET /api/compliance/trends
 * Returns historical completed audit runs and their compliance percentages.
 */
export async function getComplianceTrends(req, res, next) {
  try {
    const userAuthId = req.user?.id || getRequestActor(req)
    const trends = await fetchComplianceTrends(userAuthId)
    return res.json(trends)
  } catch (err) {
    next(err)
  }
}

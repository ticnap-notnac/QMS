import { fetchComplianceStats, fetchComplianceTrends } from '../services/complianceService.js'

/**
 * GET /api/compliance
 * Returns the latest compliance score for all active ISO standards.
 */
export async function getComplianceStats(req, res, next) {
  try {
    const stats = await fetchComplianceStats()
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
    const trends = await fetchComplianceTrends()
    return res.json(trends)
  } catch (err) {
    next(err)
  }
}

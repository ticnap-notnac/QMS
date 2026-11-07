import { getRequestActor } from '../lib/requestUtils.js'
import { fetchResolutionTrends, fetchPendingRatings } from '../services/dashboardService.js'

export async function getResolutionTrends(req, res, next) {
  try {
    const userAuthId = req.user?.id || getRequestActor(req)
    const trends = await fetchResolutionTrends(userAuthId)
    return res.json(trends)
  } catch (err) {
    next(err)
  }
}

export async function getPendingRatings(req, res, next) {
  try {
    const userAuthId = req.user?.id || getRequestActor(req)
    if (!userAuthId) return res.status(401).json({ error: 'Unauthorized' })
    const pending = await fetchPendingRatings(userAuthId)
    return res.json(pending)
  } catch (err) {
    next(err)
  }
}

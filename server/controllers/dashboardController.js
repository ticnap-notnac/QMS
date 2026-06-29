import { fetchResolutionTrends, fetchPendingRatings } from '../services/dashboardService.js'

export async function getResolutionTrends(req, res, next) {
  try {
    const trends = await fetchResolutionTrends()
    return res.json(trends)
  } catch (err) {
    next(err)
  }
}

export async function getPendingRatings(req, res, next) {
  try {
    const userAuthId = req.user?.id
    if (!userAuthId) return res.status(401).json({ error: 'Unauthorized' })
    const pending = await fetchPendingRatings(userAuthId)
    return res.json(pending)
  } catch (err) {
    next(err)
  }
}

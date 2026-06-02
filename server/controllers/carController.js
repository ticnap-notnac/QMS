import { getRequestActor } from '../lib/requestUtils.js'
import { writeAudit } from '../lib/audit.js'
import { createCarReport } from '../services/carService.js'

export async function createCar(req, res) {
  const reportedByAuthId = getRequestActor(req)
  if (!reportedByAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })

  try {
    const { data } = await createCarReport({ body: req.body, reportedByAuthId })
    try {
      await writeAudit({
        level: 'audit',
        source: 'car_reports',
        action: 'car_create',
        userAuthId: reportedByAuthId,
        details: { id: data?.id ?? null, reference_no: data?.reference_no }
      })
    } catch (err) {
      console.warn('Failed to record CAR create audit:', err?.message || err)
    }
    return res.status(201).json(data)
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message })
  }
}

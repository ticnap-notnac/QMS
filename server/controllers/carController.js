import { getRequestActor } from '../lib/requestUtils.js'
import { writeAudit } from '../lib/audit.js'
import { createCarReport, submitCapaReport, verifyCarEffectiveness } from '../services/carService.js'

export async function createCar(req, res, next) {
  const reportedByAuthId = getRequestActor(req)
  if (!reportedByAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })

  try {
    const { data } = await createCarReport({ body: req.body, reportedByAuthId })
    await writeAudit({
      level: 'audit',
      source: 'car_reports',
      action: 'car_create',
      userAuthId: reportedByAuthId,
      details: { id: data?.id ?? null, reference_no: data?.reference_no }
    })
    return res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

export async function submitCapa(req, res, next) {
  const actorAuthId = getRequestActor(req)
  if (!actorAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })
  const { id } = req.params
  const { rootCauseAnalysis, correctiveAction, preventiveAction } = req.body

  try {
    const { data } = await submitCapaReport({
      carId: parseInt(id, 10),
      rootCauseAnalysis,
      correctiveAction,
      preventiveAction,
      actorAuthId
    })
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function verifyCar(req, res, next) {
  const actorAuthId = getRequestActor(req)
  if (!actorAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })
  const { id } = req.params
  const { outcome, notes } = req.body

  try {
    const { data } = await verifyCarEffectiveness({
      carId: parseInt(id, 10),
      outcome,
      notes,
      actorAuthId
    })
    return res.json(data)
  } catch (err) {
    next(err)
  }
}


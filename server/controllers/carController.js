import { getRequestActor } from '../lib/requestUtils.js'
import { writeAudit } from '../lib/audit.js'
import { createCarReport, submitCapaReport, verifyCarEffectiveness, fetchCarsForClause } from '../services/carService.js'
import { safeCreateNotificationsForRoles } from '../lib/notificationHelper.js'

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
    await safeCreateNotificationsForRoles({
      roleNames: ['admin', 'auditor'],
      title: `New CAR Submitted: ${data?.reference_no || 'Unknown'}`,
      message: `A new Corrective Action Report (CAR) ${data?.reference_no || ''} has been generated. Please review it.`,
      type: 'warning',
      reportId: data?.id ?? null
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

export async function getCarsForClause(req, res, next) {
  try {
    const clauseId = req.params.clauseId
    if (!clauseId || typeof clauseId !== 'string' || clauseId.trim().length === 0) {
      return res.status(400).json({ error: 'Invalid clause ID.' })
    }

    const cars = await fetchCarsForClause(clauseId.trim())
    return res.json(cars)
  } catch (err) {
    next(err)
  }
}

export async function editCar(req, res, next) {
  const actorAuthId = getRequestActor(req)
  if (!actorAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })
  const { id } = req.params

  try {
    const { updateCarReport } = await import('../services/carService.js')
    const { data } = await updateCarReport({
      carId: parseInt(id, 10),
      body: req.body,
      actorAuthId
    })
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function deleteCar(req, res, next) {
  const actorAuthId = getRequestActor(req)
  if (!actorAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })
  const { id } = req.params

  try {
    const { softDeleteCarReport } = await import('../services/carService.js')
    const { data } = await softDeleteCarReport({
      carId: parseInt(id, 10),
      actorAuthId
    })
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

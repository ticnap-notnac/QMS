import { getRequestActor } from '../lib/requestUtils.js'
import { writeAudit } from '../lib/audit.js'
import { createQddrReport } from '../services/qddrService.js'

export async function createQddr(req, res, next) {
  const reportedByAuthId = getRequestActor(req)
  if (!reportedByAuthId) return res.status(400).json({ error: 'Missing x-user-auth-id header.' })

  try {
    const { data } = await createQddrReport({ body: req.body, reportedByAuthId })
    await writeAudit({
      level: 'audit',
      source: 'qddr_reports',
      action: 'qddr_create',
      userAuthId: reportedByAuthId,
      details: { id: data?.id ?? null, reference_no: data?.reference_no }
    })
    return res.status(201).json(data)
  } catch (err) {
    next(err)
  }
}

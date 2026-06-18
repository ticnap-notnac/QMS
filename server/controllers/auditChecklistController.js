import { getRequestActor } from '../lib/requestUtils.js'
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../services/auditChecklistService.js'

export async function getTemplates(req, res, next) {
  const actorAuthId = getRequestActor(req)
  try {
    const templates = await fetchTemplates(actorAuthId)
    return res.json(templates)
  } catch (err) {
    next(err)
  }
}

export async function addTemplate(req, res, next) {
  const actorAuthId = getRequestActor(req)
  try {
    const template = await createTemplate(req.body, actorAuthId)
    return res.json(template)
  } catch (err) {
    next(err)
  }
}

export async function editTemplate(req, res, next) {
  const { id } = req.params
  const actorAuthId = getRequestActor(req)
  try {
    const template = await updateTemplate(id, req.body, actorAuthId)
    return res.json(template)
  } catch (err) {
    next(err)
  }
}

export async function removeTemplate(req, res, next) {
  const { id } = req.params
  try {
    const result = await deleteTemplate(id)
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

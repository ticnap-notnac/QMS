import { getRequestActor } from '../lib/requestUtils.js'
import issueTypeService from '../services/issueTypeService.js'

export async function getIssueTypes(req, res, next) {
  try {
    const data = await issueTypeService.fetchIssueTypes()
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function createIssueType(req, res, next) {
  const userAuthId = getRequestActor(req)
  const name = req.body?.issueTypeName || req.body?.issue_type_name
  try {
    const data = await issueTypeService.createIssueType({ name, userAuthId })
    return res.status(201).json(data)
  } catch (err) {
    if (err?.code === '23505' || (err?.message && err.message.includes('duplicate key value'))) {
      return res.status(400).json({ error: 'An issue category with this name already exists.' })
    }
    next(err)
  }
}

export async function deleteIssueType(req, res, next) {
  const { id } = req.params
  const userAuthId = getRequestActor(req)
  try {
    const result = await issueTypeService.deleteIssueType({ id, userAuthId })
    return res.json(result)
  } catch (err) {
    if (err?.code === '23503' || (err?.message && (err.message.includes('foreign key constraint') || err.message.includes('violates foreign key')))) {
      return res.status(400).json({ error: 'Cannot delete this issue category because existing records (such as CAR reports) are assigned to it.' })
    }
    next(err)
  }
}

export async function putIssueType(req, res, next) {
  const { id } = req.params
  const actorAuthId = getRequestActor(req)
  const issue_type_name = req.body?.issue_type_name || req.body?.issueTypeName
  try {
    const data = await issueTypeService.updateIssueType({ id, issue_type_name, actorAuthId })
    return res.json(data)
  } catch (err) {
    if (err?.code === '23505' || (err?.message && err.message.includes('duplicate key value'))) {
      return res.status(400).json({ error: 'An issue category with this name already exists.' })
    }
    next(err)
  }
}

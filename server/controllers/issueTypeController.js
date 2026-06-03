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
    next(err)
  }
}

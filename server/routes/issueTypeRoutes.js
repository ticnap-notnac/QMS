import { Router } from 'express'
import { createIssueType, deleteIssueType, getIssueTypes, putIssueType } from '../controllers/issueTypeController.js'

const router = Router()

router.get('/issue-types', getIssueTypes)
router.post('/issue-types', createIssueType)
router.delete('/issue-types/:id', deleteIssueType)
router.put('/issue-types/:id', putIssueType)

export default router

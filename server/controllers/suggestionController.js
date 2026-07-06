import { findSimilarCases, getCachedSuggestion, storeSuggestion, generateAiSuggestion, generateAiSuggestionFromText, autoClassifyTags } from '../services/suggestionService.js'
import boss from '../utils/queue.js'

export async function getSimilarCases(req, res, next) {
  try {
    const { ncrId } = req.params
    const data = await findSimilarCases(ncrId)
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function getCached(req, res, next) {
  try {
    const { ncrId } = req.params
    const data = await getCachedSuggestion(ncrId)
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function saveSuggestion(req, res, next) {
  try {
    const { ncr_id, suggestion, preventive_suggestion, confidence } = req.body
    await storeSuggestion({ ncrId: ncr_id, suggestion, confidence, type: 'corrective_action' })
    if (preventive_suggestion) {
      await storeSuggestion({ ncrId: ncr_id, suggestion: preventive_suggestion, confidence, type: 'preventive_action' })
    }
    return res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function generateSuggestion(req, res, next) {
  try {
    const { ncrId } = req.params
    const { deptName, previousSuggestions } = req.body
    
    // Enqueue the heavy CBR logic to pg-boss background worker
    const jobId = await boss.send('cbr-suggestion', { ncrId, deptName, previousSuggestions })
    
    return res.status(202).json({ success: true, message: 'Suggestion generation started in the background', jobId })
  } catch (err) {
    next(err)
  }
}

export async function generateSuggestionFromText(req, res, next) {
  try {
    const { description, issueType, deptName } = req.body
    
    // Enqueue the job
    const jobId = await boss.send('cbr-suggestion-text', { description, issueType, deptName })
    
    return res.status(202).json({ success: true, message: 'Text suggestion generation started in the background', jobId })
  } catch (err) {
    next(err)
  }
}

export async function classifyTags(req, res, next) {
  try {
    const { description, reportType } = req.body
    const tags = await autoClassifyTags(description, reportType)
    return res.json({ tags })
  } catch (err) {
    next(err)
  }
}

export async function getJobStatus(req, res, next) {
  try {
    const { jobId } = req.params
    const job = await boss.getJobById(jobId)
    if (!job) {
      return res.status(404).json({ error: 'Job not found' })
    }
    return res.json({ 
      state: job.state, 
      output: job.output,
      startedon: job.startedon,
      completedon: job.completedon
    })
  } catch (err) {
    next(err)
  }
}
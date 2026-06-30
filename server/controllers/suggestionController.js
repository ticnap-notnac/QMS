import { findSimilarCases, getCachedSuggestion, storeSuggestion, generateAiSuggestion, generateAiSuggestionFromText, autoClassifyTags } from '../services/suggestionService.js'

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
    const data = await generateAiSuggestion({ ncrId, deptName, previousSuggestions })
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function generateSuggestionFromText(req, res, next) {
  try {
    const { description, issueType, deptName } = req.body
    const data = await generateAiSuggestionFromText({ description, issueType, deptName })
    return res.json(data)
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
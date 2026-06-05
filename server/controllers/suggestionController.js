import { findSimilarCases, getCachedSuggestion, storeSuggestion, generateAiSuggestion, generateAiSuggestionFromText } from '../services/suggestionService.js'

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
    const { deptName } = req.body
    const data = await generateAiSuggestion({ ncrId, deptName })
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
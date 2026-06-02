import { findSimilarCases, getCachedSuggestion, storeSuggestion } from '../services/suggestionService.js'

export async function getSimilarCases(req, res) {
    try {
        const { ncrId } = req.params
        const data = await findSimilarCases(ncrId)
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch similar cases' })
    }
}

export async function getCached(req, res) {
    try {
        const { ncrId } = req.params
        const data = await getCachedSuggestion(ncrId)
        res.json(data)
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to fetch cached suggestion' })
    }
}

export async function saveSuggestion(req, res) {
    try {
        const { ncr_id, suggestion, confidence } = req.body
        await storeSuggestion({ ncrId: ncr_id, suggestion, confidence })
        res.json({ success: true })
    } catch (err) {
        res.status(500).json({ error: err.message || 'Failed to save suggestion' })
    }
}
import { request } from '@/lib/api'

export async function fetchSimilarCases(ncrId) {
    return await request(`/suggestions/similar/${ncrId}`)
}

export async function fetchExistingAiSuggestion(ncrId) {
    return await request(`/suggestions/cached/${ncrId}`)
}

export async function saveAiSuggestion(ncrId, suggestion, preventiveSuggestion, confidence) {
    return await request('/suggestions', {
        method: 'POST',
        body: JSON.stringify({ ncr_id: ncrId, suggestion, preventive_suggestion: preventiveSuggestion, confidence }),
    })
}

export async function generateAiSuggestion(ncrId, deptName, previousSuggestions = []) {
    return await request(`/suggestions/generate/${ncrId}`, {
        method: 'POST',
        body: JSON.stringify({ deptName, previousSuggestions }),
    })
}

export async function generateAiSuggestionFromText({ description, issueType, deptName }) {
    return await request('/suggestions/generate-text', {
        method: 'POST',
        body: JSON.stringify({ description, issueType, deptName }),
    })
}
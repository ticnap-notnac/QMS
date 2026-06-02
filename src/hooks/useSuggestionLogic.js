import { useState, useEffect } from 'react'
import { fetchSimilarCases, fetchExistingAiSuggestion, saveAiSuggestion } from '@/services/suggestionService'

export function useSuggestionLogic({ report, deptName }) {
    const [suggestion, setSuggestion] = useState(null)
    const [isSuggesting, setIsSuggesting] = useState(false)
    const [suggestionError, setSuggestionError] = useState(null)

    useEffect(() => {
        if (!report?.id) return
        loadSuggestion()
    }, [report?.id])

    const loadSuggestion = async () => {
        setIsSuggesting(true)
        setSuggestionError(null)
        try {
            // Step 1 — cached ai_predictions
            const cached = await fetchExistingAiSuggestion(report.id)
            if (cached) {
                setSuggestion({ text: cached.ai_suggestion, confidence: cached.confidence_score, cached: true })
                return
            }

            // Step 2 — data mine all sources
            const { report: reportData, caseRepo, ratedNcrs, carReports, qddrReports } = await fetchSimilarCases(report.id)

            // Step 3 — check case_repository for strong matches first
            const strongMatches = (caseRepo || []).filter(
                (c) => c.effectiveness_score >= 0.7 || c.times_used >= 3
            )
            if (strongMatches.length > 0) {
                const best = strongMatches[0]
                const text = `Based on ${strongMatches.length} similar past case(s) from repository: ${best.corrective_action}`
                setSuggestion({ text, confidence: best.effectiveness_score || 0.8, cached: false, fromRepository: true })
                await saveAiSuggestion(report.id, text, best.effectiveness_score || 0.8)
                return
            }

            // Step 4 — check rated NCR reports (rating >= 3)
            const ncrWithActions = (ratedNcrs || []).filter(
                (r) => r.corrective_actions?.length > 0 || r.resolution_details
            )
            if (ncrWithActions.length > 0) {
                const best = ncrWithActions[0]
                const action = best.corrective_actions?.[0]?.action_description || best.resolution_details
                const text = `Based on ${ncrWithActions.length} highly-rated similar NCR report(s): ${action}`
                setSuggestion({ text, confidence: 0.75, cached: false, fromRepository: true })
                await saveAiSuggestion(report.id, text, 0.75)
                return
            }

            // Step 5 — fall back to Claude AI with all mined data as context
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-20250514',
                    max_tokens: 1000,
                    messages: [
                        {
                            role: 'user',
                            content: `You are a quality control expert. Suggest a corrective action for this NCR report using all available context.

NCR Report:
- Description: ${report.description}
- Issue Type: ${report.issue_type || 'N/A'}
- Severity: ${report.severity}
- Department: ${deptName}
- Investigation: ${report.investigation_details || 'None'}

Case Repository Matches:
${caseRepo.length > 0
                                    ? caseRepo.map((c, i) => `${i + 1}. Keywords: ${c.problem_keywords || 'N/A'} | Action: ${c.corrective_action} | Score: ${c.effectiveness_score || 'N/A'}`).join('\n')
                                    : 'None'}

Rated NCR Reports (rating >= 3):
${ratedNcrs.length > 0
                                    ? ratedNcrs.map((r, i) => `${i + 1}. Description: ${r.description} | Resolution: ${r.resolution_details || 'N/A'}`).join('\n')
                                    : 'None'}

CAR Reports:
${carReports.length > 0
                                    ? carReports.map((c, i) => `${i + 1}. Issue: ${c.details_of_nonconformance || 'N/A'} | Action: ${c.corrective_action || 'N/A'}`).join('\n')
                                    : 'None'}

QDDR Reports:
${qddrReports.length > 0
                                    ? qddrReports.map((q, i) => `${i + 1}. Reason: ${q.reason_of_discrepancy || 'N/A'} | Action: ${q.corrective_action || 'N/A'}`).join('\n')
                                    : 'None'}

Provide a concise, actionable corrective action in 2-4 sentences and a confidence score 0.0-1.0.
Respond ONLY in this JSON format with no preamble or markdown:
{"suggestion": "your suggestion here", "confidence": 0.85}`
                        }
                    ]
                })
            })

            const data = await response.json()
            const text = data.content?.map(i => i.text || '').join('') || ''
            const clean = text.replace(/```json|```/g, '').trim()
            const parsed = JSON.parse(clean)

            setSuggestion({ text: parsed.suggestion, confidence: parsed.confidence, cached: false })
            await saveAiSuggestion(report.id, parsed.suggestion, parsed.confidence)

        } catch (err) {
            setSuggestionError('Could not generate suggestion.')
        } finally {
            setIsSuggesting(false)
        }
    }

    return { suggestion, isSuggesting, suggestionError, loadSuggestion }
}
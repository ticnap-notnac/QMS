import { useState, useEffect } from 'react'
import { fetchSimilarCases, fetchExistingAiSuggestion, saveAiSuggestion, generateAiSuggestion } from '@/services/suggestionService'

export function useSuggestionLogic({ report, deptName }) {
    const [suggestion, setSuggestion] = useState(null)
    const [isSuggesting, setIsSuggesting] = useState(false)
    const [suggestionError, setSuggestionError] = useState(null)

    const [rejectedSuggestions, setRejectedSuggestions] = useState([])

    useEffect(() => {
        if (!report?.id) return
        loadSuggestion(false)
    }, [report?.id])

    const loadSuggestion = async (isRegenerating = false) => {
        setIsSuggesting(true)
        setSuggestionError(null)
        
        try {
            let currentRejected = [...rejectedSuggestions]
            if (isRegenerating && suggestion?.text) {
                currentRejected.push(suggestion.text)
                setRejectedSuggestions(currentRejected)
            }

            // ── Step 1: Check ai_predictions cache ───────────────────────────
            if (!isRegenerating) {
                const cached = await fetchExistingAiSuggestion(report.id)
                if (cached) {
                    setSuggestion({
                        text: cached.ai_suggestion,
                        preventiveAction: cached.preventive_suggestion,
                        confidence: cached.confidence_score,
                        cached: true,
                        sourceDetails: 'Cache (Prior Generation)',
                        matchedFeatures: [],
                    })
                    return
                }
            }

            // ── Step 2: CBR — fetch & score all candidates ───────────────────
            const {
                report: reportData,
                bestMatch,
                minCbrScore,
                caseRepo,
                ratedNcrs,
                carReports,
                qddrReports,
            } = await fetchSimilarCases(report.id)

            // ── Step 3: CBR REUSE — use best match if score is above threshold ─
            const threshold = minCbrScore ?? 0.2
            if (!isRegenerating && bestMatch && bestMatch.cbr_score >= threshold && bestMatch.corrective_action) {
                const features = bestMatch.matched_features?.length > 0
                    ? bestMatch.matched_features.join(', ')
                    : 'general similarity'
                const source = bestMatch.source === 'repository' ? 'case repository' : 'past NCR report'
                const text = bestMatch.corrective_action
                const preventiveText = bestMatch.preventive_action || 'Implement standard verification and monitoring checks.'
                const confidence = Math.min(bestMatch.cbr_score, 1)

                setSuggestion({
                    text,
                    preventiveAction: preventiveText,
                    confidence,
                    cached: false,
                    fromRepository: true,
                    matchedFeatures: bestMatch.matched_features || [],
                    sourceDetails: `CBR Database (${source})`,
                })
                await saveAiSuggestion(report.id, text, preventiveText, confidence)
                return
            }

            // ── Step 4: AI fallback ──
            const result = await generateAiSuggestion(report.id, deptName, currentRejected)

            setSuggestion({
                text: result.suggestion,
                preventiveAction: result.preventive_suggestion,
                confidence: result.confidence,
                cached: false,
                matchedFeatures: [],
                sourceDetails: 'Generative AI (Gemini)',
            })

        } catch (err) {
            setSuggestionError('Could not generate suggestion.')
        } finally {
            setIsSuggesting(false)
        }
    }

    return { suggestion, isSuggesting, suggestionError, loadSuggestion }
}

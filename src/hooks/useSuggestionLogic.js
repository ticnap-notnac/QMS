import { useState, useEffect } from 'react'
import { fetchSimilarCases, fetchExistingAiSuggestion, saveAiSuggestion, generateAiSuggestion } from '@/services/suggestionService'

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
            // ── Step 1: Check ai_predictions cache ───────────────────────────
            const cached = await fetchExistingAiSuggestion(report.id)
            if (cached) {
                setSuggestion({
                    text: cached.ai_suggestion,
                    confidence: cached.confidence_score,
                    cached: true,
                })
                return
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
            if (bestMatch && bestMatch.cbr_score >= threshold && bestMatch.corrective_action) {
                const features = bestMatch.matched_features?.length > 0
                    ? bestMatch.matched_features.join(', ')
                    : 'general similarity'
                const source = bestMatch.source === 'repository' ? 'case repository' : 'past NCR report'
                const text = `Based on ${source} (matched on: ${features}): ${bestMatch.corrective_action}`
                const confidence = Math.min(bestMatch.cbr_score, 1)

                setSuggestion({
                    text,
                    confidence,
                    cached: false,
                    fromRepository: true,
                    matchedFeatures: bestMatch.matched_features || [],
                })
                await saveAiSuggestion(report.id, text, confidence)
                return
            }

            // ── Step 4: AI fallback — proxy through backend router to avoid CORS & API key exposure ──
            const result = await generateAiSuggestion(report.id, deptName)

            setSuggestion({
                text: result.suggestion,
                confidence: result.confidence,
                cached: false,
                matchedFeatures: [],
            })

        } catch (err) {
            setSuggestionError('Could not generate suggestion.')
        } finally {
            setIsSuggesting(false)
        }
    }

    return { suggestion, isSuggesting, suggestionError, loadSuggestion }
}
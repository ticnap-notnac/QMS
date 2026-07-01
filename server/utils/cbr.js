/**
 * server/utils/cbr.js
 *
 * Case-Based Reasoning (CBR) utilities for corrective action suggestion.
 *
 * CBR Similarity Formula:
 *   score = 0.35 × issue_type_match
 *         + 0.35 × keyword_jaccard
 *         + 0.15 × severity_match
 *         + 0.10 × department_match
 *         + 0.05 × product_type_match
 *
 * Final score is blended with effectiveness_score as a quality modifier:
 *   final = cbr_score × 0.85 + effectiveness_norm × 0.15
 */

// ─── Stopwords ────────────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  // Common English
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were', 'be', 'been',
  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
  'could', 'should', 'may', 'might', 'shall', 'can', 'not', 'no', 'nor',
  'so', 'yet', 'both', 'either', 'neither', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'than', 'too', 'very', 'just', 'as', 'if',
  'then', 'that', 'this', 'these', 'those', 'it', 'its', 'we', 'they',
  'he', 'she', 'i', 'you', 'who', 'which', 'what', 'when', 'where', 'how',
  'there', 'here', 'our', 'their', 'any', 'all', 'into', 'about', 'per',
  'up', 'out', 'one', 'two', 'three', 'also', 'however', 'therefore', 'thus',
  // QMS noise words
  'report', 'ncr', 'issue', 'problem', 'department', 'found', 'observed',
  'noted', 'during', 'inspection', 'review', 'audit', 'nonconformance',
  'non', 'conformance', 'action', 'corrective', 'preventive', 'quality',
])

// ─── Keyword Extraction ───────────────────────────────────────────────────────

/**
 * Extracts meaningful keywords from a text string.
 * Strips punctuation, lowercases, removes stopwords and short tokens.
 * @param {string} text
 * @returns {Set<string>}
 */
export function extractKeywords(text) {
  if (!text) return new Set()
  return new Set(
    String(text)
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !STOPWORDS.has(word))
  )
}

/**
 * Returns a space-joined string of extracted keywords.
 * Used when storing problem_keywords in case_repository.
 * @param {string} text
 * @returns {string}
 */
export function extractKeywordsAsString(text) {
  return [...extractKeywords(text)].join(' ')
}

/**
 * Extracts semantic keywords using the Gemini LLM.
 * Acts as a query expansion step before Jaccard similarity.
 * @param {string} text 
 * @param {string} apiKey 
 * @returns {Promise<Set<string>>}
 */
export async function extractKeywordsWithLLM(text, apiKey) {
  if (!text || !apiKey) return extractKeywords(text);
  
  try {
    const prompt = `Extract 5-10 core technical concepts from the following issue description. Return them ONLY as a comma-separated list of standardized keywords. No explanations.\n\nDescription: ${text}`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    });

    if (!response.ok) {
      console.warn('Gemini extraction failed, falling back to lexical extraction.');
      return extractKeywords(text);
    }

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Parse comma separated list and clean
    const keywords = resultText
      .split(',')
      .map(k => k.trim().toLowerCase().replace(/[^a-z0-9]/g, ''))
      .filter(k => k.length > 2);
      
    if (keywords.length === 0) return extractKeywords(text);
    return new Set(keywords);
  } catch (err) {
    console.warn('Error during LLM keyword extraction, falling back:', err);
    return extractKeywords(text);
  }
}

// ─── Similarity Functions ─────────────────────────────────────────────────────

/**
 * Jaccard similarity between two keyword sets.
 * = |intersection| / |union|
 * @param {Set<string>} setA
 * @param {Set<string>} setB
 * @returns {number} 0.0 – 1.0
 */
export function jaccardSimilarity(setA, setB) {
  if (!setA.size || !setB.size) return 0
  const intersection = [...setA].filter(w => setB.has(w))
  const unionSize = setA.size + setB.size - intersection.length
  return intersection.length / unionSize
}

const SEVERITY_ORDER = { low: 0, medium: 1, high: 2 }

/**
 * Severity similarity:
 *   exact match    → 1.0
 *   one level diff → 0.5
 *   two+ levels    → 0.0
 * @param {string} a
 * @param {string} b
 * @returns {number} 0.0 – 1.0
 */
export function severitySimilarity(a, b) {
  if (!a || !b) return 0
  const levelA = SEVERITY_ORDER[String(a).toLowerCase().trim()] ?? -1
  const levelB = SEVERITY_ORDER[String(b).toLowerCase().trim()] ?? -1
  if (levelA === -1 || levelB === -1) return 0
  const diff = Math.abs(levelA - levelB)
  if (diff === 0) return 1.0
  if (diff === 1) return 0.5
  return 0.0
}

// ─── CBR Core ─────────────────────────────────────────────────────────────────

/**
 * Computes the weighted CBR similarity score between the current NCR report
 * and a past case (from case_repository or a rated NCR).
 *
 * @param {object} current  - The active NCR report
 * @param {object} past     - A candidate past case
 * @returns {{ score: number, matchedFeatures: string[] }}
 */
export function computeCBRScore(current, past) {
  const matchedFeatures = []

  // ── Feature 1: Issue Type (weight 0.35) ──────────────────────────────────
  let issueTypeScore = 0
  if (current.issue_type && past.issue_type && current.issue_type === past.issue_type) {
    issueTypeScore = 1.0
    matchedFeatures.push('issue type')
  }

  // ── Feature 2: Keyword Jaccard (weight 0.35) ─────────────────────────────
  const currentKw = current.llm_keywords || extractKeywords(current.description)
  const pastKw = extractKeywords(past.problem_keywords || past.description || '')
  const keywordScore = jaccardSimilarity(currentKw, pastKw)
  if (keywordScore > 0.05) matchedFeatures.push('problem keywords')

  // ── Feature 3: Severity (weight 0.15) ────────────────────────────────────
  const sevScore = severitySimilarity(current.severity, past.severity)
  if (sevScore >= 0.5) matchedFeatures.push('severity')

  // ── Feature 4: Department (weight 0.10) ──────────────────────────────────
  let deptScore = 0
  if (current.department_id && past.department_id &&
      String(current.department_id) === String(past.department_id)) {
    deptScore = 1.0
    matchedFeatures.push('department')
  }

  // ── Feature 5: Product Type (weight 0.05) ────────────────────────────────
  let productScore = 0
  if (current.product_type && past.product_type &&
      String(current.product_type).toLowerCase().trim() ===
      String(past.product_type).toLowerCase().trim()) {
    productScore = 1.0
    matchedFeatures.push('product type')
  }

  const score =
    0.35 * issueTypeScore +
    0.35 * keywordScore +
    0.15 * sevScore +
    0.10 * deptScore +
    0.05 * productScore

  return { score, matchedFeatures }
}

/**
 * CBR RETRIEVE step.
 * Scores all candidate past cases against the current report,
 * blends with effectiveness_score as a quality modifier, and returns
 * the highest-scoring candidate.
 *
 * Blend formula: final = cbr_score × 0.85 + effectiveness_norm × 0.15
 *
 * @param {object}   currentReport
 * @param {object[]} candidates   - Normalised past cases (case_repository + rated NCRs)
 * @returns {object|null} Best match with cbr_score and matched_features, or null
 */
export function retrieveBestMatch(currentReport, candidates) {
  if (!candidates?.length) return null

  const scored = candidates
    .filter(c => c.corrective_action) // only cases that have an actual solution
    .map(candidate => {
      const { score, matchedFeatures } = computeCBRScore(currentReport, candidate)
      
      // Normalise effectiveness_score (0-5 scale) to 0-1, default 0 if absent
      let effectivenessNorm = Math.min((candidate.effectiveness_score || 0) / 5, 1)
      
      // Apply Role-Based Rating Hierarchy (Admin/Auditor/Manager ratings carry more weight)
      const role = String(candidate.rater_role || '').toLowerCase().trim();
      let roleMultiplier = 1.0; // default for warehouse staff
      if (role.includes('auditor') || role.includes('admin')) {
        roleMultiplier = 1.2;
      } else if (role.includes('manager')) {
        roleMultiplier = 1.1;
      }
      
      // Apply multiplier, capping the maximum normalized effectiveness at 1.0
      effectivenessNorm = Math.min(effectivenessNorm * roleMultiplier, 1.0)

      const finalScore = score * 0.85 + effectivenessNorm * 0.15
      return { ...candidate, cbr_score: finalScore, matched_features: matchedFeatures }
    })

  if (!scored.length) return null
  scored.sort((a, b) => b.cbr_score - a.cbr_score)
  return scored[0]
}

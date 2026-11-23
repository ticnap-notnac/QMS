/**
 * server/utils/cbr.js
 *
 * Case-Based Reasoning (CBR) & RAG utilities for CAR and QDDR corrective/preventive action suggestion.
 *
 * Direct CBR Reuse Threshold:
 *   DIRECT_CBR_THRESHOLD = 0.75 (75%)
 *
 * Multi-Feature Base Similarity (baseSim):
 *   - QDDR: 0.45 × vectorSim + 0.35 × defectCategorySim + 0.20 × canonicalKeywordSim
 *   - CAR:  0.45 × vectorSim + 0.25 × rcaOverlap + 0.15 × categoryAndDeptSim + 0.15 × canonicalKeywordSim
 *
 * Final Score Blend:
 *   finalCbrScore = 0.80 × baseSim + 0.20 × effectivenessNorm
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
  // QMS / boilerplate template noise words
  'report', 'qddr', 'car', 'issue', 'problem', 'department', 'found', 'observed',
  'noted', 'during', 'inspection', 'review', 'audit', 'nonconformance',
  'non', 'conformance', 'action', 'corrective', 'preventive', 'quality',
  'identified', 'discrepancy', 'involving', 'unit', 'units', 'case', 'cases',
  'attached', 'photographic', 'evidence', 'confirms', 'physical', 'condition',
  'affected', 'stock', 'material', 'type', 'reason', 'item', 'code',
  'exhibiting', 'reported', 'requires', 'immediate', 'root', 'cause', 'analysis'
])

// ─── Domain Synonym Canonical Map ─────────────────────────────────────────────

const SYNONYM_CANONICAL_MAP = {
  // Holes / punctures / tears
  hole: 'hole',
  holes: 'hole',
  puncture: 'hole',
  punctured: 'hole',
  punctures: 'hole',
  pierce: 'hole',
  pierced: 'hole',
  tear: 'hole',
  torn: 'hole',
  rip: 'hole',
  ripped: 'hole',
  cut: 'hole',
  burst: 'hole',

  // Crushed / dented / deformed
  crush: 'crush',
  crushed: 'crush',
  dent: 'crush',
  dented: 'crush',
  dents: 'crush',
  collapse: 'crush',
  collapsed: 'crush',
  smash: 'crush',
  smashed: 'crush',
  bend: 'crush',
  bent: 'crush',
  deform: 'deform',
  deformed: 'deform',
  distort: 'deform',
  distorted: 'deform',
  warp: 'deform',
  warped: 'deform',
  mangle: 'deform',
  mangled: 'deform',

  // Wet / leaked / moisture
  wet: 'leak',
  leak: 'leak',
  leaked: 'leak',
  leaking: 'leak',
  leaks: 'leak',
  water: 'leak',
  spill: 'leak',
  spilled: 'leak',
  soak: 'leak',
  soaked: 'leak',
  moisture: 'leak',
  damp: 'leak',
  drip: 'leak',
  dripping: 'leak',

  // Packaging / containers
  box: 'carton',
  boxes: 'carton',
  carton: 'carton',
  cartons: 'carton',
  package: 'carton',
  packages: 'carton',
  packaging: 'carton',
  tin: 'can',
  tins: 'can',
  can: 'can',
  cans: 'can',
  container: 'container',
  containers: 'container',
  pallet: 'pallet',
  pallets: 'pallet',

  // Bulging / pressure
  bulge: 'bulge',
  bulging: 'bulge',
  swollen: 'bulge',
  swell: 'bulge',
  puffed: 'bulge',
  expanded: 'bulge',

  // Wrapping / sealing
  wrap: 'wrap',
  wrapped: 'wrap',
  wrapping: 'wrap',
  unwrapped: 'wrap',
  shrink: 'wrap',
  stretch: 'wrap',
  seal: 'seal',
  sealed: 'seal',
  unsealed: 'seal',
  tamper: 'seal',
  tampered: 'seal',

  // Stain / dirt / contamination
  stain: 'stain',
  stained: 'stain',
  graffiti: 'stain',
  dirt: 'stain',
  dirty: 'stain',
  soiled: 'stain',
  smudge: 'stain',
  discolored: 'stain',

  // Batch / lot / label
  batch: 'batch',
  batchcode: 'batch',
  lot: 'batch',
  expiry: 'expiry',
  expired: 'expiry',
  label: 'label',
  labels: 'label',
  unlabeled: 'label',
  unreadable: 'label',

  // Quantity / short / excess / picking / docs
  short: 'short',
  shortage: 'short',
  underpack: 'short',
  incomplete: 'short',
  missing: 'short',
  excess: 'excess',
  overpack: 'excess',
  surplus: 'excess',
  overage: 'excess',
  extra: 'excess',
  pick: 'pick',
  picking: 'pick',
  mispick: 'pick',
  fulfillment: 'pick',
  document: 'document',
  documentation: 'document',
  paperwork: 'document',
  invoice: 'document',
  manifest: 'document',
  receipt: 'document',

  // Parties
  supplier: 'vendor',
  suppliers: 'vendor',
  vendor: 'vendor',
  vendors: 'vendor',
  carrier: 'vendor',
  client: 'customer',
  clients: 'customer',
  customer: 'customer',
  customers: 'customer'
}

/**
 * Light stemmer and synonym canonicalizer for QMS/warehouse tokens.
 * Maps synonyms and inflected word forms (-ing, -ed, -es, -s) to a canonical root.
 * @param {string} word
 * @returns {string}
 */
export function normalizeToken(word) {
  if (!word) return ''
  const w = String(word).toLowerCase().trim()
  if (SYNONYM_CANONICAL_MAP[w]) return SYNONYM_CANONICAL_MAP[w]

  let stemmed = w
  if (stemmed.length > 5 && stemmed.endsWith('ing')) {
    stemmed = stemmed.slice(0, -3)
  } else if (stemmed.length > 4 && stemmed.endsWith('ed')) {
    stemmed = stemmed.slice(0, -2)
  } else if (stemmed.length > 4 && stemmed.endsWith('es')) {
    stemmed = stemmed.slice(0, -2)
  } else if (stemmed.length > 3 && stemmed.endsWith('s') && !stemmed.endsWith('ss')) {
    stemmed = stemmed.slice(0, -1)
  }

  return SYNONYM_CANONICAL_MAP[stemmed] || stemmed
}

// ─── Keyword Extraction ───────────────────────────────────────────────────────

/**
 * Extracts meaningful canonical keywords from a text string.
 * Strips punctuation, lowercases, removes stopwords/boilerplate, and normalizes synonyms.
 * @param {string} text
 * @returns {Set<string>}
 */
export function extractKeywords(text) {
  if (!text) return new Set()
  const rawTokens = String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2 && !STOPWORDS.has(word))

  const canonicalSet = new Set()
  for (const token of rawTokens) {
    const norm = normalizeToken(token)
    if (norm && norm.length > 2 && !STOPWORDS.has(norm)) {
      canonicalSet.add(norm)
    }
  }
  return canonicalSet
}

/**
 * Extracts semantic keywords using the Gemini LLM.
 * Acts as a query expansion step before Jaccard similarity.
 * @param {string} text
 * @param {string} apiKey
 * @returns {Promise<Set<string>>}
 */
export async function extractKeywordsWithLLM(text, apiKey) {
  if (!text || !apiKey) return extractKeywords(text)

  try {
    const prompt = `Extract 5-10 core technical concepts from the following issue description. Return them ONLY as a comma-separated list of standardized keywords. No explanations.\n\nDescription: ${text}`

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    })

    if (!response.ok) {
      console.warn('Gemini extraction failed, falling back to lexical extraction.')
      return extractKeywords(text)
    }

    const data = await response.json()
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

    const keywords = resultText
      .split(',')
      .map(k => normalizeToken(k.trim().toLowerCase().replace(/[^a-z0-9]/g, '')))
      .filter(k => k.length > 2 && !STOPWORDS.has(k))

    if (keywords.length === 0) return extractKeywords(text)
    return new Set(keywords)
  } catch (err) {
    console.warn('Error during LLM keyword extraction, falling back:', err)
    return extractKeywords(text)
  }
}

/**
 * Generates vector embeddings for a given text using Google's gemini-embedding-001 model.
 * Uses outputDimensionality: 768 to stay within pgvector's HNSW index limit (max 2000 dims).
 * @param {string} text
 * @param {string} apiKey
 * @returns {Promise<number[]|null>} Array of 768 floats (the embedding vector) or null
 */
export async function generateEmbedding(text, apiKey) {
  if (!text || !apiKey) return null

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: {
          parts: [{ text: text }]
        },
        outputDimensionality: 768
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.warn(`Gemini embedding failed (${response.status}): ${errText}`)
      return null
    }

    const data = await response.json()
    return data.embedding?.values || null
  } catch (err) {
    console.warn('Error generating embeddings:', err)
    return null
  }
}

// ─── Similarity & Rating Smoothing Functions ─────────────────────────────────

/**
 * Jaccard similarity between two sets.
 * = |intersection| / |union|
 * @param {Set<string>|string[]} setA
 * @param {Set<string>|string[]} setB
 * @returns {number} 0.0 – 1.0
 */
export function jaccardSimilarity(setA, setB) {
  const a = setA instanceof Set ? setA : new Set(setA || [])
  const b = setB instanceof Set ? setB : new Set(setB || [])
  if (!a.size || !b.size) return 0
  const intersection = [...a].filter(w => b.has(w))
  const unionSize = a.size + b.size - intersection.length
  return unionSize > 0 ? intersection.length / unionSize : 0
}

/**
 * Returns the authority weight multiplier for a rater's role.
 * Protects CBR effectiveness ratings against accidental single-user rating errors.
 * @param {string} roleName
 * @returns {number}
 */
export function getRoleRatingWeight(roleName) {
  const norm = String(roleName || '').trim().toLowerCase()
  if (
    norm === 'admin' ||
    norm === 'super admin' ||
    norm === 'super_admin' ||
    norm === 'system administrator' ||
    norm === 'system_administrator' ||
    norm === 'administrator' ||
    norm === 'superadmin'
  ) {
    return 1.5
  }
  if (norm === 'qa officer' || norm === 'auditor' || norm === 'quality assurance') {
    return 1.35
  }
  if (norm === 'department manager' || norm === 'inventory manager' || norm === 'team leader') {
    return 1.15
  }
  return 1.0
}

/**
 * Computes a Bayesian-damped, role-weighted effectiveness score (0.0 to 1.0)
 * from a list of { rating, role_name } entries.
 *
 * Prior: m = 2 virtual votes at C = 3.5 stars (0.70 baseline).
 * Formula: smoothedStars = (2 * 3.5 + sum(rating_i * weight_i)) / (2 + sum(weight_i))
 *
 * With this damping, a single accidental 1-star click by one user moves an unrated case
 * from 0.70 -> 0.5333 (keeping it above the 0.50 CBR eligibility cutoff), while
 * repeated low ratings or low QA/Admin verification ratings properly demote it below 0.50.
 *
 * @param {Array<{ rating: number, role_name?: string }>} ratingsWithRoles
 * @returns {number} Normalized effectiveness score in [0, 1] rounded to 4 decimals
 */
export function computeBayesianEffectivenessScore(ratingsWithRoles = []) {
  const PRIOR_WEIGHT = 2.0
  const PRIOR_STARS = 3.5

  if (!Array.isArray(ratingsWithRoles) || ratingsWithRoles.length === 0) {
    return Number((PRIOR_STARS / 5).toFixed(4)) // 0.70
  }

  let weightedStarSum = PRIOR_WEIGHT * PRIOR_STARS
  let totalWeight = PRIOR_WEIGHT

  for (const r of ratingsWithRoles) {
    const ratingVal = Number(r?.rating || 0)
    if (ratingVal >= 1 && ratingVal <= 5) {
      const w = getRoleRatingWeight(r?.role_name)
      weightedStarSum += ratingVal * w
      totalWeight += w
    }
  }

  const smoothedStars = totalWeight > 0 ? weightedStarSum / totalWeight : PRIOR_STARS
  return Number(Math.min(Math.max(smoothedStars / 5, 0), 1).toFixed(4))
}

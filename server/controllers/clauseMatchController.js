import { suggestClausesForCar } from '../services/clauseMatchService.js'

/**
 * POST /car/suggest-clauses
 *
 * Body: { description: string, flags: object }
 * Returns: Array<{ clause_id, clause_number, title, confidence }>
 */
export async function suggestClauses(req, res, next) {
  try {
    const { description, flags } = req.body || {}

    if (!description || String(description).trim().length < 5) {
      return res.status(400).json({ error: 'A meaningful description is required to suggest clauses.' })
    }

    const suggestions = await suggestClausesForCar({
      description: String(description).trim(),
      flags: flags || {}
    })

    return res.json({ suggestions })
  } catch (err) {
    next(err)
  }
}

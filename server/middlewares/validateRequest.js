import { ZodError } from 'zod'
import logger from '../utils/logger.js'

export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      if (parsed.body !== undefined) req.body = parsed.body
      if (parsed.query !== undefined) req.query = parsed.query
      if (parsed.params !== undefined) req.params = parsed.params
      next()
    } catch (error) {
      if (error && (error.name === 'ZodError' || error instanceof ZodError)) {
        const issues = error.issues || error.errors || []
        const details = issues.map(e => ({ path: e.path?.join('.'), message: e.message }))
        
        logger.warn(`Validation failed on ${req.method} ${req.originalUrl}: ${JSON.stringify(details)}`)
        
        return res.status(400).json({
          error: 'Validation failed',
          details
        })
      }
      next(error)
    }
  }
}

import { ZodError } from 'zod'

export const validateRequest = (schema) => {
  return async (req, res, next) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      })
      next()
    } catch (error) {
      if (error && (error.name === 'ZodError' || error instanceof ZodError)) {
        const issues = error.issues || error.errors || [];
        return res.status(400).json({
          error: 'Validation failed',
          details: issues.map(e => ({ path: e.path?.join('.'), message: e.message }))
        })
      }
      next(error)
    }
  }
}

import logger from '../utils/logger.js'

/**
 * Express global error handling middleware to capture exceptions
 * and return standardized JSON responses safely.
 */
export function errorHandler(err, req, res, next) {
  // Log full stack internally for debugging using Winston
  logger.error(`Express Request Handler Exception: ${err.message}`, err)

  const status = err?.status || err?.statusCode || 500
  
  // Sanitize 500 errors to prevent leaking stack traces or internal DB info
  const isInternalError = status === 500
  const message = isInternalError 
    ? 'An unexpected system error occurred. Our technical team has been notified. Please try again.' 
    : (err?.message || String(err) || 'An unexpected system error occurred. Our technical team has been notified. Please try again.')
    
  const details = isInternalError ? undefined : (err?.details || undefined)

  return res.status(status).json({
    error: message,
    details,
  })
}

export default { errorHandler }

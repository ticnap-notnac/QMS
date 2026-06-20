/**
 * Express global error handling middleware to capture exceptions
 * and return standardized JSON responses safely.
 */
export function errorHandler(err, req, res, next) {
  // Log full stack internally for debugging
  console.error('Express Request Handler Exception:', err)

  const status = err?.status || err?.statusCode || 500
  
  // Sanitize 500 errors to prevent leaking stack traces or internal DB info
  const isInternalError = status === 500
  const message = isInternalError 
    ? 'Internal server error' 
    : (err?.message || String(err) || 'Internal server error')
    
  const details = isInternalError ? undefined : (err?.details || undefined)

  return res.status(status).json({
    error: message,
    details,
  })
}

export default { errorHandler }

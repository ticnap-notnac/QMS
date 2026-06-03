/**
 * Express global error handling middleware to capture exceptions
 * and return standardized JSON responses safely.
 */
export function errorHandler(err, req, res, next) {
  // Log full stack internally for debugging
  console.error('Express Request Handler Exception:', err)

  const status = err?.status || err?.statusCode || 500
  const message = err?.message || String(err) || 'Internal server error'

  return res.status(status).json({
    error: message,
    details: err?.details || undefined,
  })
}

export default { errorHandler }

import logger from '../utils/logger.js'

/**
 * Express global error handling middleware to capture exceptions
 * and return standardized JSON responses safely.
 */
export function errorHandler(err, req, res, next) {
  // Log full stack internally for debugging using Winston
  logger.error(`Express Request Handler Exception: ${err.message}`, err)

  if (err?.name === 'MulterError') {
    let multerMessage = err.message || 'File upload error.'
    if (err.code === 'LIMIT_FILE_SIZE') {
      multerMessage = 'File size exceeds the maximum limit of 10 MB.'
    } else if (err.code === 'LIMIT_FILE_COUNT') {
      multerMessage = 'You can upload a maximum of 3 evidence files.'
    }
    return res.status(400).json({ error: multerMessage })
  }

  const status = err?.status || err?.statusCode || 500

  const message = err?.message || String(err) || 'An unexpected system error occurred. Our technical team has been notified. Please try again.'

  const details = status >= 500 ? undefined : (err?.details || undefined)

  return res.status(status).json({
    error: message,
    details,
  })
}

export default { errorHandler }

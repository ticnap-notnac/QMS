/**
 * server/utils/asyncHandler.js
 * 
 * Global wrapper for async Express routes. 
 * Prevents "Unhandled Promise Rejections" by catching any asynchronous errors
 * and automatically forwarding them to the global Express error middleware.
 */

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

export default asyncHandler

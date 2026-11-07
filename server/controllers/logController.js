import {
  getSystemLogs,
  insertSystemLog,
  recordSystemLogRead,
} from '../services/logService.js'
import logger from '../utils/logger.js'

function sanitizeLogField(value, maxLen = 500) {
  if (value === null || value === undefined) return ''
  return String(value)
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, maxLen)
}

export async function getLogs(req, res, next) {
  const rawLimit = Number(req.query.limit || 50)
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 1000) : 50
  const rawOffset = Number(req.query.offset || 0)
  const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0
  const { level, source, user_auth_id, userAuthId, from, to, action } = req.query || {}
  const userAuth = user_auth_id || userAuthId

  try {
    const result = await getSystemLogs({ limit, offset, level, source, userAuth, from, to, action })
    return res.json(result)
  } catch (err) {
    next(err)
  }
}

export async function insertLog(req, res, next) {
  try {
    const rawBody = { ...(req.body || {}) }
    delete rawBody.id
    delete rawBody.created_at
    delete rawBody.userAuthId
    rawBody.user_auth_id = req.user?.id || null
    rawBody.ip = req.ip || null

    const data = await insertSystemLog(rawBody)
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function recordLogRead(req, res, next) {
  try {
    const rawBody = { ...(req.body || {}) }
    delete rawBody.id
    delete rawBody.created_at
    delete rawBody.userAuthId
    rawBody.user_auth_id = req.user?.id || null

    const data = await recordSystemLogRead(rawBody)
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export function logClientError(req, res) {
  const { message, source, lineno, colno, error, userAgent, path } = req.body || {}
  const safeMessage = sanitizeLogField(message, 500)
  const safeSource = sanitizeLogField(source, 500)
  const safeStack = sanitizeLogField(error?.stack || error, 500)
  const safeUserAgent = sanitizeLogField(userAgent, 500)
  const safePath = sanitizeLogField(path, 500)

  logger.error(`Client Error: ${safeMessage}`, {
    source: 'frontend',
    client_source: safeSource,
    lineno: Number.isFinite(Number(lineno)) ? Number(lineno) : null,
    colno: Number.isFinite(Number(colno)) ? Number(colno) : null,
    stack: safeStack,
    userAgent: safeUserAgent,
    path: safePath
  })
  res.status(204).end()
}

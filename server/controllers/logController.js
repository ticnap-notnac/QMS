import {
  getSystemLogs,
  insertSystemLog,
  recordSystemLogRead,
} from '../services/logService.js'
import logger from '../utils/logger.js'

export async function getLogs(req, res, next) {
  const limit  = Number(req.query.limit  || 50)
  const offset = Number(req.query.offset || 0)
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
    const data = await insertSystemLog(req.body || {})
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export async function recordLogRead(req, res, next) {
  try {
    const data = await recordSystemLogRead(req.body || {})
    return res.json(data)
  } catch (err) {
    next(err)
  }
}

export function logClientError(req, res) {
  const { message, source, lineno, colno, error, userAgent, path } = req.body || {}
  logger.error(`Client Error: ${message}`, {
    source: 'frontend',
    client_source: source,
    lineno,
    colno,
    stack: error?.stack || error,
    userAgent,
    path
  })
  res.status(204).end()
}
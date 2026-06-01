import {
  getSystemLogs,
  insertSystemLog,
  recordSystemLogRead,
} from '../services/logService.js'


export async function getLogs(req, res) {
  const limit  = Number(req.query.limit  || 50)
  const offset = Number(req.query.offset || 0)
  const { level, source, user_auth_id, userAuthId, from, to, action } = req.query || {}
  const userAuth = user_auth_id || userAuthId

  try {
    const result = await getSystemLogs({ limit, offset, level, source, userAuth, from, to, action })
    return res.json(result)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}

export async function insertLog(req, res) {
  try {
    const data = await insertSystemLog(req.body || {})
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}


export async function recordLogRead(req, res) {
  try {
    const data = await recordSystemLogRead(req.body || {})
    return res.json(data)
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}
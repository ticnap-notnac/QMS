import crypto from 'crypto'
import { supabase } from '../lib/supabase.js'
import { ensureIntegrationSchema } from '../lib/ensureIntegrationSchema.js'

export function hashApiKey(rawKey) {
  return crypto.createHash('sha256').update(String(rawKey || '').trim()).digest('hex')
}

/**
 * timingSafeEqual check for two SHA-256 hex strings
 */
function safeCompareHex(hexA, hexB) {
  try {
    const bufA = Buffer.from(String(hexA || ''), 'hex')
    const bufB = Buffer.from(String(hexB || ''), 'hex')
    if (bufA.length !== bufB.length || bufA.length === 0) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

/**
 * Middleware to authenticate external systems using an API key (`x-api-key` or `Authorization: Bearer resq_...`)
 * and enforce granular least-privilege scopes (e.g., `inventory:write`, `inventory:read`, `qddr:read`, `qddr:write`).
 */
export function requireApiKey(requiredScope = null) {
  return async function apiKeyMiddleware(req, res, next) {
    try {
      await ensureIntegrationSchema()

      let rawKey = req.headers['x-api-key']
      if (!rawKey && req.headers.authorization) {
        const authHeader = String(req.headers.authorization)
        if (authHeader.toLowerCase().startsWith('bearer ')) {
          rawKey = authHeader.slice(7).trim()
        }
      }

      rawKey = String(rawKey || '').trim()
      if (!rawKey) {
        return res.status(401).json({
          error: 'Missing API key. Provide your key via the X-API-Key header or Authorization: Bearer <api_key>.'
        })
      }

      const incomingHash = hashApiKey(rawKey)

      const { data: keyRecord, error } = await supabase
        .from('api_keys')
        .select('id, name, key_prefix, key_hash, scopes, is_active, expires_at')
        .eq('key_hash', incomingHash)
        .maybeSingle()

      if (error || !keyRecord || !safeCompareHex(incomingHash, keyRecord.key_hash)) {
        await supabase.from('integration_sync_logs').insert([{
          direction: 'inbound',
          channel: 'api',
          event_type: 'auth.failed',
          status: 'rejected',
          key_prefix: rawKey.slice(0, 14),
          summary: `Rejected invalid API key attempt on ${req.method} ${req.originalUrl}`,
          ip_address: req.ip || null
        }]).catch(() => {})

        return res.status(401).json({
          error: 'Invalid API key.'
        })
      }

      if (!keyRecord.is_active) {
        await supabase.from('integration_sync_logs').insert([{
          direction: 'inbound',
          channel: 'api',
          event_type: 'auth.revoked_key',
          status: 'rejected',
          key_prefix: keyRecord.key_prefix,
          summary: `Blocked revoked API key "${keyRecord.name}" on ${req.method} ${req.originalUrl}`,
          ip_address: req.ip || null
        }]).catch(() => {})

        return res.status(401).json({
          error: 'This API key has been revoked.'
        })
      }

      if (keyRecord.expires_at && new Date(keyRecord.expires_at).getTime() < Date.now()) {
        await supabase.from('integration_sync_logs').insert([{
          direction: 'inbound',
          channel: 'api',
          event_type: 'auth.expired_key',
          status: 'rejected',
          key_prefix: keyRecord.key_prefix,
          summary: `Blocked expired API key "${keyRecord.name}" on ${req.method} ${req.originalUrl}`,
          ip_address: req.ip || null
        }]).catch(() => {})

        return res.status(401).json({
          error: 'This API key has expired.'
        })
      }

      const grantedScopes = Array.isArray(keyRecord.scopes) ? keyRecord.scopes : []
      if (requiredScope && !grantedScopes.includes(requiredScope) && !grantedScopes.includes('*')) {
        await supabase.from('integration_sync_logs').insert([{
          direction: 'inbound',
          channel: 'api',
          event_type: 'auth.insufficient_scope',
          status: 'forbidden',
          key_prefix: keyRecord.key_prefix,
          summary: `Key "${keyRecord.name}" missing required scope "${requiredScope}"`,
          ip_address: req.ip || null
        }]).catch(() => {})

        return res.status(403).json({
          error: `Insufficient API key permissions. Required scope: ${requiredScope}`
        })
      }

      // Non-blocking update of last_used_at
      supabase
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRecord.id)
        .then(() => {})
        .catch(() => {})

      req.apiKeyClient = {
        id: keyRecord.id,
        name: keyRecord.name,
        key_prefix: keyRecord.key_prefix,
        scopes: grantedScopes
      }

      next()
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to authenticate API key.'
      })
    }
  }
}

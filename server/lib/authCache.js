import NodeCache from 'node-cache'

const tokenCache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false })
const rbacCache = new NodeCache({ stdTTL: 60, checkperiod: 120, useClones: false })

const inFlightTokenRequests = new Map()
const inFlightRbacRequests = new Map()

/**
 * Resolves and caches a verified Supabase Auth user from a bearer token.
 * Deduplicates concurrent in-flight requests for the same token.
 */
export async function getOrFetchAuthUser(token, fetcherFn) {
  if (!token) return { user: null, error: new Error('Missing token') }

  const cachedUser = tokenCache.get(token)
  if (cachedUser) {
    return { user: cachedUser, error: null }
  }

  if (inFlightTokenRequests.has(token)) {
    return inFlightTokenRequests.get(token)
  }

  const promise = (async () => {
    try {
      const { data, error } = await fetcherFn(token)
      if (!error && data?.user) {
        tokenCache.set(token, data.user)
        return { user: data.user, error: null }
      }
      return { user: null, error: error || new Error('Invalid user') }
    } finally {
      inFlightTokenRequests.delete(token)
    }
  })()

  inFlightTokenRequests.set(token, promise)
  return promise
}

/**
 * Resolves and caches a user's RBAC profile, roleName, and permissions by authId.
 * Deduplicates concurrent in-flight requests for the same authId.
 */
export async function getOrFetchRbacProfile(authId, fetcherFn) {
  if (!authId) return { profile: null, roleName: null, permissions: null }

  const cached = rbacCache.get(authId)
  if (cached) {
    return cached
  }

  if (inFlightRbacRequests.has(authId)) {
    return inFlightRbacRequests.get(authId)
  }

  const promise = (async () => {
    try {
      const result = await fetcherFn(authId)
      if (result && result.profile) {
        rbacCache.set(authId, result)
      }
      return result
    } finally {
      inFlightRbacRequests.delete(authId)
    }
  })()

  inFlightRbacRequests.set(authId, promise)
  return promise
}

/**
 * Invalidates a specific user's cached RBAC profile (or clears all if authId is not provided).
 */
export function invalidateRbacCache(authId = null) {
  if (authId) {
    rbacCache.del(String(authId))
  } else {
    rbacCache.flushAll()
  }
}

/**
 * Clears all cached RBAC entries (e.g., when a role or role permissions are modified).
 */
export function clearAllRbacCache() {
  rbacCache.flushAll()
}

/**
 * Clears both token and RBAC caches.
 */
export function clearAllAuthCaches() {
  tokenCache.flushAll()
  rbacCache.flushAll()
}

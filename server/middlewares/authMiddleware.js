import { supabase } from '../lib/supabase.js'
import { getOrFetchAuthUser } from '../lib/authCache.js'

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    // Check if the header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'You are not logged in. Please log in to continue.' })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the JWT token using cached / deduplicated Supabase Auth lookup
    const { user, error } = await getOrFetchAuthUser(token, (t) => supabase.auth.getUser(t))

    if (error || !user) {
      return res.status(401).json({ error: 'Your session has expired or is invalid. Please log in again.' })
    }

    // Attach the authenticated user to the request object
    req.user = user
    
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(500).json({ error: 'We could not authenticate your session at this time. Please try again.' })
  }
}

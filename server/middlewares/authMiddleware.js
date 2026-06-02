import { supabase } from '../lib/supabase.js'

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    
    // Check if the header exists and starts with 'Bearer '
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid Authorization header. Must provide Bearer token.' })
    }

    const token = authHeader.split(' ')[1]
    
    // Verify the JWT token using Supabase
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Invalid or expired token.', details: error?.message })
    }

    // Attach the authenticated user to the request object
    req.user = data.user
    
    next()
  } catch (err) {
    console.error('Auth middleware error:', err)
    return res.status(500).json({ error: 'Internal server error during authentication.' })
  }
}

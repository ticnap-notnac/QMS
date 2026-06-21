import { useState } from 'react'
import { supabase } from '@/utils/supabase'
import { insertLog } from '@/services/logService'

function Login({
  onSubmit,
  onLearnMore,
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 🛡️ Safety Check: Pre-validate that your Vite client keys are loaded
      if (!supabase || !supabase.auth) {
        throw new Error("Application authentication client is uninitialized. Please check your configuration.")
      }

      // 🔌 Talk straight to the standard cloud Supabase client setup
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError

      // Check if user status is DEACTIVATED
      if (data?.user?.id) {
        const { data: dbUser, error: dbError } = await supabase
          .from('users')
          .select('status')
          .eq('auth_id', data.user.id)
          .maybeSingle()

        if (dbError) throw dbError

        if (dbUser && String(dbUser.status).toUpperCase() === 'DEACTIVATED') {
          await supabase.auth.signOut()
          throw new Error('Your account has been deactivated. Please contact an administrator.')
        }
      }

      // Log successful sign-in, but don't block auth flow if logging fails.
      try {
        await insertLog({
          level: 'audit',
          source: 'auth',
          action: 'user_login_success',
          userAuthId: data?.user?.id || null,
          details: {
            email,
            event: 'login_success',
          },
        })
      } catch (logErr) {
        console.warn('Failed to write successful-login log:', logErr?.message || logErr)
      }

      // Call the parent's onSubmit callback if provided
      if (onSubmit) {
        onSubmit({ user: data.user, session: data.session })
      }
    } catch (err) {
      setError(err.message || 'Login failed')
      console.error('Login error:', err)

      // Only attempt logging audit trails if the backend is actively listening
      try {
        await insertLog({
          level: 'warn',
          source: 'auth',
          action: 'user_login_failed',
          details: {
            email,
            event: 'login_failed',
            message: err?.message || 'Login failed',
          },
        })
      } catch (logErr) {
        console.warn('Failed to write failed-login log:', logErr?.message || logErr)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="layout layout--center">
      <section className="auth auth--center">
        <div className="card">
          <h1>Welcome to QFlow</h1>
          <p className="subtitle">Sign in to track inspections and stay audit-ready.</p>

          <form className="form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </label>

            <label className="field">
              <span>Password</span>
              <div className="input-wrap">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button 
                  className="icon-button" 
                  type="button" 
                  aria-label="Show password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M12 5c5.2 0 9.4 3.4 11 7-1.6 3.6-5.8 7-11 7S2.6 15.6 1 12c1.6-3.6 5.8-7 11-7zm0 2.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 2.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </label>

            {error ? <p className="error">{error}</p> : null}

            <button className="primary-button" type="submit" disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>

        <button className="secondary-button" type="button" onClick={onLearnMore}>
          Learn More
        </button>
      </section>
    </main>
  )
}

export default Login
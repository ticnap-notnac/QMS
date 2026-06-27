/**
 * Translates raw Supabase authentication errors into user-friendly messages.
 * 
 * @param {Error|string} err - The error object or error message string.
 * @param {string} [fallback] - The default message to return if the error is unrecognized.
 * @returns {string} - A user-friendly error message.
 */
export function translateAuthError(err, fallback = 'We could not sign you in right now. Please try again or contact your administrator.') {
  if (!err) return fallback;

  const msg = typeof err === 'string' ? err : err.message;
  if (!msg) return fallback;

  const lowerMsg = msg.toLowerCase();

  if (lowerMsg.includes('invalid login credentials')) {
    return '❌ Incorrect email or password. Please check your credentials and try again.';
  }
  
  if (lowerMsg.includes('email not confirmed')) {
    return '✉️ Your email address has not been verified. Please check your inbox for a confirmation link.';
  }
  
  if (lowerMsg.includes('too many requests')) {
    return '⏳ Too many login attempts. Please wait a few minutes before trying again.';
  }

  if (lowerMsg.includes('user not found')) {
    return '❌ No account found with that email address.';
  }

  return fallback;
}

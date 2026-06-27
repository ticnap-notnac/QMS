/**
 * A generic helper to translate raw error objects or strings into a safe, user-friendly fallback.
 * 
 * @param {Error|string|null} err - The error caught from a try/catch or API.
 * @param {string} fallbackMessage - The user-friendly default message to display.
 * @returns {string} - The safe fallback message.
 */
export function friendlyError(err, fallbackMessage) {
  // If we want to add specific global error code mapping later (e.g. 500 = 'Server down'),
  // we can do it here. For now, we strictly return the fallback message so raw errors
  // never leak to the UI.
  return fallbackMessage;
}

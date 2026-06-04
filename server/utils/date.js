/**
 * Safely formats a Date object or string to YYYY-MM-DD format.
 * Defaults to current local date if invalid or not provided.
 * @param {Date|string|number} [date]
 * @returns {string} YYYY-MM-DD
 */
export function getLocalDateString(date = new Date()) {
  try {
    const d = date instanceof Date ? date : new Date(date)
    if (Number.isNaN(d.getTime())) {
      const now = new Date()
      const offset = now.getTimezoneOffset()
      const local = new Date(now.getTime() - (offset * 60 * 1000))
      return local.toISOString().slice(0, 10)
    }
    const offset = d.getTimezoneOffset()
    const local = new Date(d.getTime() - (offset * 60 * 1000))
    return local.toISOString().slice(0, 10)
  } catch (err) {
    const now = new Date()
    const offset = now.getTimezoneOffset()
    const local = new Date(now.getTime() - (offset * 60 * 1000))
    return local.toISOString().slice(0, 10)
  }
}

export default { getLocalDateString }

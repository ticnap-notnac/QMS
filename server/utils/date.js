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
      return new Date().toISOString().slice(0, 10)
    }
    return d.toISOString().slice(0, 10)
  } catch (err) {
    return new Date().toISOString().slice(0, 10)
  }
}

export default { getLocalDateString }

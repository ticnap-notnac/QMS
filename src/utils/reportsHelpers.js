/**
 * Framework-agnostic business logic helper to resolve selection options from catalogs,
 * creating a new entry via createFn if it does not yet exist.
 */
export async function resolveCatalogSelection({ inputValue, selectedId, options, createFn, optionLabelKey }) {
  const trimmed = String(inputValue || '').trim()
  if (!trimmed) throw new Error('Selection value is required.')

  if (selectedId) {
    const byId = options.find((o) => String(o.id) === String(selectedId))
    if (byId) return { id: byId.id, label: byId[optionLabelKey] || byId.label || trimmed }
  }

  const exact = options.find(
    (o) => String(o[optionLabelKey] || o.label || '').trim().toLowerCase() === trimmed.toLowerCase(),
  )
  if (exact) return { id: exact.id, label: exact[optionLabelKey] || exact.label || trimmed }

  const created = await createFn(trimmed)
  const item = Array.isArray(created) ? created[0] : created
  return { id: item?.id, label: item?.[optionLabelKey] || item?.label || trimmed }
}

/**
 * Filters reports that are investigated but not yet closed.
 */
export function filterApprovalQueueReports(reports = []) {
  return (reports || []).filter(
    (r) => Boolean(r?.investigation_details) && String(r?.status || '').trim().toLowerCase() !== 'closed',
  )
}

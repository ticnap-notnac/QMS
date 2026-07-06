import { request } from '@/lib/api'
import { supabase } from '@/utils/supabase'

export async function submitQddrReport(payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')
  
  return await request('/qddr', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

export async function updateQddrReport(qddrId, payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/qddr/${qddrId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

/**
 * Updates a QDDR report fully
 */
export async function editQddrReport(qddrId, payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/qddr/${qddrId}/edit`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

/**
 * Soft deletes a QDDR report
 */
export async function deleteQddrReport(qddrId, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/qddr/${qddrId}`, {
    method: 'DELETE',
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

/**
 * Suggests ISO clauses for QDDR
 */
export async function suggestClausesForQddr(payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request('/qddr/suggest-clauses', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

/**
 * Fetches ISO clauses linked to a QDDR
 */
export async function fetchLinkedClausesForQddr(qddrId) {
  const { data, error } = await supabase
    .from('qddr_clause_links')
    .select(`
      clause_id,
      iso_clauses (
        clause_number,
        title
      )
    `)
    .eq('qddr_report_id', qddrId)

  if (error) throw error

  // Flatten the nested response
  return (data || []).map(row => ({
    clause_id: row.clause_id,
    clause_number: row.iso_clauses?.clause_number,
    title: row.iso_clauses?.title
  }))
}

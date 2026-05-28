import { supabase } from '@/utils/supabase'

export async function loadDepartments() {
  const { data, error } = await supabase
    .from('departments')
    .select('id, department_name')
    .order('department_name', { ascending: true })

  if (error) throw error

  return data || []
}

export async function createDepartment(departmentName) {
  const { data, error } = await supabase
    .from('departments')
    .insert([{ department_name: departmentName }])

  if (error) throw error

  return data
}

export async function deleteDepartment(id) {
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
  return true
}

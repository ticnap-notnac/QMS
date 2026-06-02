import { request } from '@/lib/api'

export async function loadDepartments() {
  return await request('/departments')
}

export async function createDepartment(departmentName) {
  return await request('/departments', {
    method: 'POST',
    body: JSON.stringify({ departmentName }),
  })
}

export async function deleteDepartment(id) {
  await request(`/departments/${id}`, {
    method: 'DELETE',
  })
  return true
}

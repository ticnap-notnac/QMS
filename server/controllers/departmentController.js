import { createGetHandler, createPostHandler, createDeleteHandler } from '../lib/crudController.js'
import {
  fetchAllDepartments,
  createDepartment,
  deleteDepartment
} from '../services/departmentService.js'

export const getDepartments = createGetHandler(fetchAllDepartments)

export const postDepartment = createPostHandler({
  serviceCreateFn: createDepartment,
  bodyKey: 'departmentName'
})

export const removeDepartment = createDeleteHandler({
  serviceDeleteFn: deleteDepartment
})
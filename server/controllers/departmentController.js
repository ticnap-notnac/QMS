import { createGetHandler, createPostHandler, createDeleteHandler, createPutHandler } from '../lib/crudController.js'
import {
  fetchAllDepartments,
  createDepartment,
  updateDepartment,
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

export const putDepartment = createPutHandler({
  serviceUpdateFn: updateDepartment,
  bodyKey: 'department_name'
})
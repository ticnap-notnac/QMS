import { z } from 'zod'

export const createUserSchema = z.object({
  body: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    userName: z.string().min(3, 'Username must be at least 3 characters'),
    contactNumber: z.string().optional().nullable(),
    roleId: z.string().or(z.number()).optional().nullable(),
    departmentId: z.string().or(z.number()).optional().nullable(),
    siteId: z.string().or(z.number()).optional().nullable(),
  })
})

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required')
  }),
  body: z.object({
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    email: z.string().email().optional(),
    contactNumber: z.string().optional().nullable(),
    roleId: z.string().or(z.number()).optional().nullable(),
    departmentId: z.string().or(z.number()).optional().nullable(),
    siteId: z.string().or(z.number()).optional().nullable(),
  }).refine(data => Object.keys(data).length > 0, {
    message: "Request body cannot be empty"
  })
})

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'User ID is required')
  }),
  body: z.object({
    status: z.string().min(1, 'Status is required')
  })
})

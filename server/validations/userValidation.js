import { z } from 'zod'

export const createUserSchema = z.object({
  body: z.object({
    firstName: z.string().trim().min(1, 'First name is required'),
    lastName: z.string().trim().min(1, 'Last name is required'),
    email: z.string().trim().email('Invalid email address').refine((value) => /@gmail\.com$/i.test(value), {
      message: 'Only Gmail addresses are allowed',
    }),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    userName: z.string().trim().min(3, 'Username must be at least 3 characters'),
    contactNumber: z.string().trim().optional().nullable(),
    roleId: z.union([z.string(), z.number()]).optional().nullable(),
    departmentId: z.union([z.string(), z.number()]).optional().nullable(),
    siteId: z.union([z.string(), z.number()]).optional().nullable(),
    positionId: z.union([z.string(), z.number()]).optional().nullable(),
    teamLeaderId: z.union([z.string(), z.number()]).optional().nullable(),
  })
})

export const updateUserSchema = z.object({
  params: z.object({
    id: z.union([z.string(), z.number()]).transform(val => String(val).trim()).refine(val => val.length > 0, 'User ID is required')
  }),
  body: z.object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    email: z.string().trim().email().optional(),
    userName: z.string().trim().min(3).optional(),
    contactNumber: z.string().trim().optional().nullable(),
    roleId: z.union([z.string(), z.number()]).optional().nullable(),
    departmentId: z.union([z.string(), z.number()]).optional().nullable(),
    siteId: z.union([z.string(), z.number()]).optional().nullable(),
    positionId: z.union([z.string(), z.number()]).optional().nullable(),
    teamLeaderId: z.union([z.string(), z.number()]).optional().nullable(),
    status: z.string().trim().optional(),
    password: z.string().min(6).optional().or(z.literal('')),
  }).refine(data => Object.keys(data).length > 0, {
    message: "Request body cannot be empty"
  })
})

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.union([z.string(), z.number()]).transform(val => String(val).trim()).refine(val => val.length > 0, 'User ID is required')
  }),
  body: z.object({
    status: z.string().trim().toUpperCase().refine(
      (val) => ['ACTIVE', 'INACTIVE', 'DEACTIVATED'].includes(val),
      { message: "Status must be either 'ACTIVE', 'INACTIVE', or 'DEACTIVATED'" }
    )
  })
})

export const assignTeamRosterSchema = z.object({
  body: z.object({
    teamLeaderId: z.union([z.string(), z.number()]),
    memberIds: z.array(z.union([z.string(), z.number()])),
  })
})

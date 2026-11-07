import { z } from 'zod'

export const createQddrSchema = z.object({
  body: z.object({
    material_description: z.string().min(1, 'Material description is required'),
    reason_of_discrepancy: z.string().min(1, 'Reason of discrepancy is required'),
  }).passthrough()
})

export const updateQddrSchema = z.object({
  body: z.object({
    material_description: z.string().optional().nullable(),
    reason_of_discrepancy: z.string().optional().nullable(),
    corrective_action: z.string().optional().nullable(),
    preventive_action: z.string().optional().nullable(),
    approved_by: z.union([z.string(), z.number()]).optional().nullable(),
    noted_by: z.union([z.string(), z.number()]).optional().nullable(),
    leader: z.union([z.string(), z.number()]).optional().nullable(),
    status: z.string().optional().nullable(),
  }).passthrough()
})

import { z } from 'zod'

export const createQddrSchema = z.object({
  body: z.object({
    material_description: z.string().min(1, 'Material description is required'),
    reason_of_discrepancy: z.string().min(1, 'Reason of discrepancy is required'),
  })
})

export const updateQddrSchema = z.object({
  body: z.object({
    material_description: z.string().optional(),
    reason_of_discrepancy: z.string().optional(),
    corrective_action: z.string().optional(),
    preventive_action: z.string().optional(),
    status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
  })
})

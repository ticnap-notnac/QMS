import { z } from 'zod'

export const createQddrSchema = z.object({
  body: z.object({
    material_description: z.string().min(1, 'Material description is required'),
    reason_of_discrepancy: z.string().min(1, 'Reason of discrepancy is required'),
  })
})

export const updateQddrSchema = z.object({
  body: z.object({
    material_description: z.string().optional().nullable(),
    reason_of_discrepancy: z.string().optional().nullable(),
    corrective_action: z.string().optional().nullable(),
    preventive_action: z.string().optional().nullable(),
    approved_by: z.string().optional().nullable(),
    noted_by: z.string().optional().nullable(),
    leader: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
  })
})

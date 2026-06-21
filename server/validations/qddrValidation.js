import { z } from 'zod'

export const createQddrSchema = z.object({
  body: z.object({
    discrepancyType: z.string().min(1, 'Discrepancy type is required'),
    discrepancyReason: z.string().min(1, 'Reason is required'),
    description: z.string().min(1, 'Description is required'),
  })
})

export const updateQddrSchema = z.object({
  body: z.object({
    discrepancyType: z.string().optional(),
    discrepancyReason: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['Open', 'In Progress', 'Resolved', 'Closed']).optional(),
  })
})

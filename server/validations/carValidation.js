import { z } from 'zod'

export const createCarSchema = z.object({
  body: z.object({
    requestor: z.string().optional(),
    details_of_nonconformance: z.string().min(1, 'Details of non-conformance is required'),
  }).passthrough()
})

export const submitCapaSchema = z.object({
  body: z.object({
    root_cause: z.string().min(1, 'Root cause is required'),
    corrective_action: z.string().min(1, 'Corrective action is required'),
    preventive_action: z.string().min(1, 'Preventive action is required'),
  })
})

export const verifyCarSchema = z.object({
  body: z.object({
    status: z.enum(['Verified', 'Rejected']),
    verification_notes: z.string().optional(),
  })
})

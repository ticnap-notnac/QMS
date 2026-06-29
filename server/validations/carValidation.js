import { z } from 'zod'

export const createCarSchema = z.object({
  body: z.object({
    requestor: z.string().optional(),
    details_of_nonconformance: z.string().min(1, 'Details of non-conformance is required'),
  }).passthrough()
})

export const submitCapaSchema = z.object({
  body: z.object({
    rootCauseAnalysis: z.string().min(1, 'Root cause analysis is required'),
    correctiveAction: z.string().min(1, 'Corrective action is required'),
    preventiveAction: z.string().min(1, 'Preventive action is required'),
  })
})

export const verifyCarSchema = z.object({
  body: z.object({
    outcome: z.enum(['effective', 'ineffective']),
    notes: z.string().optional(),
  })
})

import { z } from 'zod'

export const createCarSchema = z.object({
  body: z.object({
    requestor: z.string().optional().nullable(),
    details_of_nonconformance: z.string().min(1, 'Details of non-conformance is required'),
    department_id: z.union([z.string(), z.number()]).optional().nullable(),
    issue_type_id: z.union([z.string(), z.number()]).optional().nullable(),
    clause_ids: z.array(z.union([z.string(), z.number()])).optional().nullable(),
  }).passthrough()
})

export const submitCapaSchema = z.object({
  body: z.object({
    rootCauseAnalysis: z.string().min(1, 'Root cause analysis is required'),
    correctiveAction: z.string().min(1, 'Corrective action is required'),
    preventiveAction: z.string().min(1, 'Preventive action is required'),
    targetVerificationDate: z.string().optional().nullable(),
  }).passthrough()
})

export const verifyCarSchema = z.object({
  body: z.object({
    outcome: z.enum(['effective', 'ineffective']),
    notes: z.string().optional().nullable(),
    verificationRating: z.union([z.string(), z.number()]).optional().nullable(),
  }).passthrough().superRefine((data, ctx) => {
    if (data.outcome === 'effective' && (!data.verificationRating || String(data.verificationRating).trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Verification rating is required when marking a CAR as effective.',
        path: ['verificationRating'],
      })
    }
  })
})

import { z } from 'zod'

export const createReportSchema = z.object({
  body: z.object({
    batch_number: z.string().min(1, 'Batch number is required'),
    severity: z.string().min(1, 'Severity is required'),
    department_id: z.string().min(1, 'Department ID is required'),
    description: z.string().min(1, 'Description is required'),
  })
})

export const assignReportSchema = z.object({
  params: z.object({
    id: z.string().uuid('Report ID must be a valid UUID')
  }),
  body: z.object({
    assignedToId: z.string().uuid('Assigned To ID must be a valid UUID')
  })
})

export const reviewReportApprovalSchema = z.object({
  params: z.object({
    id: z.string().uuid('Report ID must be a valid UUID')
  }),
  body: z.object({
    decision: z.enum(['approve', 'reject'], { errorMap: () => ({ message: 'Decision must be either approve or reject.' }) }),
    reason: z.string().optional().nullable()
  }).superRefine((data, ctx) => {
    if (data.decision === 'reject' && (!data.reason || data.reason.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rejection reason is required.",
        path: ["reason"]
      });
    }
  })
})

export const rateReportSchema = z.object({
  params: z.object({
    id: z.string().uuid('Report ID must be a valid UUID')
  }),
  body: z.object({
    rating: z.number().min(0.5).max(5.0, 'Rating must be a number between 0.5 and 5.0.')
  })
})

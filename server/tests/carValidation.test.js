import { describe, it, expect, vi } from 'vitest'
import { validateRequest } from '../middlewares/validateRequest.js'
import { createCarSchema } from '../validations/carValidation.js'

describe('CAR Zod Validation', () => {
  it('should return 400 Bad Request if required CAR fields are missing', async () => {
    const req = {
      body: {
        // Missing description, which is required
      }
    }
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    const next = vi.fn()

    const middleware = validateRequest(createCarSchema)
    await middleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Validation failed'
      })
    )
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next() if valid payload is provided', async () => {
    const req = {
      body: {
        description: 'A valid CAR description',
      }
    }
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    }
    const next = vi.fn()

    const middleware = validateRequest(createCarSchema)
    await middleware(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })
})

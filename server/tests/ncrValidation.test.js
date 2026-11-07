import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { supabase } from '../lib/supabase.js';

vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user' } }, error: null }),
    },
    from: vi.fn((table) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue(
        table === 'roles'
          ? { data: { role_name: 'Admin', permissions: { pages: ['reports'], rights: ['create_ncr_report'] } }, error: null }
          : { data: { id: 1, auth_id: 'test-user', role_id: 1, status: 'ACTIVE' }, error: null }
      ),
    })),
  }
}));

describe('NCR Zod Validation', () => {
  it('should return 400 Bad Request if required NCR fields are missing', async () => {
    // Mock successful auth so it bypasses authMiddleware
    supabase.auth.getUser.mockResolvedValueOnce({ data: { user: { id: 'test-user' } }, error: null });

    // Send an empty payload to the create NCR route
    const res = await request(app)
      .post('/api/ncr')
      .set('Authorization', 'Bearer valid-token')
      .send({}); // Empty payload, missing batch_number, severity, etc.

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: 'body.batch_number' }),
        expect.objectContaining({ path: 'body.severity' }),
      ])
    );
  });
});

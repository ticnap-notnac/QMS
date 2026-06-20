import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { supabase } from '../lib/supabase.js';

// Mock Supabase to avoid hitting the actual database during tests
vi.mock('../lib/supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn() // Mock the from method to prevent real DB queries if it reaches a controller
  }
}));

describe('Authentication Middleware', () => {
  it('should return 401 if no Authorization header is provided', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Missing or invalid Authorization header');
  });

  it('should return 401 if token is invalid or expired', async () => {
    // Force the mock to return an error
    supabase.auth.getUser.mockResolvedValueOnce({ data: null, error: new Error('Token expired') });

    const res = await request(app)
      .get('/api/users')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid or expired token.');
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Login from './Login';

// Mock Supabase to avoid hitting the actual database
vi.mock('@/utils/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    }
  }
}));

describe('Login Component', () => {
  it('should render the login form correctly', () => {
    render(<Login />);
    
    // Check if the Welcome message is present
    expect(screen.getByRole('heading', { name: /Welcome to QFlow/i })).toBeInTheDocument();
    
    // Check if the inputs are present
    expect(screen.getByPlaceholderText(/Enter your email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your password/i)).toBeInTheDocument();
    
    // Check if the submit button is present
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });
});

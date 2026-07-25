-- Migration: Add role_id to positions table to associate positions with system roles

ALTER TABLE public.positions
  ADD COLUMN IF NOT EXISTS role_id bigint REFERENCES public.roles(id) ON DELETE SET NULL;

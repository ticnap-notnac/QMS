import pg from 'pg'
import logger from '../utils/logger.js'

const { Pool } = pg

let schemaEnsured = false
let poolInstance = null

export function getPgPool() {
  if (poolInstance) return poolInstance
  const connectionString = process.env.PG_BOSS_DATABASE_URL || process.env.DATABASE_URL
  if (!connectionString) return null

  poolInstance = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 8000
  })

  poolInstance.on('error', (err) => {
    logger.warn(`[integrationSchema] PG pool idle error: ${err.message}`)
  })

  return poolInstance
}

/**
 * Ensures the 3-Tier External Inventory Integration tables exist in PostgreSQL/Supabase:
 * 1. public.api_keys
 * 2. public.external_inventory_items
 * 3. public.integration_webhooks
 * 4. public.integration_sync_logs
 */
export async function ensureIntegrationSchema() {
  if (schemaEnsured) return true

  const pool = getPgPool()
  if (!pool) {
    logger.warn('[integrationSchema] No DATABASE_URL configured; skipping auto-DDL migration.')
    return false
  }

  const ddl = `
    CREATE TABLE IF NOT EXISTS public.api_keys (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      key_prefix TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      scopes TEXT[] NOT NULL DEFAULT ARRAY['inventory:write', 'inventory:read', 'qddr:read'],
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_used_at TIMESTAMPTZ NULL,
      expires_at TIMESTAMPTZ NULL,
      created_by TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.external_inventory_items (
      id SERIAL PRIMARY KEY,
      batch_code_su_number TEXT NOT NULL UNIQUE,
      material_code TEXT NULL,
      material_description TEXT NULL,
      expiry_date TEXT NULL,
      po_reference TEXT NULL,
      drwb_number TEXT NULL,
      brand_supplier TEXT NULL,
      trucker_broker TEXT NULL,
      plate_number TEXT NULL,
      container_number TEXT NULL,
      location TEXT NULL,
      initial_stock_qty INTEGER NOT NULL DEFAULT 0,
      current_stock_qty INTEGER NOT NULL DEFAULT 0,
      deducted_qty INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT 'cases',
      source TEXT NOT NULL DEFAULT 'api',
      last_qddr_ref TEXT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ext_inv_batch_su ON public.external_inventory_items (batch_code_su_number);
    CREATE INDEX IF NOT EXISTS idx_ext_inv_material_code ON public.external_inventory_items (material_code);

    CREATE TABLE IF NOT EXISTS public.integration_webhooks (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      target_url TEXT NOT NULL,
      secret_token TEXT NOT NULL,
      events TEXT[] NOT NULL DEFAULT ARRAY['qddr.closed'],
      is_active BOOLEAN NOT NULL DEFAULT true,
      last_triggered_at TIMESTAMPTZ NULL,
      last_status_code INTEGER NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS public.integration_sync_logs (
      id SERIAL PRIMARY KEY,
      direction TEXT NOT NULL DEFAULT 'inbound',
      channel TEXT NOT NULL DEFAULT 'api',
      event_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'success',
      key_prefix TEXT NULL,
      reference_no TEXT NULL,
      summary TEXT NULL,
      payload JSONB NULL,
      ip_address TEXT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE public.qddr_reports
      ADD COLUMN IF NOT EXISTS inventory_sync_status TEXT DEFAULT 'pending',
      ADD COLUMN IF NOT EXISTS inventory_synced_at TIMESTAMPTZ NULL;
  `

  try {
    await pool.query(ddl)
    schemaEnsured = true
    logger.info('[integrationSchema] External Inventory Integration schema verified/created.')
    return true
  } catch (err) {
    logger.warn(`[integrationSchema] Auto-DDL warning: ${err.message}`)
    return false
  }
}

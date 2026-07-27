import { PgBoss } from 'pg-boss'
import logger from './logger.js'

if (!process.env.DATABASE_URL && !process.env.PG_BOSS_DATABASE_URL) {
  logger.error('DATABASE_URL or PG_BOSS_DATABASE_URL is missing in .env')
}

let isStarted = false

// Initialize pg-boss with the connection string and SSL requirements for Supabase.
// Note: Supabase's Session Pooler (port 5432) DOES support LISTEN/NOTIFY,
// so pg-boss works fine through it. Direct connection is blocked locally by IPv6.
const boss = new PgBoss({
  connectionString: process.env.PG_BOSS_DATABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 2, // Limit pg-boss connection pool size to prevent exceeding Supabase pool limits (15)
})

boss.on('error', error => logger.error(`pg-boss error: ${error.message}`))

import { registerWorkers } from '../workers/cbrWorker.js'

/**
 * Starts the pg-boss queue system.
 * This should be called once when the server boots.
 */
export const startQueue = async () => {
  if (isStarted) return
  isStarted = true
  try {
    await boss.start()
    logger.info('pg-boss queue successfully started and connected to Supabase')
    
    // Register all background workers
    await registerWorkers()
    logger.info('Background workers registered')
    
  } catch (error) {
    isStarted = false
    logger.error(`Failed to start pg-boss: ${error.message}`)
  }
}

export default boss

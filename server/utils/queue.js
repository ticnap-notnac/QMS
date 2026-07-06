import { PgBoss } from 'pg-boss'
import logger from './logger.js'

if (!process.env.DATABASE_URL) {
  logger.error('DATABASE_URL is missing in .env')
}

// Initialize pg-boss with the connection string and SSL requirements for Supabase
const boss = new PgBoss({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
})

boss.on('error', error => logger.error(`pg-boss error: ${error.message}`))

import { registerWorkers } from '../workers/cbrWorker.js'

/**
 * Starts the pg-boss queue system.
 * This should be called once when the server boots.
 */
export const startQueue = async () => {
  try {
    await boss.start()
    logger.info('pg-boss queue successfully started and connected to Supabase')
    
    // Register all background workers
    await registerWorkers()
    logger.info('Background workers registered')
    
  } catch (error) {
    logger.error(`Failed to start pg-boss: ${error.message}`)
  }
}

export default boss

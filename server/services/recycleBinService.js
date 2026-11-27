import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'
import logger from '../utils/logger.js'
import { RECYCLE_BIN_RETENTION_DAYS } from '../../shared/constants.js'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Permanently deletes soft-deleted CAR and QDDR reports that have been in the
 * Recycle Bin longer than `retentionDays` (reusing `status = 'deleted'` and `updated_at`).
 *
 * @param {number} [retentionDays=RECYCLE_BIN_RETENTION_DAYS]
 * @returns {Promise<{deletedCars: number, deletedQddrs: number}>}
 */
export async function purgeExpiredRecycleBinReports(retentionDays = RECYCLE_BIN_RETENTION_DAYS) {
  const days = Math.max(1, Number(retentionDays) || RECYCLE_BIN_RETENTION_DAYS)
  const cutoffIso = new Date(Date.now() - days * MS_PER_DAY).toISOString()

  let deletedCars = 0
  let deletedQddrs = 0

  // 1. Find expired soft-deleted CAR reports
  const { data: expiredCars, error: carFindErr } = await supabase
    .from('car_reports')
    .select('id, reference_no')
    .eq('status', 'deleted')
    .lt('updated_at', cutoffIso)

  if (carFindErr) {
    throw carFindErr
  }

  if (expiredCars && expiredCars.length > 0) {
    const carIds = expiredCars.map((c) => c.id)
    const { error: linkDelErr } = await supabase
      .from('car_clause_links')
      .delete()
      .in('car_report_id', carIds)

    if (linkDelErr) {
      logger.warn(`Recycle Bin auto-purge: failed to delete car_clause_links: ${linkDelErr.message}`)
    }

    const { error: carDelErr } = await supabase
      .from('car_reports')
      .delete()
      .in('id', carIds)

    if (carDelErr) {
      throw carDelErr
    }
    deletedCars = carIds.length
  }

  // 2. Find expired soft-deleted QDDR reports
  const { data: expiredQddrs, error: qddrFindErr } = await supabase
    .from('qddr_reports')
    .select('id, reference_no')
    .eq('status', 'deleted')
    .lt('updated_at', cutoffIso)

  if (qddrFindErr) {
    throw qddrFindErr
  }

  if (expiredQddrs && expiredQddrs.length > 0) {
    const qddrIds = expiredQddrs.map((q) => q.id)
    const { error: qddrDelErr } = await supabase
      .from('qddr_reports')
      .delete()
      .in('id', qddrIds)

    if (qddrDelErr) {
      throw qddrDelErr
    }
    deletedQddrs = qddrIds.length
  }

  if (deletedCars > 0 || deletedQddrs > 0) {
    logger.info(
      `Recycle Bin auto-purge removed ${deletedCars} CAR(s) and ${deletedQddrs} QDDR(s) older than ${days} days.`
    )
    try {
      await writeAudit({
        level: 'audit',
        source: 'recycle_bin',
        action: 'recycle_bin_auto_purge',
        userAuthId: null,
        details: {
          retention_days: days,
          cutoff_iso: cutoffIso,
          deleted_cars: deletedCars,
          deleted_qddrs: deletedQddrs
        }
      })
    } catch (auditErr) {
      logger.warn(`Failed to write recycle_bin_auto_purge audit log: ${auditErr.message || auditErr}`)
    }
  }

  return { deletedCars, deletedQddrs }
}

/**
 * Runs an initial cleanup shortly after server boot and schedules a daily check
 * every 24 hours so expired Recycle Bin reports are purged even without pg_cron.
 */
export function startRecycleBinPurgeScheduler() {
  const runPurge = async () => {
    try {
      await purgeExpiredRecycleBinReports(RECYCLE_BIN_RETENTION_DAYS)
    } catch (err) {
      logger.error(`Recycle Bin auto-purge failed: ${err.message || err}`)
    }
  }

  const initialTimer = setTimeout(runPurge, 15 * 1000)
  if (typeof initialTimer.unref === 'function') {
    initialTimer.unref()
  }

  const interval = setInterval(runPurge, MS_PER_DAY)
  if (typeof interval.unref === 'function') {
    interval.unref()
  }

  return interval
}

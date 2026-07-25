/**
 * embed-cases.js
 *
 * Reusable script to generate and store vector embeddings for all rows
 * in the `case_repository` table where `embedding IS NULL`.
 *
 * Safe to re-run at any time — it will ONLY process rows that do not
 * yet have an embedding. Already-embedded rows are always skipped.
 *
 * Usage:
 *   node embed-cases.js
 */

import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from './utils/cbr.js'
import dotenv from 'dotenv'

dotenv.config()

// ─── Config ────────────────────────────────────────────────────────────────────

const SUPABASE_URL       = process.env.SUPABASE_URL?.replace('/rest/v1/', '') ?? ''
const SUPABASE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const GEMINI_API_KEY     = process.env.GEMINI_API_KEY ?? ''

// How many rows to process in one batch (avoid rate-limiting)
const BATCH_SIZE         = 10
// Delay in ms between each API call to stay under Gemini rate limits
const DELAY_MS           = 300

// ─── Helpers ───────────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// ─── Main ──────────────────────────────────────────────────────────────────────

async function run() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌  SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env')
    process.exit(1)
  }
  if (!GEMINI_API_KEY) {
    console.error('❌  GEMINI_API_KEY is missing from .env')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // ── 1. Fetch all rows with no embedding ──────────────────────────────────────
  console.log('🔍  Fetching case_repository rows with no embedding...')

  const { data: rows, error: fetchError } = await supabase
    .from('case_repository')
    .select('id, corrective_action, preventive_action, issue_type')
    .is('embedding', null)

  if (fetchError) {
    console.error('❌  Failed to fetch rows:', fetchError.message)
    process.exit(1)
  }

  if (!rows || rows.length === 0) {
    console.log('✅  All rows already have embeddings. Nothing to do!')
    process.exit(0)
  }

  console.log(`📋  Found ${rows.length} row(s) needing embeddings.\n`)

  let success = 0
  let failed  = 0

  // ── 2. Process each row ───────────────────────────────────────────────────────
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    // Build the text to embed: combine corrective + preventive for richer context
    const text = [
      row.corrective_action,
      row.preventive_action,
    ].filter(Boolean).join(' ')

    process.stdout.write(
      `   [${i + 1}/${rows.length}] ID ${row.id} (${row.issue_type || 'no type'})... `
    )

    const embedding = await generateEmbedding(text, GEMINI_API_KEY)

    if (!embedding) {
      console.log('⚠️  Skipped (embedding returned null)')
      failed++
    } else {
      // ── 3. Write embedding back to Supabase ─────────────────────────────────
      const { error: updateError } = await supabase
        .from('case_repository')
        .update({ embedding: `[${embedding.join(',')}]` })
        .eq('id', row.id)

      if (updateError) {
        console.log(`❌  Update failed: ${updateError.message}`)
        failed++
      } else {
        console.log(`✅  Done (${embedding.length} dims)`)
        success++
      }
    }

    // Respect rate limits — pause between calls
    if (i < rows.length - 1) {
      await sleep(DELAY_MS)
    }

    // Extra pause every BATCH_SIZE rows
    if ((i + 1) % BATCH_SIZE === 0 && i < rows.length - 1) {
      console.log(`\n⏳  Pausing 2s after batch of ${BATCH_SIZE}...\n`)
      await sleep(2000)
    }
  }

  // ── 4. Summary ────────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────')
  console.log(`✅  Success : ${success}`)
  console.log(`⚠️  Skipped  : ${failed}`)
  console.log(`📦  Total   : ${rows.length}`)
  console.log('─────────────────────────────────')

  if (failed > 0) {
    console.log('\n💡  Re-run this script to retry skipped rows.')
  } else {
    console.log('\n🎉  All embeddings generated! CBR Step 1 is now fully active.')
  }
}

run()

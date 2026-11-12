/**
 * embed-cases.js
 *
 * Script to generate and store vector embeddings for all rows
 * in `car_case_repository` and `qddr_case_repository` where `embedding IS NULL`.
 *
 * Usage:
 *   node embed-cases.js
 */

import { createClient } from '@supabase/supabase-js'
import { generateEmbedding } from './utils/cbr.js'
import dotenv from 'dotenv'

dotenv.config()

const SUPABASE_URL = process.env.SUPABASE_URL?.replace('/rest/v1/', '') ?? ''
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? ''

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function run() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from .env')
    process.exit(1)
  }
  if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY is missing from .env')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

  // 1. CAR Case Repository
  console.log('🔍 Checking car_case_repository rows with missing embeddings...')
  const { data: carRows, error: carErr } = await supabase
    .from('car_case_repository')
    .select('id, details_of_nonconformance')
    .is('embedding', null)

  if (carErr) {
    console.error('❌ Error fetching car_case_repository:', carErr.message)
  } else if (carRows && carRows.length > 0) {
    console.log(`Found ${carRows.length} CAR cases to embed.`)
    for (const r of carRows) {
      const emb = await generateEmbedding(r.details_of_nonconformance, GEMINI_API_KEY)
      if (emb) {
        await supabase
          .from('car_case_repository')
          .update({ embedding: `[${emb.join(',')}]` })
          .eq('id', r.id)
        console.log(`✅ Embedded CAR case #${r.id}`)
      }
      await sleep(300)
    }
  } else {
    console.log('✨ All car_case_repository rows have embeddings.')
  }

  // 2. QDDR Case Repository
  console.log('🔍 Checking qddr_case_repository rows with missing embeddings...')
  const { data: qddrRows, error: qddrErr } = await supabase
    .from('qddr_case_repository')
    .select('id, reason_of_discrepancy')
    .is('embedding', null)

  if (qddrErr) {
    console.error('❌ Error fetching qddr_case_repository:', qddrErr.message)
  } else if (qddrRows && qddrRows.length > 0) {
    console.log(`Found ${qddrRows.length} QDDR cases to embed.`)
    for (const r of qddrRows) {
      const emb = await generateEmbedding(r.reason_of_discrepancy, GEMINI_API_KEY)
      if (emb) {
        await supabase
          .from('qddr_case_repository')
          .update({ embedding: `[${emb.join(',')}]` })
          .eq('id', r.id)
        console.log(`✅ Embedded QDDR case #${r.id}`)
      }
      await sleep(300)
    }
  } else {
    console.log('✨ All qddr_case_repository rows have embeddings.')
  }

  console.log('🎉 Done!')
}

run()

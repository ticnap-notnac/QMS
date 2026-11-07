#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'logs', 'scripts'])
const ignoreFiles = new Set(['.env', 'server/.env', '.env.example', 'server/.env.example'])
const patterns = [
  /service_role_/,
  /sb_secret_/,
  /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*['"]?[A-Za-z0-9._-]{20,}/,
  /AIza[0-9A-Za-z-_]{35}/,
  /sk-or-v1-[0-9a-f]{64}/,
  /postgresql:\/\/[^$\s:]+:[^@\s$]+@/
]

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (ignoreDirs.has(e.name)) continue
      walk(full)
    } else {
      const rel = path.relative(root, full).replace(/\\/g, '/')
      if (ignoreFiles.has(rel) || path.basename(full).startsWith('.env')) continue
      if (
        full.endsWith('.png') ||
        full.endsWith('.jpg') ||
        full.endsWith('.jpeg') ||
        full.endsWith('.gif') ||
        full.endsWith('.ico') ||
        full.endsWith('.woff') ||
        full.endsWith('.woff2')
      ) {
        continue
      }
      const content = fs.readFileSync(full, 'utf8')
      for (const p of patterns) {
        if (p.test(content)) {
          console.error(`Secret pattern ${p} found in ${rel}`)
          process.exitCode = 2
        }
      }
    }
  }
}

walk(root)
if (process.exitCode) {
  console.error('Secret check failed')
  process.exit(process.exitCode)
} else {
  console.log('No secret patterns found')
}

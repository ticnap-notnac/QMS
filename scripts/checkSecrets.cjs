#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const root = process.cwd()
const ignoreDirs = new Set(['node_modules', '.git', 'scripts', 'server'])
const ignoreFiles = new Set(['server/.env'])
const patterns = [/service_role_/, /sb_secret_/, /SUPABASE_SERVICE_ROLE_KEY/]

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (ignoreDirs.has(e.name)) continue
      walk(full)
    } else {
      const rel = path.relative(root, full).replace(/\\/g, '/')
      if (ignoreFiles.has(rel)) continue
      if (full.endsWith('.png') || full.endsWith('.jpg') || full.endsWith('.jpeg') || full.endsWith('.gif')) continue
      const content = fs.readFileSync(full, 'utf8')
      for (const p of patterns) {
        if (p.test(content)) {
          console.error(`Secret pattern ${p} found in ${full}`)
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

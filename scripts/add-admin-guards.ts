// One-off script: add requireAdmin guard to all POST/PATCH/DELETE handlers in admin/ops routes.
import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'fs/promises'

const FILES = [
  'src/app/api/admin/news/route.ts',
  'src/app/api/admin/news/[id]/route.ts',
  'src/app/api/admin/facilities/route.ts',
  'src/app/api/admin/facilities/[id]/route.ts',
  'src/app/api/admin/regions/route.ts',
  'src/app/api/admin/regions/[id]/route.ts',
  'src/app/api/admin/volunteers/route.ts',
  'src/app/api/admin/settings/route.ts',
  'src/app/api/admin/translations/route.ts',
  'src/app/api/ops/alerts/route.ts',
  'src/app/api/ops/alerts/[id]/route.ts',
  'src/app/api/ops/incidents/[id]/route.ts',
  'src/app/api/ops/route.ts',
  'src/app/api/ops/data-health/route.ts',
  'src/app/api/ops/incidents/route.ts',
  'src/app/api/disaster-verify/route.ts',
]

let modified = 0
for (const f of FILES) {
  let src = readFileSync(f, 'utf8')
  if (src.includes('requireAdmin')) { console.log(`SKIP (already guarded): ${f}`); continue }

  // Add import if not present
  if (!src.includes("from '@/lib/admin-auth'")) {
    // Insert after the last existing import
    const importMatch = src.match(/^(import[^\n]+\n)+/m)
    if (importMatch) {
      src = src.replace(/^(import[^\n]+\n)+/m, (m) => m + "import { requireAdmin } from '@/lib/admin-auth'\n")
    } else {
      src = "import { requireAdmin } from '@/lib/admin-auth'\n" + src
    }
  }

  // Insert guard at start of each POST/PATCH/DELETE handler
  // Match: `export async function POST(request: NextRequest) {` or `export async function POST() {`
  src = src.replace(
    /export async function (POST|PATCH|DELETE|PUT)\s*\(([^)]*)\)\s*\{/g,
    (match, method, params) => {
      // If the handler has no `request` param, we still need one for the guard.
      const hasReq = params.includes('request')
      const paramStr = hasReq ? params : (params.trim() ? `${params}, request: Request` : 'request: Request')
      const guard = hasReq ? `  const _auth = requireAdmin(request)\n  if (!_auth.ok) return _auth.response\n` : `  const _auth = requireAdmin(request as any)\n  if (!_auth.ok) return _auth.response\n`
      return `export async function ${method}(${paramStr}) {\n${guard}`
    }
  )

  writeFileSync(f, src)
  modified++
  console.log(`PATCHED: ${f}`)
}
console.log(`Done. ${modified} files modified.`)

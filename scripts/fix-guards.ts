// Fix all broken admin auth guards in API routes.
// Problems: duplicate `if (!_auth.ok)` lines, missing `const _auth = await requireAdmin(...)` declarations.
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

function walkDir(dir: string): string[] {
  const results: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) results.push(...walkDir(full))
    else if (full.endsWith('route.ts')) results.push(full)
  }
  return results
}

const apiDir = 'src/app/api'
const files = walkDir(apiDir)
let fixed = 0

for (const f of files) {
  let src = readFileSync(f, 'utf8')
  if (!src.includes('_auth')) continue
  let modified = false

  // Fix each handler: ensure `const _auth = await requireAdmin(<param>)` exists before `if (!_auth.ok)`
  // and remove duplicate guard lines.
  // Pattern: export async function HANDLER(params...) { \n [maybe const _auth = ...] \n if (!_auth.ok) return _auth.response \n [maybe another if (!_auth.ok)...]
  
  src = src.replace(
    /export async function (GET|POST|PATCH|DELETE|PUT)\s*\(([^)]*)\)\s*\{(\s*\n)/g,
    (match, method, params, newline) => {
      // Check what comes after the function opening
      // We'll handle the body in a second pass
      return match
    }
  )

  // More targeted approach: for each handler, find the first `if (!_auth.ok)` and ensure a declaration precedes it.
  // Also remove duplicate consecutive `if (!_auth.ok) return _auth.response` lines.
  
  // Remove duplicate guard lines (keep only the first)
  const lines = src.split('\n')
  const out: string[] = []
  let prevWasGuard = false
  let inHandler = false
  let handlerParam = ''
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Detect handler start
    const handlerMatch = line.match(/^export async function (GET|POST|PATCH|DELETE|PUT)\s*\(([^)]*)\)\s*\{/)
    if (handlerMatch) {
      inHandler = true
      handlerParam = handlerMatch[2].trim()
      // Extract the first param name (could be "req: Request", "request: NextRequest", "request: Request", etc.)
      const paramMatch = handlerParam.match(/^(\w+)\s*:/)
      handlerParam = paramMatch ? paramMatch[1] : handlerParam ? handlerParam.split(',')[0].trim().split(/\s/)[0] : 'request'
      if (!handlerParam || handlerParam === '') handlerParam = 'request'
      out.push(line)
      prevWasGuard = false
      continue
    }
    
    // If we see a guard line
    if (/^\s*if\s*\(\s*!_auth\.ok\s*\)\s*return\s*_auth\.response\s*$/.test(line)) {
      if (prevWasGuard) {
        // Duplicate — skip
        modified = true
        continue
      }
      // Check if a declaration precedes this in the output
      const hasDecl = out.some((l) => /^\s*const\s+_auth\s*=/.test(l)) && out.slice(-5).some((l) => /^\s*const\s+_auth\s*=/.test(l))
      if (!hasDecl) {
        // Add declaration before the guard
        out.push(`  const _auth = await requireAdmin(${handlerParam})`)
        modified = true
      }
      out.push(line)
      prevWasGuard = true
      continue
    }
    
    // End of handler (rough: a closing brace at column 0)
    if (/^\}/.test(line)) {
      inHandler = false
    }
    out.push(line)
    prevWasGuard = false
  }
  
  const newSrc = out.join('\n')
  if (modified) {
    writeFileSync(f, newSrc)
    fixed++
    console.log(`FIXED: ${f}`)
  }
}
console.log(`Done. ${fixed} files fixed.`)

// PurvaGuard AI — admin authentication helpers (server-only).
// Signed-cookie session + bcrypt password verify + simple in-memory rate limiting.
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

// In-memory rate limiting for login attempts (per IP).
// { ip: { count, firstAt, lockedUntil } }
const loginAttempts = new Map<string, { count: number; firstAt: number; lockedUntil: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 5 * 60 * 1000 // 5 min
const LOCK_MS = 15 * 60 * 1000 // lock 15 min

const COOKIE_NAME = 'purvaguard-admin-session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000 // 8 hours

// Default password (change in admin dashboard after first login).
// Hash for "purvaguard-admin-2026" — printed in seed output.
const DEFAULT_PASSWORD_HASH = '$2b$10$W4BPeLJDZsi6nRP3VvBNqO2qtIKlJzPU9ztMAa1LXpMRJ4WaCLs/i'

function getSecret(): string {
  return process.env.PURVAGUARD_SESSION_SECRET || 'purvaguard-dev-session-secret-change-me'
}

function getAdminHash(): string {
  return process.env.PURVAGUARD_ADMIN_HASH || DEFAULT_PASSWORD_HASH
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function createAdminSession(): { cookie: { name: string; value: string; options: any } } {
  const expiresAt = Date.now() + SESSION_TTL_MS
  const payload = `admin:${expiresAt}`
  const sig = sign(payload)
  const value = `${payload}:${sig}`
  return {
    cookie: {
      name: COOKIE_NAME,
      value,
      options: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        path: '/',
        maxAge: SESSION_TTL_MS / 1000,
      },
    },
  }
}

export async function verifyAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const value = cookieStore.get(COOKIE_NAME)?.value
  if (!value) return false
  const parts = value.split(':')
  if (parts.length !== 3) return false
  const [role, expiresAtStr, sig] = parts
  if (role !== 'admin') return false
  const expiresAt = parseInt(expiresAtStr, 10)
  if (isNaN(expiresAt) || Date.now() > expiresAt) return false
  const expectedSig = sign(`${role}:${expiresAt}`)
  if (sig.length !== expectedSig.length) return false
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))
}

export function clearAdminSession(): { name: string; options: any } {
  return {
    name: COOKIE_NAME,
    options: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 },
  }
}

export async function verifyPassword(password: string): Promise<boolean> {
  try {
    return await bcrypt.compare(password, getAdminHash())
  } catch {
    return false
  }
}

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now()
  const rec = loginAttempts.get(ip)
  if (rec && rec.lockedUntil > now) {
    return { allowed: false, retryAfterMs: rec.lockedUntil - now }
  }
  return { allowed: true, retryAfterMs: 0 }
}

export function recordFailedAttempt(ip: string) {
  const now = Date.now()
  const rec = loginAttempts.get(ip)
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    loginAttempts.set(ip, { count: 1, firstAt: now, lockedUntil: 0 })
    return
  }
  rec.count++
  if (rec.count >= MAX_ATTEMPTS) {
    rec.lockedUntil = now + LOCK_MS
  }
}

export function clearAttempts(ip: string) {
  loginAttempts.delete(ip)
}

export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// Use in admin/ops route handlers:
//   const auth = await requireAdmin(request)
//   if (!auth.ok) return auth.response
export async function requireAdmin(_request: Request): Promise<{ ok: true } | { ok: false; response: Response }> {
  if (await verifyAdminSession()) return { ok: true }
  return {
    ok: false,
    response: new Response(JSON.stringify({ error: 'Unauthorized — admin authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  }
}

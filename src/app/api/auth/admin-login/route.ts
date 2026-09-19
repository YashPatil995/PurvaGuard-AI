import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createAdminSession, checkRateLimit, recordFailedAttempt, clearAttempts, getClientIp } from '@/lib/admin-auth'

// POST /api/auth/admin-login  body: { password: string }
// Returns 200 + sets session cookie on success; 401 on failure; 429 if rate-limited.
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request)
    const rl = checkRateLimit(ip)
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Try again later.', retryAfterMs: rl.retryAfterMs },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }

    const ok = await verifyPassword(password)
    if (!ok) {
      recordFailedAttempt(ip)
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    clearAttempts(ip)
    const session = createAdminSession()
    const res = NextResponse.json({ success: true, message: 'Authenticated' })
    res.cookies.set(session.cookie.name, session.cookie.value, session.cookie.options)
    return res
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Login failed' }, { status: 500 })
  }
}

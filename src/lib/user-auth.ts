// PurvaGuard AI — User Authentication & Session Management
// Signed HTTP-only cookie sessions using HMAC-SHA256.
import { cookies } from 'next/headers'
import crypto from 'crypto'
import { db } from '@/lib/db'

export const USER_COOKIE_NAME = 'purvaguard-user-session'
export const USER_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface UserSessionPayload {
  userId: string
  role: string
  name: string
  phone: string | null
  email: string | null
  authProvider: string
  expiresAt: number
}

function getSecret(): string {
  return process.env.PURVAGUARD_SESSION_SECRET || 'purvaguard-dev-session-secret-change-me'
}

function sign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('hex')
}

export function maskPhoneNumber(phone?: string | null): string {
  if (!phone) return ''
  const clean = phone.trim()
  if (clean.length < 8) return clean
  const prefix = clean.slice(0, 3)
  const suffix = clean.slice(-4)
  return `${prefix} ••••• •${suffix}`
}

export function createUserSessionCookie(user: {
  id: string
  role: string
  name: string
  phone?: string | null
  email?: string | null
  authProvider?: string | null
}) {
  const expiresAt = Date.now() + USER_SESSION_TTL_MS
  const data: UserSessionPayload = {
    userId: user.id,
    role: user.role,
    name: user.name,
    phone: user.phone || null,
    email: user.email || null,
    authProvider: user.authProvider || 'PHONE_EMAIL',
    expiresAt,
  }

  const jsonStr = JSON.stringify(data)
  const base64Payload = Buffer.from(jsonStr).toString('base64url')
  const signature = sign(base64Payload)
  const cookieValue = `${base64Payload}.${signature}`

  return {
    name: USER_COOKIE_NAME,
    value: cookieValue,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: USER_SESSION_TTL_MS / 1000,
    },
  }
}

export async function verifyUserSession(): Promise<UserSessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const cookie = cookieStore.get(USER_COOKIE_NAME)
    if (!cookie?.value) return null

    const parts = cookie.value.split('.')
    if (parts.length !== 2) return null

    const [base64Payload, signature] = parts
    const expectedSig = sign(base64Payload)

    if (signature.length !== expectedSig.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null
    }

    const jsonStr = Buffer.from(base64Payload, 'base64url').toString('utf8')
    const payload: UserSessionPayload = JSON.parse(jsonStr)

    if (!payload.expiresAt || Date.now() > payload.expiresAt) {
      return null
    }

    return payload
  } catch {
    return null
  }
}

export function clearUserSessionCookie() {
  return {
    name: USER_COOKIE_NAME,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 0,
    },
  }
}

/**
 * Fetch the live user from database corresponding to the current session.
 */
export async function getCurrentUser() {
  const session = await verifyUserSession()
  if (!session?.userId) return null

  try {
    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        authProvider: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })
    return user
  } catch {
    return null
  }
}

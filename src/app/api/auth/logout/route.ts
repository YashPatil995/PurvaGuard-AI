// PurvaGuard AI — Logout Route
// Clears authenticated user session cookies.

import { NextResponse } from 'next/server'
import { clearUserSessionCookie } from '@/lib/user-auth'
import { clearAdminSession } from '@/lib/admin-auth'

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' })
  
  // Clear user session cookie
  const userCookie = clearUserSessionCookie()
  response.cookies.set(userCookie.name, '', userCookie.options)

  // Also clear admin session cookie if present
  const adminCookie = clearAdminSession()
  response.cookies.set(adminCookie.name, '', adminCookie.options)

  return response
}

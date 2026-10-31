// PurvaGuard AI — Current User Session Verification
// Returns authenticated user details with masked phone number.

import { NextResponse } from 'next/server'
import { getCurrentUser, verifyUserSession, maskPhoneNumber } from '@/lib/user-auth'

export async function GET() {
  const session = await verifyUserSession()
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null })
  }

  const user = await getCurrentUser()
  if (!user || user.status === 'SUSPENDED') {
    return NextResponse.json({ authenticated: false, user: null })
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: maskPhoneNumber(user.phone),
      role: user.role,
      email: user.email,
      status: user.status,
      authProvider: user.authProvider,
      lastLoginAt: user.lastLoginAt,
    },
  })
}

import { NextResponse } from 'next/server'
import { verifyAdminSession } from '@/lib/admin-auth'

// GET /api/auth/admin-check → { authenticated: boolean }
export async function GET() {
  return NextResponse.json({ authenticated: await verifyAdminSession() })
}

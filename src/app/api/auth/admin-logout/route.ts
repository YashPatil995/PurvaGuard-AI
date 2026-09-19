import { NextResponse } from 'next/server'
import { clearAdminSession, verifyAdminSession } from '@/lib/admin-auth'

export async function POST() {
  const res = NextResponse.json({ success: true })
  const c = clearAdminSession()
  res.cookies.set(c.name, '', c.options)
  return res
}

export async function GET() {
  return NextResponse.json({ authenticated: await verifyAdminSession() })
}

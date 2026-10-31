// PurvaGuard AI — Phone.email Secure Verification Route
// Verifies user_json_url directly against user.phone.email server,
// normalizes credentials, upserts user in Supabase, and issues signed session cookie.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createUserSessionCookie, maskPhoneNumber } from '@/lib/user-auth'

interface PhoneEmailData {
  status?: number
  message?: string
  user_country_code?: string
  user_phone_number?: string
  user_first_name?: string
  user_last_name?: string
  user_email?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const userJsonUrl = body?.user_json_url

    if (!userJsonUrl || typeof userJsonUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid user_json_url' },
        { status: 400 }
      )
    }

    // 1. Strict URL Security Validation
    let parsedUrl: URL
    try {
      parsedUrl = new URL(userJsonUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid authentication URL format' },
        { status: 400 }
      )
    }

    // Must be HTTPS
    if (parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Insecure protocol: only HTTPS authentication endpoints allowed' },
        { status: 400 }
      )
    }

    // Must strictly match official Phone.email hostname
    if (parsedUrl.hostname !== 'user.phone.email') {
      return NextResponse.json(
        { error: 'Untrusted host: authentication URL must originate from user.phone.email' },
        { status: 403 }
      )
    }

    // 2. Fetch authenticated JSON with timeout and no unexpected redirects
    let verifiedData: PhoneEmailData
    try {
      const response = await fetch(parsedUrl.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'error', // Reject unexpected redirects to prevent SSRF
        signal: AbortSignal.timeout(8000), // 8-second timeout
      })

      if (!response.ok) {
        return NextResponse.json(
          { error: `Phone.email verification failed with HTTP status ${response.status}` },
          { status: 401 }
        )
      }

      verifiedData = await response.json()
    } catch (fetchErr: any) {
      if (fetchErr.name === 'TimeoutError') {
        return NextResponse.json(
          { error: 'Verification timed out while contacting Phone.email' },
          { status: 504 }
        )
      }
      return NextResponse.json(
        { error: 'Unable to communicate with verification provider' },
        { status: 502 }
      )
    }

    // 3. Extract and Validate Authenticated Fields
    const rawCountryCode = verifiedData?.user_country_code || ''
    const rawPhoneNumber = verifiedData?.user_phone_number || ''

    if (!rawPhoneNumber) {
      return NextResponse.json(
        { error: 'Phone verification response missing phone number' },
        { status: 422 }
      )
    }

    // 4. Normalize phone number to international E.164 format (e.g. +919876543210)
    let countryCodeDigits = rawCountryCode.replace(/[^\d]/g, '')
    if (!countryCodeDigits) countryCodeDigits = '91' // Default India if missing

    let phoneDigits = rawPhoneNumber.replace(/[^\d]/g, '')
    // If phoneDigits already begins with country code, do not double-prepend
    if (phoneDigits.startsWith(countryCodeDigits) && phoneDigits.length > 10) {
      phoneDigits = phoneDigits.slice(countryCodeDigits.length)
    }

    const normalizedPhone = `+${countryCodeDigits}${phoneDigits}`

    // Safe sanitized logging (never log full phone number or auth URL)
    console.log(`[AUTH] Phone.email verification succeeded for ${maskPhoneNumber(normalizedPhone)}`)

    const firstName = (verifiedData?.user_first_name || '').trim()
    const lastName = (verifiedData?.user_last_name || '').trim()
    const email = (verifiedData?.user_email || '').trim() || null

    let fullName = `${firstName} ${lastName}`.trim()
    if (!fullName) {
      fullName = `User ${normalizedPhone.slice(-4)}`
    }

    // 5. Database Lookup & Mode Verification (Sign In vs Create Account)
    const flow = body?.flow === 'signup' ? 'signup' : 'signin'

    let user = await db.user.findUnique({
      where: { phone: normalizedPhone },
    })

    // FLOW 1: SIGN IN MODE
    if (flow === 'signin') {
      if (!user) {
        return NextResponse.json(
          {
            success: false,
            error: 'ACCOUNT_NOT_FOUND',
            message: 'No account found with this phone number. Please switch to Create Account to register.',
            phone: maskPhoneNumber(normalizedPhone),
          },
          { status: 404 }
        )
      }

      if (user.status === 'SUSPENDED') {
        return NextResponse.json(
          { error: 'This account has been suspended. Please contact support.' },
          { status: 403 }
        )
      }

      // Update login timestamp and optional names if available
      user = await db.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          firstName: user.firstName || (firstName || null),
          lastName: user.lastName || (lastName || null),
          email: user.email || email,
        },
      })
    }

    // FLOW 2: CREATE ACCOUNT (SIGNUP) MODE
    if (flow === 'signup') {
      if (user) {
        return NextResponse.json(
          {
            success: false,
            error: 'ACCOUNT_EXISTS',
            message: 'An account with this phone number already exists. Please switch to Sign In.',
            phone: maskPhoneNumber(normalizedPhone),
          },
          { status: 409 }
        )
      }

      // Create new user record
      const userEmail = email || `${normalizedPhone.replace(/[^\d]/g, '')}@phone.purvaguard.in`

      user = await db.user.create({
        data: {
          phone: normalizedPhone,
          name: fullName,
          firstName: firstName || null,
          lastName: lastName || null,
          email: userEmail,
          role: 'PUBLIC',
          status: 'ACTIVE',
          authProvider: 'PHONE_EMAIL',
          lastLoginAt: new Date(),
        },
      })
    }

    // 6. Create Authenticated HTTP-only Session Cookie
    if (!user) {
      return NextResponse.json(
        { error: 'User account could not be resolved' },
        { status: 500 }
      )
    }

    const isNewUser = flow === 'signup'
    const sessionCookie = createUserSessionCookie({
      id: user.id,
      role: user.role,
      name: user.name,
      phone: user.phone,
      email: user.email,
      authProvider: user.authProvider,
    })

    const response = NextResponse.json({
      success: true,
      isNewUser,
      message: isNewUser ? 'Account created successfully' : 'Signed in successfully',
      user: {
        id: user.id,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: maskPhoneNumber(user.phone),
        role: user.role,
        email: user.email,
        authProvider: user.authProvider,
      },
    })

    response.cookies.set(
      sessionCookie.name,
      sessionCookie.value,
      sessionCookie.options
    )

    return response
  } catch (err: any) {
    console.error('[AUTH ERROR]', err.message)
    return NextResponse.json(
      { error: 'An unexpected authentication error occurred' },
      { status: 500 }
    )
  }
}

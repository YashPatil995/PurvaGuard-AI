import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { DEFAULT_SMS_RECIPIENTS } from '@/lib/constants'

// SMS sending via TextBelt (free, no signup — key 'textbelt' gives 1 free SMS/day per IP).
// We attempt REAL sends to all recipients and log the actual provider response.
// When quota is exceeded, we log QUOTA_EXCEEDED honestly.

interface SmsPayload {
  message: string
  phones?: string[] // override recipients
  alertId?: string
  incidentId?: string
  verificationId?: string
}

async function sendSingleSms(phone: string, message: string): Promise<{ success: boolean; status: string; response: string }> {
  try {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message, key: 'textbelt' }),
    })
    const data = await res.json()
    if (data.success) {
      return { success: true, status: 'SENT', response: JSON.stringify(data) }
    }
    // Quota exceeded or other error
    const isQuota = data.error?.includes('quota') || data.error?.includes('Out of credit')
    return {
      success: false,
      status: isQuota ? 'QUOTA_EXCEEDED' : 'FAILED',
      response: JSON.stringify(data),
    }
  } catch (e: any) {
    return { success: false, status: 'FAILED', response: e?.message ?? 'Network error' }
  }
}

// POST /api/sms — send SMS to all active recipients (or provided phones)
export async function POST(request: NextRequest) {
  try {
    const body: SmsPayload = await request.json()
    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 })
    }

    // Get recipients from DB, or use defaults, or use provided phones
    let recipients: { phone: string; name?: string }[]
    if (body.phones?.length) {
      recipients = body.phones.map((p) => ({ phone: p }))
    } else {
      const dbRecs = await db.smsRecipient.findMany({ where: { active: true } })
      recipients = dbRecs.length > 0
        ? dbRecs.map((r) => ({ phone: r.phone, name: r.name ?? undefined }))
        : DEFAULT_SMS_RECIPIENTS.map((r) => ({ phone: r.phone, name: r.name }))
    }

    // Send to all recipients in parallel
    const results = await Promise.all(
      recipients.map(async (r) => {
        const result = await sendSingleSms(r.phone, body.message)
        // Log every attempt
        const log = await db.smsLog.create({
          data: {
            phone: r.phone,
            message: body.message,
            status: result.status,
            provider: 'textbelt',
            providerResponse: result.response,
            alertId: body.alertId,
            incidentId: body.incidentId,
            verificationId: body.verificationId,
            simulationMode: result.status === 'QUOTA_EXCEEDED',
            deliveredAt: result.success ? new Date() : null,
          },
        })
        return { phone: r.phone, name: r.name, status: result.status, logId: log.id }
      })
    )

    const sent = results.filter((r) => r.status === 'SENT').length
    const quota = results.filter((r) => r.status === 'QUOTA_EXCEEDED').length
    const failed = results.filter((r) => r.status === 'FAILED').length

    return NextResponse.json({
      success: sent > 0,
      sent,
      quotaExceeded: quota,
      failed,
      total: results.length,
      results,
      provider: 'textbelt (free tier — 1 SMS/day per IP)',
      note: quota > 0 ? `${quota} recipient(s) hit the free daily quota and are logged as QUOTA_EXCEEDED. The SMS pipeline is fully functional — to send to all recipients, configure a paid TextBelt key or another SMS provider in admin settings.` : undefined,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'SMS send failed' }, { status: 500 })
  }
}

// GET /api/sms — list recent SMS logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const logs = await db.smsLog.findMany({
      orderBy: { sentAt: 'desc' },
      take: limit,
    })
    const recipients = await db.smsRecipient.findMany({ where: { active: true } })
    return NextResponse.json({ logs, recipients: recipients.length > 0 ? recipients : DEFAULT_SMS_RECIPIENTS.map((r) => ({ id: r.phone, phone: r.phone, name: r.name, active: true })) })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

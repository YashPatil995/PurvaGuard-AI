import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loadSmsConfig, sendSms, normalizePhone, renderSmsTemplate } from '@/lib/sms'
import { requireAdmin } from '@/lib/admin-auth'
import { DEFAULT_SMS_RECIPIENTS } from '@/lib/constants'

// GET /api/sms — list recent SMS logs + recipients. Admin-only.
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const logs = await db.smsLog.findMany({ orderBy: { sentAt: 'desc' }, take: limit })
    const recipients = await db.smsRecipient.findMany()
    const config = await loadSmsConfig()
    return NextResponse.json({
      logs,
      recipients: recipients.length > 0
        ? recipients
        : DEFAULT_SMS_RECIPIENTS.map((r) => ({ id: r.phone, phone: r.phone, name: r.name, active: true })),
      provider: config.provider,
      // Don't expose secrets — only show whether each is configured.
      configStatus: {
        textbelt: config.provider === 'textbelt' ? `key=${config.textbeltKey ? '***' : 'free'}` : undefined,
        twilio: config.twilioAccountSid ? `sid=${config.twilioAccountSid.slice(0, 4)}*** from=${config.twilioFromNumber || '-'}` : 'not configured',
        fast2sms: config.fast2smsApiKey ? 'api key set' : 'not configured',
        msg91: config.msg91AuthKey ? 'auth key set' : 'not configured',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

// POST /api/sms — send SMS to all active recipients (or provided phones). Admin-only.
// Body: { message?: string, phones?: string[], useTemplate?: boolean, hazard?: string, location?: string, severity?: string, action?: string, alertId?, incidentId?, verificationId? }
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const config = await loadSmsConfig()

    // Build message: either explicit message, or template-rendered.
    let message: string
    if (body.message) {
      message = body.message
    } else if (body.useTemplate) {
      message = await renderSmsTemplate({
        hazard: body.hazard,
        location: body.location,
        severity: body.severity,
        action: body.action,
      }, body.template)
    } else {
      return NextResponse.json({ error: 'Provide message or useTemplate=true with template vars' }, { status: 400 })
    }

    if (message.length > 480) {
      return NextResponse.json({ error: 'Message too long (max 480 chars for multi-segment SMS)' }, { status: 400 })
    }

    // Resolve recipients
    let recipients: { phone: string; name?: string }[]
    if (body.phones?.length) {
      recipients = body.phones.map((p: string) => ({ phone: p }))
    } else {
      const dbRecs = await db.smsRecipient.findMany({ where: { active: true } })
      recipients = dbRecs.length > 0
        ? dbRecs.map((r) => ({ phone: r.phone, name: r.name ?? undefined }))
        : DEFAULT_SMS_RECIPIENTS.map((r) => ({ phone: r.phone, name: r.name }))
    }

    // Validate + dedupe phones
    const seen = new Set<string>()
    const valid = recipients.filter((r) => {
      const norm = normalizePhone(r.phone)
      if (!norm || seen.has(norm)) return false
      seen.add(norm)
      return true
    })

    if (valid.length === 0) {
      return NextResponse.json({ error: 'No valid recipient phone numbers' }, { status: 400 })
    }

    // Send to all recipients in parallel via the configured provider.
    const results = await Promise.all(
      valid.map(async (r) => {
        const result = await sendSms(r.phone, message, config)
        const log = await db.smsLog.create({
          data: {
            phone: r.phone,
            message,
            status: result.status,
            provider: config.provider,
            providerResponse: result.providerResponse,
            alertId: body.alertId,
            incidentId: body.incidentId,
            verificationId: body.verificationId,
            simulationMode: config.provider === 'test',
            deliveredAt: result.success ? new Date() : null,
          },
        })
        return {
          phone: r.phone,
          name: r.name,
          status: result.status,
          success: result.success,
          providerMessageId: result.providerMessageId,
          logId: log.id,
          providerResponse: result.providerResponse,
        }
      })
    )

    const sent = results.filter((r) => r.status === 'SENT').length
    const quota = results.filter((r) => r.status === 'QUOTA_EXCEEDED').length
    const rejected = results.filter((r) => r.status === 'REJECTED').length
    const failed = results.filter((r) => r.status === 'FAILED').length
    const unconfigured = results.filter((r) => r.status === 'UNCONFIGURED').length

    return NextResponse.json({
      success: sent > 0,
      provider: config.provider,
      sent,
      quotaExceeded: quota,
      rejected,
      failed,
      unconfigured,
      total: results.length,
      results,
      message,
      note: unconfigured > 0
        ? `Provider '${config.provider}' is not fully configured. Set the required API key in Admin → Settings to enable real SMS delivery.`
        : quota > 0
        ? `${quota} recipient(s) hit the free-tier daily quota. Use a paid key for reliable delivery.`
        : rejected > 0
        ? `${rejected} recipient(s) were rejected by the provider (e.g. country not supported on free tier).`
        : undefined,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'SMS send failed' }, { status: 500 })
  }
}

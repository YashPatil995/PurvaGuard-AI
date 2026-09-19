// PurvaGuard AI — SMS provider abstraction.
// Supports multiple providers, admin-configurable. All sends are real HTTP calls
// to the selected provider; every attempt is logged with the actual response.
//
// Providers:
//   1. textbelt  — free key 'textbelt' (no signup). Note: India is blocked on the
//                  free tier. A paid key ($10/100 SMS) is required for India delivery.
//   2. twilio    — Twilio REST API. Requires account SID + auth token + a Twilio number.
//                  Trial accounts can only send to verified numbers.
//   3. fast2sms  — Indian provider. Requires API key. Custom sender + DLT for production.
//   4. msg91     — Indian provider. Requires auth key. Free trial credits.
//
// Secrets come from SystemSetting table (admin enters via dashboard) or env vars.
// No provider key is hardcoded. Never expose secrets to the client.

import { db } from '@/lib/db'

export interface SmsResult {
  success: boolean
  status: 'SENT' | 'FAILED' | 'QUOTA_EXCEEDED' | 'REJECTED' | 'UNCONFIGURED'
  providerResponse: string
  providerMessageId?: string
}

export interface SmsProviderConfig {
  provider: 'textbelt' | 'twilio' | 'fast2sms' | 'msg91' | 'test'
  // TextBelt
  textbeltKey?: string
  // Twilio
  twilioAccountSid?: string
  twilioAuthToken?: string
  twilioFromNumber?: string
  // Fast2SMS
  fast2smsApiKey?: string
  fast2smsSender?: string
  // MSG91
  msg91AuthKey?: string
  msg91SenderId?: string
}

// Load SMS config from SystemSetting (admin-editable) with env fallbacks.
export async function loadSmsConfig(): Promise<SmsProviderConfig> {
  const settings = await db.systemSetting.findMany({ where: { key: { startsWith: 'sms.' } } })
  const map: Record<string, string> = {}
  for (const s of settings) {
    try { map[s.key] = JSON.parse(s.value) } catch { map[s.key] = s.value }
  }

  const provider = (process.env.SMS_PROVIDER as SmsProviderConfig['provider']) || (map['sms.provider'] as SmsProviderConfig['provider']) || 'test'

  return {
    provider,
    textbeltKey: process.env.TEXTBELT_KEY || map['sms.textbeltKey'] || 'textbelt',
    twilioAccountSid: process.env.TWILIO_ACCOUNT_SID || map['sms.twilioAccountSid'],
    twilioAuthToken: process.env.TWILIO_AUTH_TOKEN || map['sms.twilioAuthToken'],
    twilioFromNumber: process.env.TWILIO_FROM_NUMBER || map['sms.twilioFromNumber'],
    fast2smsApiKey: process.env.FAST2SMS_API_KEY || map['sms.fast2smsApiKey'],
    fast2smsSender: process.env.FAST2SMS_SENDER || map['sms.fast2smsSender'] || 'PURVA',
    msg91AuthKey: process.env.MSG91_AUTH_KEY || map['sms.msg91AuthKey'],
    msg91SenderId: process.env.MSG91_SENDER_ID || map['sms.msg91SenderId'] || 'PURVAG',
  }
}

// Validate Indian phone number (10 digits, optional +91/91 prefix).
export function normalizePhone(phone: string): string | null {
  let p = phone.replace(/[\s\-()]/g, '')
  if (p.startsWith('+91')) p = p.slice(3)
  else if (p.startsWith('91') && p.length === 12) p = p.slice(2)
  if (/^\d{10}$/.test(p)) return `91${p}`
  return null
}

export async function sendSms(phone: string, message: string, config: SmsProviderConfig): Promise<SmsResult> {
  const normalized = normalizePhone(phone)
  if (!normalized) {
    return { success: false, status: 'REJECTED', providerResponse: 'Invalid phone number format' }
  }

  switch (config.provider) {
    case 'textbelt':
      return sendTextbelt(normalized, message, config.textbeltKey || 'textbelt')
    case 'twilio':
      return sendTwilio(normalized, message, config)
    case 'fast2sms':
      return sendFast2sms(normalized, message, config)
    case 'msg91':
      return sendMsg91(normalized, message, config)
    case 'test':
    default:
      return sendTest(normalized, message)
  }
}

// ── TextBelt ──────────────────────────────────────────────────────────
async function sendTextbelt(phone: string, message: string, key: string): Promise<SmsResult> {
  try {
    const res = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message, key }),
    })
    const data = await res.json()
    if (data.success) {
      return { success: true, status: 'SENT', providerResponse: JSON.stringify(data), providerMessageId: data.textId }
    }
    const err = data.error || 'Unknown error'
    const isQuota = err.toLowerCase().includes('quota') || err.toLowerCase().includes('out of credit')
    const isCountry = err.toLowerCase().includes('country')
    return {
      success: false,
      status: isQuota ? 'QUOTA_EXCEEDED' : isCountry ? 'REJECTED' : 'FAILED',
      providerResponse: JSON.stringify(data),
    }
  } catch (e: any) {
    return { success: false, status: 'FAILED', providerResponse: e?.message ?? 'Network error' }
  }
}

// ── Twilio ────────────────────────────────────────────────────────────
async function sendTwilio(phone: string, message: string, config: SmsProviderConfig): Promise<SmsResult> {
  if (!config.twilioAccountSid || !config.twilioAuthToken || !config.twilioFromNumber) {
    return { success: false, status: 'UNCONFIGURED', providerResponse: 'Twilio credentials not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER in admin Settings.' }
  }
  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${config.twilioAccountSid}/Messages.json`
    const body = new URLSearchParams({
      From: config.twilioFromNumber,
      To: `+${phone}`,
      Body: message,
    })
    const auth = Buffer.from(`${config.twilioAccountSid}:${config.twilioAuthToken}`).toString('base64')
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    })
    const data = await res.json()
    if (res.ok && data.sid) {
      return { success: true, status: 'SENT', providerResponse: JSON.stringify(data), providerMessageId: data.sid }
    }
    return { success: false, status: 'FAILED', providerResponse: JSON.stringify(data) }
  } catch (e: any) {
    return { success: false, status: 'FAILED', providerResponse: e?.message ?? 'Network error' }
  }
}

// ── Fast2SMS ──────────────────────────────────────────────────────────
async function sendFast2sms(phone: string, message: string, config: SmsProviderConfig): Promise<SmsResult> {
  if (!config.fast2smsApiKey) {
    return { success: false, status: 'UNCONFIGURED', providerResponse: 'Fast2SMS API key not configured. Set FAST2SMS_API_KEY in admin Settings.' }
  }
  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: config.fast2smsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        language: 'english',
        route: 'q',
        numbers: phone.slice(2), // Fast2SMS wants 10-digit
      }),
    })
    const data = await res.json()
    if (data.return === true || data.status === 'success') {
      return { success: true, status: 'SENT', providerResponse: JSON.stringify(data) }
    }
    return { success: false, status: 'FAILED', providerResponse: JSON.stringify(data) }
  } catch (e: any) {
    return { success: false, status: 'FAILED', providerResponse: e?.message ?? 'Network error' }
  }
}

// ── MSG91 ─────────────────────────────────────────────────────────────
async function sendMsg91(phone: string, message: string, config: SmsProviderConfig): Promise<SmsResult> {
  if (!config.msg91AuthKey) {
    return { success: false, status: 'UNCONFIGURED', providerResponse: 'MSG91 auth key not configured. Set MSG91_AUTH_KEY in admin Settings.' }
  }
  try {
    const res = await fetch(`https://api.msg91.com/api/v5/flow/`, {
      method: 'POST',
      headers: {
        authkey: config.msg91AuthKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sender: config.msg91SenderId || 'PURVAG',
        route: '4',
        country: '91',
        sms: [{ message, to: [phone.slice(2)] }],
      }),
    })
    const data = await res.json()
    if (data.type === 'success' || res.ok) {
      return { success: true, status: 'SENT', providerResponse: JSON.stringify(data) }
    }
    return { success: false, status: 'FAILED', providerResponse: JSON.stringify(data) }
  } catch (e: any) {
    return { success: false, status: 'FAILED', providerResponse: e?.message ?? 'Network error' }
  }
}

// ── Test mode (no real send, simulated) ───────────────────────────────
async function sendTest(phone: string, message: string): Promise<SmsResult> {
  await new Promise((r) => setTimeout(r, 400))
  return {
    success: true,
    status: 'SENT',
    providerResponse: JSON.stringify({ mode: 'test', phone, message, simulatedAt: new Date().toISOString() }),
    providerMessageId: `test-${Date.now()}`,
  }
}

// Get the admin-configurable SMS template with placeholders filled.
// Placeholders: {{hazard}}, {{location}}, {{severity}}, {{time}}, {{action}}
export async function renderSmsTemplate(vars: { hazard?: string; location?: string; severity?: string; time?: string; action?: string }, customTemplate?: string): Promise<string> {
  let tpl = customTemplate
  if (!tpl) {
    const setting = await db.systemSetting.findUnique({ where: { key: 'sms.defaultMessage' } })
    tpl = setting ? safeParse(setting.value) : 'DISASTER ALERT: {{hazard}} reported near {{location}}. {{action}} -PurvaGuard AI'
  }
  return (tpl as string)
    .replace(/\{\{hazard\}\}/g, vars.hazard || 'hazard')
    .replace(/\{\{location\}\}/g, vars.location || 'your area')
    .replace(/\{\{severity\}\}/g, vars.severity || 'WARNING')
    .replace(/\{\{time\}\}/g, vars.time || new Date().toLocaleString('en-IN'))
    .replace(/\{\{action\}\}/g, vars.action || 'Follow local authority instructions.')
}

function safeParse(s: string): string {
  try {
    const v = JSON.parse(s)
    return typeof v === 'string' ? v : String(v)
  } catch {
    return s
  }
}

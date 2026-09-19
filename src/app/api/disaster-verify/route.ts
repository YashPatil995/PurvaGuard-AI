import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { loadSmsConfig, sendSms } from '@/lib/sms'
import { DEFAULT_SMS_RECIPIENTS } from '@/lib/constants'

// Disaster verification pipeline:
// 1. Takes a community report / SOS text
// 2. Uses LLM (z-ai-web-dev-sdk) to analyze: is it a real disaster? severity? affected area?
// 3. If verified as HIGH/CRITICAL severity → auto-create Alert + trigger SMS to all recipients
// 4. Returns the analysis + actions taken

async function analyzeWithLLM(text: string, language: string) {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    const systemPrompt = `You are PurvaGuard AI's disaster verification engine for the North Eastern Region of India. Analyze the given disaster report and return a JSON object with these exact fields:
{
  "isRealDisaster": boolean,  // true if this describes an actual ongoing/incipient disaster
  "disasterType": "LANDSLIDE" | "FLASH_FLOOD" | "HEAVY_RAIN" | "EARTHQUAKE" | "ROAD_BLOCK" | "FIRE" | "OTHER",
  "severity": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
  "confidence": number (0-1),
  "affectedArea": string,  // estimated area/locality name
  "estimatedPeopleAtRisk": number,
  "recommendedAction": string,  // concise action for residents
  "smsMessage": string  // a short SMS-ready alert message (max 160 chars) in ${language} language for affected residents
}
Be conservative — only mark isRealDisaster=true for clear disaster signals. Respond with ONLY the JSON, no markdown.`

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text },
      ],
      thinking: { type: 'disabled' },
      stream: false,
    })

    const content = response.choices[0]?.message?.content ?? '{}'
    // Parse JSON from the response (strip any markdown fences)
    const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    return JSON.parse(jsonStr)
  } catch (e) {
    // Deterministic fallback if LLM fails
    const text2 = text.toLowerCase()
    const isFlood = text2.includes('flood') || text2.includes('water') || text2.includes('नदी') || text2.includes('पानी')
    const isLandslide = text2.includes('landslide') || text2.includes('slide') || text2.includes('भूस्खलन') || text2.includes('mud')
    const isReal = isFlood || isLandslide || text2.includes('crack') || text2.includes('road block') || text2.includes('debris')
    return {
      isRealDisaster: isReal,
      disasterType: isLandslide ? 'LANDSLIDE' : isFlood ? 'FLASH_FLOOD' : 'OTHER',
      severity: isReal ? 'HIGH' : 'LOW',
      confidence: 0.6,
      affectedArea: 'reported location',
      estimatedPeopleAtRisk: isReal ? 50 : 0,
      recommendedAction: isReal ? 'Move to higher ground. Avoid the affected area. Follow local authority instructions.' : 'Monitor situation.',
      smsMessage: isReal ? 'DISASTER ALERT: Hazard reported in your area. Move to safety. Follow local authority instructions. -PurvaGuard AI' : 'No action needed at this time.',
      fallback: true,
    }
  }
}

// Send SMS directly via the lib (server-side, no HTTP round-trip / no auth needed).
async function triggerSms(message: string, alertId?: string, verificationId?: string) {
  try {
    const config = await loadSmsConfig()
    const recipients = await db.smsRecipient.findMany({ where: { active: true } })
    const list = recipients.length > 0
      ? recipients.map((r) => ({ phone: r.phone, name: r.name ?? undefined }))
      : DEFAULT_SMS_RECIPIENTS.map((r) => ({ phone: r.phone, name: r.name }))
    const results = await Promise.all(
      list.map(async (r) => {
        const result = await sendSms(r.phone, message, config)
        await db.smsLog.create({
          data: {
            phone: r.phone,
            message,
            status: result.status,
            provider: config.provider,
            providerResponse: result.providerResponse,
            alertId,
            verificationId,
            simulationMode: config.provider === 'test',
            deliveredAt: result.success ? new Date() : null,
          },
        })
        return { phone: r.phone, status: result.status, success: result.success }
      })
    )
    return {
      success: results.some((r) => r.success),
      sent: results.filter((r) => r.status === 'SENT').length,
      quotaExceeded: results.filter((r) => r.status === 'QUOTA_EXCEEDED').length,
      rejected: results.filter((r) => r.status === 'REJECTED').length,
      failed: results.filter((r) => r.status === 'FAILED').length,
      total: results.length,
      provider: config.provider,
    }
  } catch (e: any) {
    return { success: false, error: e?.message ?? 'SMS trigger failed', sent: 0, total: 6 }
  }
}

// POST /api/disaster-verify
// Body: { text, language, reportId?, incidentId?, lat?, lng? }
// PUBLIC — anyone submitting a hazard report can trigger AI verification.
// SMS auto-sends only if the AI verifies HIGH/CRITICAL severity.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text, language = 'en', reportId, incidentId, lat, lng } = body

    if (!text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    // 1. Analyze with LLM
    const analysis = await analyzeWithLLM(text, language)

    // 2. Create verification record
    const verification = await db.disasterVerification.create({
      data: {
        reportId: reportId ?? null,
        incidentId: incidentId ?? null,
        inputText: text,
        analysis: JSON.stringify(analysis),
        verified: analysis.isRealDisaster && (analysis.severity === 'HIGH' || analysis.severity === 'CRITICAL'),
        actionTaken: analysis.isRealDisaster ? 'PENDING_SMS' : 'QUEUED_FOR_REVIEW',
      },
    })

    let alertCreated = null
    let smsResult = null

    // 3. If verified as high-severity disaster → auto-create alert + send SMS
    if (analysis.isRealDisaster && (analysis.severity === 'HIGH' || analysis.severity === 'CRITICAL')) {
      const severityMap: Record<string, string> = {
        CRITICAL: 'EMERGENCY',
        HIGH: 'WARNING',
        MODERATE: 'WATCH',
        LOW: 'ADVISORY',
      }

      alertCreated = await db.alert.create({
        data: {
          alertType: analysis.disasterType || 'GENERAL',
          issuerType: 'PLATFORM',
          issuerName: 'PurvaGuard AI (auto-verified)',
          title: `${analysis.disasterType} Alert — ${analysis.affectedArea || 'reported location'}`,
          body: analysis.smsMessage,
          severity: severityMap[analysis.severity] || 'WARNING',
          modelRiskLevel: analysis.severity,
          confidence: analysis.confidence,
          lat: lat ?? null,
          lng: lng ?? null,
          radiusKm: 15,
          issuedAt: new Date(),
          validFrom: new Date(),
          expiresAt: new Date(Date.now() + 12 * 3600000),
          status: 'ACTIVE',
          verificationStatus: 'PLATFORM',
          simulationMode: true,
        },
      })

      // 4. Send SMS to all 6 recipients
      smsResult = await triggerSms(analysis.smsMessage, alertCreated.id, verification.id)

      // Update verification
      await db.disasterVerification.update({
        where: { id: verification.id },
        data: {
          verified: true,
          actionTaken: `ALERT_CREATED:${alertCreated.id} | SMS_SENT:${smsResult.sent ?? 0}/${smsResult.total ?? 6}`,
          alertId: alertCreated.id,
        },
      })
    }

    return NextResponse.json({
      verificationId: verification.id,
      analysis,
      alertCreated,
      smsResult,
      autoActionTaken: analysis.isRealDisaster && (analysis.severity === 'HIGH' || analysis.severity === 'CRITICAL'),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Verification failed' }, { status: 500 })
  }
}

// GET — list recent verifications
export async function GET(request: NextRequest) {
  try {
    const verifications = await db.disasterVerification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
    return NextResponse.json({ verifications })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 })
  }
}

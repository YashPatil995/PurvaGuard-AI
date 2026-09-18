import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_VOLUNTEER_EMAIL = 'volunteer.demo@purvaguard.in'

// GET /api/volunteers?regionId=...
// Returns the seeded volunteer demo profile + available ResponseTasks (OPEN/IN_PROGRESS) with assignments.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const regionId = searchParams.get('regionId') ?? undefined

    const user = await db.user.findUnique({
      where: { email: DEMO_VOLUNTEER_EMAIL },
    })

    let profile: any = null
    if (user) {
      const p = await db.volunteerProfile.findUnique({
        where: { userId: user.id },
      })
      if (p) {
        profile = {
          id: p.id,
          userId: p.userId,
          userName: user.name,
          userEmail: user.email,
          skills: p.skills ? p.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
          languages: p.languages ? p.languages.split(',').map((s) => s.trim()).filter(Boolean) : [],
          serviceRegions: p.serviceRegions
            ? p.serviceRegions.split(';').map((s) => s.trim()).filter(Boolean)
            : [],
          availabilityStatus: p.availabilityStatus,
          equipment: p.equipment ? safeJson(p.equipment) : null,
          vehicle: p.vehicle ? safeJson(p.vehicle) : null,
          training: p.training ? safeJson(p.training) : null,
          verificationStatus: p.verificationStatus,
          approvedAt: p.approvedAt,
          updatedAt: p.updatedAt,
        }
      }
    }

    const tasks = await db.responseTask.findMany({
      where: {
        status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
        ...(regionId ? { regionId } : {}),
      },
      include: {
        coordinator: { select: { id: true, name: true } },
        assignments: {
          include: { volunteer: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const taskItems = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      taskType: t.taskType,
      description: t.description,
      lat: t.lat,
      lng: t.lng,
      regionId: t.regionId,
      requiredSkills: t.requiredSkills
        ? t.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      capacity: t.capacity,
      status: t.status,
      startAt: t.startAt,
      endAt: t.endAt,
      safetyConstraints: t.safetyConstraints ? safeJson(t.safetyConstraints) : null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      coordinator: t.coordinator
        ? { id: t.coordinator.id, name: t.coordinator.name }
        : null,
      assignments: t.assignments.map((a) => ({
        id: a.id,
        volunteerId: a.volunteerId,
        volunteerName: a.volunteer?.name ?? 'Unknown',
        status: a.status,
        assignedAt: a.assignedAt,
        acceptedAt: a.acceptedAt,
        checkinAt: a.checkinAt,
        checkoutAt: a.checkoutAt,
        completionNote: a.completionNote,
      })),
    }))

    return NextResponse.json({ profile, tasks: taskItems })
  } catch (err: any) {
    console.error('[api/volunteers GET]', err)
    return NextResponse.json(
      { error: 'Failed to load volunteer data', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

// POST /api/volunteers
// Register/update volunteer profile (creates or updates VolunteerProfile for seeded volunteer.demo user)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const {
      legalName,
      organizationName,
      skills,
      languages,
      serviceRegions,
      availability,
      equipment,
      vehicle,
      training,
      contact,
      accessibility,
    } = body || {}

    // Look up the demo volunteer user
    let user = await db.user.findUnique({ where: { email: DEMO_VOLUNTEER_EMAIL } })
    if (!user) {
      // create the demo volunteer user if missing (defensive — seed should have it)
      user = await db.user.create({
        data: {
          email: DEMO_VOLUNTEER_EMAIL,
          name: typeof legalName === 'string' && legalName.trim() ? legalName.trim() : 'Volunteer Demo',
          role: 'VOLUNTEER',
          status: 'ACTIVE',
        },
      })
    } else if (typeof legalName === 'string' && legalName.trim() && legalName.trim() !== user.name) {
      user = await db.user.update({
        where: { id: user.id },
        data: { name: legalName.trim() },
      })
    }

    const skillsStr = Array.isArray(skills) ? skills.join(',') : typeof skills === 'string' ? skills : ''
    const langsStr = Array.isArray(languages)
      ? languages.join(',')
      : typeof languages === 'string' && languages
        ? languages
        : 'en'
    const regionsStr = Array.isArray(serviceRegions)
      ? serviceRegions.join(';')
      : typeof serviceRegions === 'string'
        ? serviceRegions
        : ''
    const availabilityStatus = normalizeAvailability(availability)

    const equipmentStr = equipment ? (typeof equipment === 'string' ? equipment : JSON.stringify(equipment)) : null
    const vehicleStr = vehicle ? (typeof vehicle === 'string' ? vehicle : JSON.stringify(vehicle)) : null
    const trainingStr = training ? (typeof training === 'string' ? training : JSON.stringify(training)) : null

    // create or update — always reset verification to PENDING on (re)submission
    const existing = await db.volunteerProfile.findUnique({ where: { userId: user.id } })
    let profile
    if (existing) {
      profile = await db.volunteerProfile.update({
        where: { userId: user.id },
        data: {
          skills: skillsStr,
          languages: langsStr,
          serviceRegions: regionsStr,
          availabilityStatus,
          equipment: equipmentStr,
          vehicle: vehicleStr,
          training: trainingStr,
          verificationStatus: 'PENDING',
          approvedBy: null,
          approvedAt: null,
          organizationId:
            typeof organizationName === 'string' && organizationName.trim()
              ? organizationName.trim()
              : existing.organizationId,
        },
      })
    } else {
      profile = await db.volunteerProfile.create({
        data: {
          userId: user.id,
          skills: skillsStr,
          languages: langsStr,
          serviceRegions: regionsStr,
          availabilityStatus,
          equipment: equipmentStr,
          vehicle: vehicleStr,
          training: trainingStr,
          verificationStatus: 'PENDING',
        },
      })
    }

    return NextResponse.json({
      id: profile.id,
      userId: profile.userId,
      userName: user.name,
      skills: profile.skills ? profile.skills.split(',').map((s) => s.trim()).filter(Boolean) : [],
      languages: profile.languages ? profile.languages.split(',').map((s) => s.trim()).filter(Boolean) : [],
      serviceRegions: profile.serviceRegions
        ? profile.serviceRegions.split(';').map((s) => s.trim()).filter(Boolean)
        : [],
      availabilityStatus: profile.availabilityStatus,
      verificationStatus: profile.verificationStatus,
      updatedAt: profile.updatedAt,
      contact: contact ?? null,
      accessibility: accessibility ?? null,
      organizationName: organizationName ?? null,
    })
  } catch (err: any) {
    console.error('[api/volunteers POST]', err)
    return NextResponse.json(
      { error: 'Failed to submit volunteer application', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

function safeJson(s: string): any {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

function normalizeAvailability(v: any): string {
  if (typeof v === 'string' && ['AVAILABLE', 'BUSY', 'OFFLINE'].includes(v)) return v
  if (v === true) return 'AVAILABLE'
  if (v === false) return 'OFFLINE'
  return 'AVAILABLE'
}

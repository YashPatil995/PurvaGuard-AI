import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/ops — Operations dashboard overview.
// Returns counts of active alerts grouped by hazard/verification, incidents
// today + by status, pending-verification queue, high-priority queue, SOS
// queue, source health, volunteer availability + recent audit placeholder.
export async function GET() {
  try {
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [
      activeAlerts,
      incidentsToday,
      allIncidents,
      pendingVerificationRaw,
      highPriorityRaw,
      sosRaw,
      sources,
      availableVolunteers,
      openTasks,
    ] = await Promise.all([
      db.alert.findMany({
        where: { status: 'ACTIVE' },
        select: { alertType: true, verificationStatus: true },
      }),
      db.incident.count({ where: { createdAt: { gte: startOfToday } } }),
      db.incident.findMany({
        select: { status: true, priority: true, incidentType: true },
      }),
      db.incident.findMany({
        where: {
          verificationStatus: 'UNVERIFIED',
          status: { in: ['NEW', 'TRIAGED'] },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          incidentCode: true,
          incidentType: true,
          priority: true,
          description: true,
          lat: true,
          lng: true,
          createdAt: true,
        },
      }),
      db.incident.findMany({
        where: {
          priority: { in: ['HIGH', 'CRITICAL'] },
          status: { not: 'RESOLVED' },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          incidentCode: true,
          incidentType: true,
          priority: true,
          description: true,
          status: true,
          lat: true,
          lng: true,
          createdAt: true,
        },
      }),
      db.incident.findMany({
        where: { incidentType: 'SOS', status: { not: 'RESOLVED' } },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          id: true,
          incidentCode: true,
          priority: true,
          status: true,
          lat: true,
          lng: true,
          locationCapturedAt: true,
          locationKind: true,
          assignedTeamId: true,
          createdAt: true,
          assignments: {
            select: {
              id: true,
              status: true,
              volunteer: { select: { id: true, name: true } },
            },
          },
        },
      }),
      db.dataSource.findMany({
        select: {
          id: true,
          name: true,
          sourceType: true,
          provider: true,
          healthStatus: true,
          lastSuccessAt: true,
          lastErrorMessage: true,
          simulationMode: true,
          enabled: true,
        },
      }),
      db.volunteerProfile.count({
        where: { availabilityStatus: 'AVAILABLE', verificationStatus: 'VERIFIED' },
      }),
      db.responseTask.findMany({
        where: { status: 'OPEN' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          taskType: true,
          lat: true,
          lng: true,
          status: true,
          requiredSkills: true,
          createdAt: true,
        },
      }),
    ])

    // Group counts
    const activeAlertsByHazard: Record<string, number> = {}
    const activeAlertsByVerification: Record<string, number> = {}
    for (const a of activeAlerts) {
      activeAlertsByHazard[a.alertType] = (activeAlertsByHazard[a.alertType] ?? 0) + 1
      activeAlertsByVerification[a.verificationStatus] =
        (activeAlertsByVerification[a.verificationStatus] ?? 0) + 1
    }

    const incidentsByStatus: Record<string, number> = {}
    for (const i of allIncidents) {
      incidentsByStatus[i.status] = (incidentsByStatus[i.status] ?? 0) + 1
    }

    const now = Date.now()
    const sosQueue = sosRaw.map((s) => {
      const ageMins = Math.max(0, Math.round((now - s.createdAt.getTime()) / 60000))
      const locationFreshnessMins = Math.max(
        0,
        Math.round((now - s.locationCapturedAt.getTime()) / 60000)
      )
      const assignment = s.assignments[0]
      return {
        id: s.id,
        incidentCode: s.incidentCode,
        priority: s.priority,
        status: s.status,
        ageMins,
        locationKind: s.locationKind,
        locationFreshnessMins,
        assignedTeamId: s.assignedTeamId ?? null,
        assignment: assignment
          ? {
              volunteerId: assignment.volunteer?.id ?? null,
              volunteerName: assignment.volunteer?.name ?? null,
              status: assignment.status,
            }
          : null,
        lat: s.lat,
        lng: s.lng,
        createdAt: s.createdAt,
      }
    })

    const sourceHealth = sources.map((s) => ({
      ...s,
      lastSuccessAt: s.lastSuccessAt,
    }))

    return NextResponse.json({
      activeAlertsByHazard,
      activeAlertsByVerification,
      activeAlertsTotal: activeAlerts.length,
      incidentsToday,
      incidentsByStatus,
      incidentsTotal: allIncidents.length,
      pendingVerification: pendingVerificationRaw,
      highPriorityQueue: highPriorityRaw,
      sosQueue,
      sourceHealth,
      volunteerAvailability: {
        availableVolunteers,
        openTasks,
      },
      recentAudit: {
        note: 'Audit logging active',
        items: [],
      },
      generatedAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[api/ops] GET failed', err)
    return NextResponse.json(
      { error: 'Failed to load operations overview', detail: String(err) },
      { status: 500 }
    )
  }
}

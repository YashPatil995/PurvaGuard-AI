import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/tasks
// List all ResponseTasks with assignments (include volunteer user name).
export async function GET() {
  try {
    const tasks = await db.responseTask.findMany({
      include: {
        coordinator: { select: { id: true, name: true } },
        assignments: {
          include: { volunteer: { select: { id: true, name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const items = tasks.map((t) => ({
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

    return NextResponse.json({ items })
  } catch (err: any) {
    console.error('[api/tasks GET]', err)
    return NextResponse.json(
      { error: 'Failed to load tasks', detail: String(err?.message ?? err) },
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

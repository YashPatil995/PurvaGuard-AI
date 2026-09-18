import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEMO_VOLUNTEER_EMAIL = 'volunteer.demo@purvaguard.in'

// PATCH /api/tasks/[id]
// Body: { assignmentId?, volunteerId?, action }
// action ∈ accept | checkin | checkout | complete
// Updates TaskAssignment status + timestamps. Optionally updates task status.
//
// When action === 'accept' and no assignmentId is supplied but volunteerId is provided
// (or the demo volunteer user is found), a new TaskAssignment is created with status ACCEPTED.
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id: taskId } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const { assignmentId, action, volunteerId } = body || {}

    const validActions = ['accept', 'checkin', 'checkout', 'complete']
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: `action must be one of ${validActions.join(', ')}` },
        { status: 400 }
      )
    }

    // Verify task exists
    const task = await db.responseTask.findUnique({ where: { id: taskId } })
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Resolve a volunteerId when only assignmentId is given
    let resolvedVolunteerId: string | undefined = volunteerId

    // Look up assignment by id
    let assignment = assignmentId
      ? await db.taskAssignment.findUnique({ where: { id: assignmentId } })
      : undefined

    // If no assignment for an "accept" action, auto-create one for the demo volunteer
    if (action === 'accept' && (!assignment || assignment.taskId !== taskId)) {
      if (!resolvedVolunteerId) {
        const demoUser = await db.user.findUnique({ where: { email: DEMO_VOLUNTEER_EMAIL } })
        resolvedVolunteerId = demoUser?.id
      }
      if (!resolvedVolunteerId) {
        return NextResponse.json(
          { error: 'Could not resolve volunteer — provide volunteerId or sign in as the demo volunteer.' },
          { status: 400 }
        )
      }
      // Check the task is still open/assignable
      if (!['OPEN', 'ASSIGNED', 'IN_PROGRESS'].includes(task.status)) {
        return NextResponse.json(
          { error: `Task is ${task.status} and cannot accept new volunteers` },
          { status: 409 }
        )
      }
      // Avoid duplicate assignment for the same volunteer
      const existing = await db.taskAssignment.findFirst({
        where: { taskId, volunteerId: resolvedVolunteerId },
      })
      if (existing) {
        assignment = existing
      } else {
        // Create the assignment already in ASSIGNED state; the code path below
        // will then promote it to ACCEPTED with acceptedAt = now.
        assignment = await db.taskAssignment.create({
          data: {
            taskId,
            volunteerId: resolvedVolunteerId,
            status: 'ASSIGNED',
          },
        })
      }
    }

    if (!assignment || assignment.taskId !== taskId) {
      return NextResponse.json(
        { error: 'Assignment not found for this task. For accept, supply volunteerId.' },
        { status: 404 }
      )
    }

    const now = new Date()
    let newStatus = assignment.status
    const patch: any = { status: undefined }

    if (action === 'accept') {
      newStatus = 'ACCEPTED'
      patch.acceptedAt = now
    } else if (action === 'checkin') {
      newStatus = 'CHECKED_IN'
      patch.checkinAt = now
      if (!assignment.acceptedAt) patch.acceptedAt = now
    } else if (action === 'checkout') {
      newStatus = 'CHECKED_IN' // checkout = end of active shift, but still in progress until complete
      patch.checkoutAt = now
    } else if (action === 'complete') {
      newStatus = 'COMPLETED'
      patch.checkoutAt = assignment.checkoutAt ?? now
    }
    patch.status = newStatus

    const updated = await db.taskAssignment.update({
      where: { id: assignment.id },
      data: patch,
      include: { volunteer: { select: { id: true, name: true } } },
    })

    // Side-effect: keep ResponseTask.status in sync when appropriate
    if (action === 'accept') {
      if (task.status === 'OPEN') {
        await db.responseTask.update({ where: { id: taskId }, data: { status: 'ASSIGNED' } })
      }
    } else if (action === 'checkin') {
      if (task.status !== 'IN_PROGRESS') {
        await db.responseTask.update({ where: { id: taskId }, data: { status: 'IN_PROGRESS' } })
      }
    } else if (action === 'complete') {
      // If all assignments for this task are COMPLETED, mark task COMPLETED
      const remaining = await db.taskAssignment.count({
        where: { taskId, status: { not: 'COMPLETED' } },
      })
      if (remaining === 0) {
        await db.responseTask.update({ where: { id: taskId }, data: { status: 'COMPLETED' } })
      }
    }

    const refreshedTask = await db.responseTask.findUnique({
      where: { id: taskId },
      select: { id: true, status: true, updatedAt: true },
    })

    return NextResponse.json({
      assignment: {
        id: updated.id,
        taskId: updated.taskId,
        volunteerId: updated.volunteerId,
        volunteerName: updated.volunteer?.name ?? 'Unknown',
        status: updated.status,
        assignedAt: updated.assignedAt,
        acceptedAt: updated.acceptedAt,
        checkinAt: updated.checkinAt,
        checkoutAt: updated.checkoutAt,
        completionNote: updated.completionNote,
      },
      task: refreshedTask,
    })
  } catch (err: any) {
    console.error('[api/tasks PATCH]', err)
    return NextResponse.json(
      { error: 'Failed to update task assignment', detail: String(err?.message ?? err) },
      { status: 500 }
    )
  }
}

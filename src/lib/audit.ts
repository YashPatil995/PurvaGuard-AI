// PurvaGuard AI — shared audit log helper used by ops + admin mutations.
import { db } from '@/lib/db'

export async function getDemoActor(email: string) {
  const user = await db.user.findUnique({ where: { email } })
  return user
}

export async function writeAudit(args: {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  before?: unknown
  after?: unknown
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId: args.actorId ?? null,
        action: args.action,
        entityType: args.entityType,
        entityId: args.entityId ?? null,
        before: args.before !== undefined ? JSON.stringify(args.before) : null,
        after: args.after !== undefined ? JSON.stringify(args.after) : null,
      },
    })
  } catch (err) {
    // Don't fail the mutation because audit logging failed.
    console.error('[audit] write failed:', err)
  }
}

export function jsonSafe(value: unknown) {
  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return value
  }
}

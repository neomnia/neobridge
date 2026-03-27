/**
 * GET    /api/teams/[teamId] — détail team
 * PUT    /api/teams/[teamId] — update name/plan (Owner ou Super Admin)
 * DELETE /api/teams/[teamId] — supprime (Super Admin uniquement)
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isSuperAdmin } from '@/lib/auth/server'
import { db } from '@/db'

type Params = { params: Promise<{ teamId: string }> }

async function getTeamMemberRole(
  teamId: string,
  userId: string
): Promise<string | null> {
  try {
    const { teamMembers } = await import('@/db/schema')
    const { eq, and } = await import('drizzle-orm')

    const [row] = await db
      .select({ role: teamMembers.role })
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .limit(1)

    return row?.role ?? null
  } catch {
    return null
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { teamId } = await params

    try {
      const { teams } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const [team] = await db
        .select()
        .from(teams)
        .where(eq(teams.id, teamId))
        .limit(1)

      if (!team) {
        return NextResponse.json(
          { success: false, error: 'Not found' },
          { status: 404 }
        )
      }

      // Vérifie l'accès : super_admin ou membre de la team
      const superAdmin = await isSuperAdmin(user.userId)
      if (!superAdmin) {
        const role = await getTeamMemberRole(teamId, user.userId)
        if (!role) {
          return NextResponse.json(
            { success: false, error: 'Forbidden' },
            { status: 403 }
          )
        }
      }

      return NextResponse.json({ success: true, data: team })
    } catch (err) {
      console.warn('[teams/[teamId]] Table not yet migrated:', err)
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      )
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { teamId } = await params

    // Owner ou Super Admin requis
    const superAdmin = await isSuperAdmin(user.userId)
    if (!superAdmin) {
      const role = await getTeamMemberRole(teamId, user.userId)
      if (role !== 'owner') {
        return NextResponse.json(
          { success: false, error: 'Forbidden — owner or super_admin required' },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (body.name !== undefined) updates.name = body.name
    if (body.plan !== undefined) updates.plan = body.plan

    try {
      const { teams } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const [row] = await db
        .update(teams)
        .set(updates)
        .where(eq(teams.id, teamId))
        .returning()

      if (!row) {
        return NextResponse.json(
          { success: false, error: 'Not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, data: row })
    } catch (err) {
      console.error('[teams/[teamId]] Update failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to update team' },
        { status: 500 }
      )
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { teamId } = await params

    // Super Admin uniquement
    const superAdmin = await isSuperAdmin(user.userId)
    if (!superAdmin) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — super_admin required' },
        { status: 403 }
      )
    }

    try {
      const { teams } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      await db.delete(teams).where(eq(teams.id, teamId))

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[teams/[teamId]] Delete failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to delete team' },
        { status: 500 }
      )
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

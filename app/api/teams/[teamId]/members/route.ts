/**
 * GET    /api/teams/[teamId]/members — liste les membres
 * POST   /api/teams/[teamId]/members — invite/ajoute un membre { userId, role }
 * DELETE /api/teams/[teamId]/members — retire un membre { userId }
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

    // Accès : membre de la team ou super_admin
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

    try {
      const { teamMembers, users } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const rows = await db
        .select({
          userId: teamMembers.userId,
          role: teamMembers.role,
          joinedAt: teamMembers.createdAt,
          email: users.email,
          firstName: users.firstName,
          lastName: users.lastName,
        })
        .from(teamMembers)
        .innerJoin(users, eq(teamMembers.userId, users.id))
        .where(eq(teamMembers.teamId, teamId))

      return NextResponse.json({ success: true, data: rows })
    } catch (err) {
      console.warn('[teams/members] Table not yet migrated:', err)
      return NextResponse.json({ success: true, data: [] })
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { teamId } = await params

    // Owner ou super_admin peut inviter
    const superAdmin = await isSuperAdmin(user.userId)
    if (!superAdmin) {
      const role = await getTeamMemberRole(teamId, user.userId)
      if (role !== 'owner' && role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Forbidden — owner, admin, or super_admin required' },
          { status: 403 }
        )
      }
    }

    const body = await req.json()
    const { userId, role } = body

    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: 'userId and role are required' },
        { status: 400 }
      )
    }

    try {
      const { teamMembers } = await import('@/db/schema')

      const [row] = await db
        .insert(teamMembers)
        .values({ teamId, userId, role })
        .returning()

      return NextResponse.json({ success: true, data: row }, { status: 201 })
    } catch (err) {
      console.error('[teams/members] Insert failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to add member — user may already be a member or table not migrated' },
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

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const user = await requireAuth()
    const { teamId } = await params

    const body = await req.json()
    const { userId: targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      )
    }

    // Owner/admin ou super_admin peut retirer — un membre peut se retirer lui-même
    const superAdmin = await isSuperAdmin(user.userId)
    const isSelf = user.userId === targetUserId
    if (!superAdmin && !isSelf) {
      const role = await getTeamMemberRole(teamId, user.userId)
      if (role !== 'owner' && role !== 'admin') {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        )
      }
    }

    try {
      const { teamMembers } = await import('@/db/schema')
      const { eq, and } = await import('drizzle-orm')

      await db
        .delete(teamMembers)
        .where(
          and(
            eq(teamMembers.teamId, teamId),
            eq(teamMembers.userId, targetUserId)
          )
        )

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[teams/members] Delete failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to remove member' },
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

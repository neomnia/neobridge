/**
 * GET  /api/teams — liste les teams
 *   super_admin → toutes les teams
 *   user        → seulement ses teams via team_members
 *
 * POST /api/teams — crée une team { name, slug, plan? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isSuperAdmin } from '@/lib/auth/server'
import { db } from '@/db'

export async function GET() {
  try {
    const user = await requireAuth()

    try {
      const { teams, teamMembers } = await import('@/db/schema')
      const { eq, desc } = await import('drizzle-orm')

      const superAdmin = await isSuperAdmin(user.userId)

      if (superAdmin) {
        const rows = await db
          .select({
            id: teams.id,
            name: teams.name,
            slug: teams.slug,
            plan: teams.plan,
            createdAt: teams.createdAt,
            updatedAt: teams.updatedAt,
          })
          .from(teams)
          .orderBy(desc(teams.createdAt))

        return NextResponse.json({ success: true, data: rows })
      }

      // Utilisateur normal : seulement ses teams
      const rows = await db
        .select({
          id: teams.id,
          name: teams.name,
          slug: teams.slug,
          plan: teams.plan,
          role: teamMembers.role,
          createdAt: teams.createdAt,
          updatedAt: teams.updatedAt,
        })
        .from(teamMembers)
        .innerJoin(teams, eq(teamMembers.teamId, teams.id))
        .where(eq(teamMembers.userId, user.userId))
        .orderBy(desc(teams.createdAt))

      return NextResponse.json({ success: true, data: rows })
    } catch (err) {
      console.warn('[teams] Table not yet migrated:', err)
      return NextResponse.json({ success: true, data: [] })
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await req.json()
    const { name, slug, plan } = body

    if (!name || !slug) {
      return NextResponse.json(
        { success: false, error: 'name and slug are required' },
        { status: 400 }
      )
    }

    try {
      const { teams, teamMembers } = await import('@/db/schema')

      const [team] = await db
        .insert(teams)
        .values({ name, slug, plan: plan ?? 'free' })
        .returning()

      // Ajouter le créateur comme owner
      await db.insert(teamMembers).values({
        teamId: team.id,
        userId: user.userId,
        role: 'owner',
      })

      return NextResponse.json({ success: true, data: team }, { status: 201 })
    } catch (err) {
      console.error('[teams] Insert failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to create team — table may not be migrated yet' },
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

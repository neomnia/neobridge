/**
 * GET  /api/teams/[teamId]/credentials — liste les api_credentials de la team (sans credentials en clair)
 * POST /api/teams/[teamId]/credentials — crée un override { type, label, credentials: object }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, isSuperAdmin } from '@/lib/auth/server'
import { db } from '@/db'
import { encrypt } from '@/lib/encryption'

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
      const { apiCredentials } = await import('@/db/schema')
      const { eq, desc } = await import('drizzle-orm')

      const rows = await db
        .select({
          id: apiCredentials.id,
          type: apiCredentials.type,
          label: apiCredentials.label,
          createdAt: apiCredentials.createdAt,
          updatedAt: apiCredentials.updatedAt,
        })
        .from(apiCredentials)
        .where(eq(apiCredentials.teamId, teamId))
        .orderBy(desc(apiCredentials.createdAt))

      return NextResponse.json({ success: true, data: rows })
    } catch (err) {
      console.warn('[teams/credentials] Table not yet migrated:', err)
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

    // Owner/admin ou super_admin peut créer un override
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
    const { type, label, credentials } = body

    if (!type || !label || !credentials || typeof credentials !== 'object') {
      return NextResponse.json(
        { success: false, error: 'type, label and credentials (object) are required' },
        { status: 400 }
      )
    }

    const encryptedCredentials = await encrypt(credentials)

    try {
      const { apiCredentials } = await import('@/db/schema')

      const [row] = await db
        .insert(apiCredentials)
        .values({
          teamId,
          type,
          label,
          credentials: encryptedCredentials,
        })
        .returning({
          id: apiCredentials.id,
          type: apiCredentials.type,
          label: apiCredentials.label,
          teamId: apiCredentials.teamId,
          createdAt: apiCredentials.createdAt,
        })

      return NextResponse.json({ success: true, data: row }, { status: 201 })
    } catch (err) {
      console.error('[teams/credentials] Insert failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to create credential — table may not be migrated yet' },
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

/**
 * GET    /api/projects/[id]/apps/[appId] — détail app
 * PUT    /api/projects/[id]/apps/[appId] — update
 * DELETE /api/projects/[id]/apps/[appId] — supprime
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { db } from '@/db'

type Params = { params: Promise<{ id: string; appId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id, appId } = await params

    try {
      const { projectApps } = await import('@/db/schema')
      const { eq, and } = await import('drizzle-orm')

      const [row] = await db
        .select()
        .from(projectApps)
        .where(
          and(
            eq(projectApps.id, appId),
            eq(projectApps.projectId, id)
          )
        )
        .limit(1)

      if (!row) {
        return NextResponse.json(
          { success: false, error: 'Not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, data: row })
    } catch (err) {
      console.warn('[projects/apps/[appId]] Table not yet migrated:', err)
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
    await requireAuth()
    const { id, appId } = await params
    const body = await req.json()

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    const allowedFields = [
      'name',
      'platform',
      'externalResourceId',
      'type',
      'branch',
      'credentialSource',
      'status',
    ]
    for (const field of allowedFields) {
      if (body[field] !== undefined) updates[field] = body[field]
    }

    try {
      const { projectApps } = await import('@/db/schema')
      const { eq, and } = await import('drizzle-orm')

      const [row] = await db
        .update(projectApps)
        .set(updates)
        .where(
          and(
            eq(projectApps.id, appId),
            eq(projectApps.projectId, id)
          )
        )
        .returning()

      if (!row) {
        return NextResponse.json(
          { success: false, error: 'Not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, data: row })
    } catch (err) {
      console.error('[projects/apps/[appId]] Update failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to update app' },
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
    await requireAuth()
    const { id, appId } = await params

    try {
      const { projectApps } = await import('@/db/schema')
      const { eq, and } = await import('drizzle-orm')

      await db
        .delete(projectApps)
        .where(
          and(
            eq(projectApps.id, appId),
            eq(projectApps.projectId, id)
          )
        )

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[projects/apps/[appId]] Delete failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to delete app' },
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

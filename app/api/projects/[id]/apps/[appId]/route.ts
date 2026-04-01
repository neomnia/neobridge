/**
 * GET    /api/projects/[id]/apps/[appId] — détail ressource
 * PUT    /api/projects/[id]/apps/[appId] — update
 * DELETE /api/projects/[id]/apps/[appId] — supprime
 *
 * Migration note: table project_apps → project_resources
 * platform → provider, type → resourceType
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { db } from '@/db'
import { projectResources } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

type Params = { params: Promise<{ id: string; appId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id, appId } = await params

    const [row] = await db
      .select()
      .from(projectResources)
      .where(and(eq(projectResources.id, appId), eq(projectResources.projectId, id)))
      .limit(1)

    if (!row) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: row })
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id, appId } = await params
    const body = await req.json()

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    // Accept both old and new field names
    if (body.provider   !== undefined) updates.provider      = body.provider
    if (body.platform   !== undefined) updates.provider      = body.platform   // legacy
    if (body.name       !== undefined) updates.name          = body.name
    if (body.resourceType !== undefined) updates.resourceType = body.resourceType
    if (body.type       !== undefined) updates.resourceType   = body.type      // legacy
    if (body.externalResourceId !== undefined) updates.externalResourceId = body.externalResourceId
    if (body.branch     !== undefined) updates.branch        = body.branch
    if (body.credentialSource !== undefined) updates.credentialSource = body.credentialSource
    if (body.status     !== undefined) updates.status        = body.status

    const [row] = await db
      .update(projectResources)
      .set(updates)
      .where(and(eq(projectResources.id, appId), eq(projectResources.projectId, id)))
      .returning()

    if (!row) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: row })
  } catch (err) {
    console.error('[projects/apps/[appId]] Update failed:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id, appId } = await params

    await db
      .delete(projectResources)
      .where(and(eq(projectResources.id, appId), eq(projectResources.projectId, id)))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[projects/apps/[appId]] Delete failed:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

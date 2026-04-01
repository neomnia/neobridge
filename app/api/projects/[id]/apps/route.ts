/**
 * GET  /api/projects/[id]/apps — liste les ressources d'un projet
 * POST /api/projects/[id]/apps — ajoute une ressource { provider, externalResourceId, name, resourceType, branch?, credentialSource }
 *
 * Migration note: table project_apps → project_resources
 * platform → provider, type → resourceType
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { db } from '@/db'
import { projects, projectResources } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const rows = await db
      .select()
      .from(projectResources)
      .where(eq(projectResources.projectId, id))
      .orderBy(desc(projectResources.createdAt))

    return NextResponse.json({ success: true, data: rows })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1)

    if (!project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    const body = await req.json()
    // Accept both old field names (platform/type) and new (provider/resourceType) for compatibility
    const {
      provider    = body.platform,
      externalResourceId,
      name,
      resourceType = body.type,
      branch,
      credentialSource = 'admin',
    } = body

    if (!provider || !name || !resourceType) {
      return NextResponse.json(
        { success: false, error: 'provider, name and resourceType are required' },
        { status: 400 }
      )
    }

    const [row] = await db
      .insert(projectResources)
      .values({
        projectId: id,
        provider,
        externalResourceId: externalResourceId ?? null,
        name,
        resourceType,
        branch: branch ?? null,
        credentialSource,
      })
      .returning()

    return NextResponse.json({ success: true, data: row }, { status: 201 })
  } catch (err) {
    console.error('[projects/[id]/apps] POST failed:', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

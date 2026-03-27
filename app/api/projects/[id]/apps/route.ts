/**
 * GET  /api/projects/[id]/apps — liste les project_apps d'un projet
 * POST /api/projects/[id]/apps — ajoute une app { platform, externalResourceId, name, type, branch?, credentialSource }
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { db } from '@/db'
import { projects } from '@/db/schema'
import { eq } from 'drizzle-orm'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params

    // Vérifie que le projet existe
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

    try {
      const { projectApps } = await import('@/db/schema')
      const { desc } = await import('drizzle-orm')

      const rows = await db
        .select()
        .from(projectApps)
        .where(eq(projectApps.projectId, id))
        .orderBy(desc(projectApps.createdAt))

      return NextResponse.json({ success: true, data: rows })
    } catch (err) {
      console.warn('[projects/[id]/apps] Table not yet migrated:', err)
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
    await requireAuth()
    const { id } = await params

    // Vérifie que le projet existe
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
    const { platform, externalResourceId, name, type, branch, credentialSource } = body

    if (!platform || !name || !type || !credentialSource) {
      return NextResponse.json(
        {
          success: false,
          error: 'platform, name, type and credentialSource are required',
        },
        { status: 400 }
      )
    }

    try {
      const { projectApps } = await import('@/db/schema')

      const [row] = await db
        .insert(projectApps)
        .values({
          projectId: id,
          platform,
          externalResourceId: externalResourceId ?? null,
          name,
          type,
          branch: branch ?? null,
          credentialSource,
        })
        .returning()

      return NextResponse.json({ success: true, data: row }, { status: 201 })
    } catch (err) {
      console.error('[projects/[id]/apps] Insert failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to create app — table may not be migrated yet' },
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

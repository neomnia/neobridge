/**
 * GET  /api/projects/[id]/resources — list resources for a project
 * POST /api/projects/[id]/resources — upsert a resource
 */

import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/server"
import { db } from "@/db"
import { projects, projectResources } from "@/db/schema"
import { eq, and } from "drizzle-orm"

type Params = { params: Promise<{ id: string }> }

async function resolveProject(projectId: string) {
  const [row] = await db
    .select({ id: projects.id, teamId: projects.teamId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  return row ?? null
}

// ---------------------------------------------------------------------------
// GET
// ---------------------------------------------------------------------------

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params

    const project = await resolveProject(id)
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    const rows = await db
      .select()
      .from(projectResources)
      .where(eq(projectResources.projectId, id))
      .orderBy(projectResources.createdAt)

    return NextResponse.json({ success: true, data: rows })
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
}

// ---------------------------------------------------------------------------
// POST — upsert (onConflictDoUpdate on projectId + provider + name)
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params

    const project = await resolveProject(id)
    if (!project) {
      return NextResponse.json({ success: false, error: "Project not found" }, { status: 404 })
    }

    const body: {
      provider: string
      name: string
      resourceType: string
      externalResourceId?: string
      url?: string
      branch?: string
      credentialSource?: string
      config?: Record<string, unknown>
      status?: string
    } = await req.json()

    const { provider, name, resourceType, externalResourceId, url, branch, credentialSource, config, status } = body

    if (!provider || !name || !resourceType) {
      return NextResponse.json(
        { success: false, error: "provider, name and resourceType are required" },
        { status: 400 },
      )
    }

    const [row] = await db
      .insert(projectResources)
      .values({
        projectId: id,
        provider,
        name,
        resourceType,
        externalResourceId: externalResourceId ?? null,
        url: url ?? null,
        branch: branch ?? null,
        credentialSource: credentialSource ?? "admin",
        config: config ?? {},
        status: status ?? "active",
      })
      .onConflictDoUpdate({
        target: [projectResources.projectId, projectResources.provider, projectResources.name],
        set: {
          resourceType,
          externalResourceId: externalResourceId ?? null,
          url: url ?? null,
          branch: branch ?? null,
          credentialSource: credentialSource ?? "admin",
          config: config ?? {},
          status: status ?? "active",
          updatedAt: new Date(),
        },
      })
      .returning()

    return NextResponse.json({ success: true, data: row }, { status: 201 })
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
}

// ---------------------------------------------------------------------------
// DELETE — with optional deleteOnVercel flag
// ---------------------------------------------------------------------------

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params

    const { resourceId, deleteOnVercel } = (await req.json()) as {
      resourceId: string
      deleteOnVercel?: boolean
    }

    if (!resourceId) {
      return NextResponse.json({ success: false, error: "resourceId is required" }, { status: 400 })
    }

    // Fetch resource details before deleting
    const [resource] = await db
      .select()
      .from(projectResources)
      .where(and(eq(projectResources.id, resourceId), eq(projectResources.projectId, id)))
      .limit(1)

    if (!resource) {
      return NextResponse.json({ success: false, error: "Resource not found" }, { status: 404 })
    }

    // Optional: delete on Vercel if requested and provider is vercel
    if (deleteOnVercel && resource.provider === "vercel" && resource.externalResourceId) {
      try {
        const { deleteVercelProject } = await import("@/lib/connectors/vercel")
        const adminToken = process.env.VERCEL_ADMIN_TOKEN
        const vercelTeamId = process.env.VERCEL_TEAM_ID

        if (!adminToken || !vercelTeamId) {
          return NextResponse.json(
            { success: false, error: "VERCEL_ADMIN_TOKEN or VERCEL_TEAM_ID not configured" },
            { status: 500 },
          )
        }

        await deleteVercelProject(resource.externalResourceId, vercelTeamId, adminToken)
      } catch (err) {
        return NextResponse.json(
          { success: false, error: `Vercel deletion failed: ${(err as Error).message}` },
          { status: 502 },
        )
      }
    }

    await db
      .delete(projectResources)
      .where(and(eq(projectResources.id, resourceId), eq(projectResources.projectId, id)))

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
  }
}

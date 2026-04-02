import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/server"
import { db } from "@/db"
import { projectConnectors, projects } from "@/db/schema"
import { eq, and } from "drizzle-orm"

/**
 * POST /api/github/link
 * Body: { projectId: string, repoFullName: string, repoUrl: string, repoName: string }
 * Links a GitHub repository to a Neobridge project via a projectConnector.
 * Replaces any existing GitHub connector on that project.
 */
export async function POST(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { projectId, repoFullName, repoUrl, repoName, cloneUrl, sshUrl, defaultBranch } = body

  if (!projectId || !repoFullName) {
    return NextResponse.json(
      { error: "projectId and repoFullName are required" },
      { status: 400 },
    )
  }

  // Verify project exists
  const project = await db.query.projects.findFirst({
    where: eq(projects.id, projectId),
  })
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 })
  }

  // Remove any existing github connector for this project
  await db
    .delete(projectConnectors)
    .where(
      and(
        eq(projectConnectors.projectId, projectId),
        eq(projectConnectors.type, "github"),
      ),
    )

  // Create new connector
  const [connector] = await db
    .insert(projectConnectors)
    .values({
      projectId,
      type: "github",
      label: repoFullName,
      config: {
        repoFullName,
        repoName: repoName ?? repoFullName.split("/")[1],
        repoUrl: repoUrl ?? `https://github.com/${repoFullName}`,
        cloneUrl: cloneUrl ?? `https://github.com/${repoFullName}.git`,
        sshUrl: sshUrl ?? `git@github.com:${repoFullName}.git`,
        defaultBranch: defaultBranch ?? "main",
        linkedAt: new Date().toISOString(),
      },
    })
    .returning()

  return NextResponse.json({ success: true, connector }, { status: 201 })
}

/**
 * DELETE /api/github/link
 * Body: { connectorId: string }
 * Removes the link between a GitHub repo and a Neobridge project.
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { connectorId } = body

  if (!connectorId) {
    return NextResponse.json({ error: "connectorId is required" }, { status: 400 })
  }

  await db.delete(projectConnectors).where(eq(projectConnectors.id, connectorId))

  return NextResponse.json({ success: true })
}

import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/server"
import { listAllRepos, getGitHubUser, resolveGitHubToken } from "@/lib/connectors/github"
import { db } from "@/db"
import { projectConnectors, projects } from "@/db/schema"
import { eq } from "drizzle-orm"

export const dynamic = "force-dynamic"

/**
 * GET /api/github/repos
 * Returns all GitHub repos accessible to the configured PAT,
 * annotated with which Neobridge project (if any) each repo is linked to.
 */
export async function GET() {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const token = await resolveGitHubToken()
  if (!token) {
    return NextResponse.json(
      { error: "GitHub token not configured. Ask an admin to configure it in API Management." },
      { status: 503 },
    )
  }

  // Fetch repos + authenticated user in parallel
  const [repos, user] = await Promise.all([
    listAllRepos(token),
    getGitHubUser(token),
  ])

  // Fetch all existing github connectors to know which repos are already linked
  const existingLinks = await db
    .select({
      id: projectConnectors.id,
      projectId: projectConnectors.projectId,
      config: projectConnectors.config,
    })
    .from(projectConnectors)
    .where(eq(projectConnectors.type, "github"))

  // Build a map: repoFullName → { connectorId, projectId }
  const linkedMap: Record<string, { connectorId: string; projectId: string }> = {}
  for (const link of existingLinks) {
    const cfg = link.config as Record<string, unknown>
    const fullName = cfg.repoFullName as string | undefined
    if (fullName) {
      linkedMap[fullName] = { connectorId: link.id, projectId: link.projectId }
    }
  }

  // Fetch project names for linked repos
  const linkedProjectIds = [...new Set(Object.values(linkedMap).map((l) => l.projectId))]
  const projectNames: Record<string, string> = {}
  if (linkedProjectIds.length > 0) {
    const rows = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
    for (const row of rows) {
      projectNames[row.id] = row.name
    }
  }

  // Annotate repos
  const annotated = repos.map((repo) => ({
    ...repo,
    linked: linkedMap[repo.full_name] ?? null,
    linkedProjectName: linkedMap[repo.full_name]
      ? projectNames[linkedMap[repo.full_name].projectId] ?? null
      : null,
  }))

  return NextResponse.json({
    user,
    repos: annotated,
    total: annotated.length,
  })
}

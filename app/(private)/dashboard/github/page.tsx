import { Key } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { listAllRepos, getGitHubUser, resolveGitHubToken } from "@/lib/connectors/github"
import { db } from "@/db"
import { projectConnectors, projects } from "@/db/schema"
import { eq } from "drizzle-orm"
import { GitHubReposClient } from "./github-client"

export const metadata = { title: "GitHub — NeoBridge" }
export const dynamic = "force-dynamic"

export default async function GitHubPage() {
  const token = await resolveGitHubToken()

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Key className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">Token GitHub non configuré</p>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez votre Personal Access Token dans la gestion des API pour accéder aux repositories.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/api">Configurer GitHub</Link>
        </Button>
      </div>
    )
  }

  // Fetch repos, user profile, all projects, and existing github connectors in parallel
  const [repos, user, allProjects, existingLinks] = await Promise.all([
    listAllRepos(token).catch(() => []),
    getGitHubUser(token).catch(() => null),
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
    db
      .select({
        id: projectConnectors.id,
        projectId: projectConnectors.projectId,
        config: projectConnectors.config,
      })
      .from(projectConnectors)
      .where(eq(projectConnectors.type, "github")),
  ])

  // Build linked map: repoFullName → { connectorId, projectId, projectName }
  const projectNameMap: Record<string, string> = {}
  for (const p of allProjects) projectNameMap[p.id] = p.name

  const linkedMap: Record<string, { connectorId: string; projectId: string; projectName: string }> = {}
  for (const link of existingLinks) {
    const cfg = link.config as Record<string, unknown>
    const fullName = cfg.repoFullName as string | undefined
    if (fullName) {
      linkedMap[fullName] = {
        connectorId: link.id,
        projectId: link.projectId,
        projectName: projectNameMap[link.projectId] ?? link.projectId,
      }
    }
  }

  const annotatedRepos = repos.map((repo) => ({
    ...repo,
    linked: linkedMap[repo.full_name] ?? null,
  }))

  return (
    <GitHubReposClient
      repos={annotatedRepos}
      user={user}
      projects={allProjects}
    />
  )
}

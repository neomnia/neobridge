import { Key, AlertCircle } from "lucide-react"
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
  // ── 1. Resolve token ────────────────────────────────────────────────────
  let token: string | null = null
  try {
    token = await resolveGitHubToken()
  } catch (err) {
    console.error("[GitHub page] resolveGitHubToken error:", err)
  }

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

  // ── 2. Fetch GitHub data + DB data (all errors isolated) ────────────────
  let repos: Awaited<ReturnType<typeof listAllRepos>> = []
  let user: Awaited<ReturnType<typeof getGitHubUser>> | null = null
  let githubError: string | null = null

  let allProjects: { id: string; name: string }[] = []
  let existingLinks: { id: string; projectId: string; config: unknown }[] = []

  await Promise.allSettled([
    // GitHub API
    listAllRepos(token).then((r) => { repos = r }).catch((err) => {
      console.error("[GitHub page] listAllRepos error:", err)
      githubError = err?.message ?? "Erreur de l'API GitHub"
    }),
    getGitHubUser(token).then((u) => { user = u }).catch(() => {}),

    // DB (tolerant to cold starts)
    db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(projects.name)
      .then((r) => { allProjects = r })
      .catch((err) => {
        console.error("[GitHub page] DB projects error:", err)
      }),
    db
      .select({
        id: projectConnectors.id,
        projectId: projectConnectors.projectId,
        config: projectConnectors.config,
      })
      .from(projectConnectors)
      .where(eq(projectConnectors.type, "github"))
      .then((r) => { existingLinks = r })
      .catch((err) => {
        console.error("[GitHub page] DB connectors error:", err)
      }),
  ])

  // ── 3. GitHub API hard error ─────────────────────────────────────────────
  if (githubError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-950">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-lg">Erreur GitHub API</p>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{githubError}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Vérifiez que votre PAT est valide et possède les scopes <code>repo</code> et <code>read:org</code>.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/api">Reconfigurer GitHub</Link>
        </Button>
      </div>
    )
  }

  // ── 4. Build linked map ──────────────────────────────────────────────────
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

/**
 * Vercel API connector — Admin token scope.
 * All functions are pure (no side-effects on DB).
 * DB writes happen in the API routes that call these.
 */

const VERCEL_API = "https://api.vercel.com"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VercelTeam {
  id: string
  name: string
  slug: string
  avatar: string | null
  membership: {
    role: string
  }
}

export interface VercelProject {
  id: string
  name: string
  framework: string | null
  latestDeployments: Array<{
    id: string
    url: string
    readyState: string
    createdAt: number
  }>
  updatedAt: number
}

export interface VercelDeployment {
  uid: string
  name: string
  url: string
  state: string
  target: string | null
  createdAt: number
  readyAt: number | null
  meta?: {
    githubCommitRef?: string
    githubCommitMessage?: string
    githubCommitAuthorName?: string
    githubCommitSha?: string
  }
  creator?: {
    uid: string
    username?: string
    email?: string
  }
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function vercelFetch(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${VERCEL_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(
      `Vercel API ${options.method ?? "GET"} ${path} → ${res.status}: ${body}`,
    )
  }

  return res
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * List all Vercel teams accessible by the admin token.
 * GET /v2/teams
 */
export async function syncVercelTeams(adminToken: string): Promise<VercelTeam[]> {
  const res = await vercelFetch("/v2/teams", adminToken)
  const data = await res.json()
  const teams: VercelTeam[] = data.teams ?? []
  return teams
}

/**
 * List all projects for a given Vercel team.
 * GET /v9/projects?teamId=[vercelTeamId]
 */
export async function listVercelProjects(
  vercelTeamId: string,
  token: string,
): Promise<VercelProject[]> {
  const res = await vercelFetch(
    `/v9/projects?teamId=${encodeURIComponent(vercelTeamId)}&limit=100`,
    token,
  )
  const data = await res.json()
  return (data.projects ?? []) as VercelProject[]
}

/**
 * Delete a project from Vercel. Irreversible — call only after user confirmation.
 * DELETE /v9/projects/[projectId]?teamId=[vercelTeamId]
 */
export async function deleteVercelProject(
  projectId: string,
  vercelTeamId: string,
  token: string,
): Promise<void> {
  await vercelFetch(
    `/v9/projects/${encodeURIComponent(projectId)}?teamId=${encodeURIComponent(vercelTeamId)}`,
    token,
    { method: "DELETE" },
  )
}

export interface VercelDomain {
  name: string
  apexName: string
  projectId: string
  verified: boolean
  createdAt: number
  updatedAt: number
  gitBranch: string | null
}

/**
 * Resolve a Vercel team slug + project name → { teamId, projectId, token }.
 * Returns null when the token is not configured or the project is not found.
 */
export async function resolveVercelProject(
  teamSlug: string,
  projectName: string,
  token: string,
): Promise<{ vercelTeamId: string; vercelProjectId: string } | null> {
  const teams = await syncVercelTeams(token)
  const team = teams.find((t) => t.slug === teamSlug)
  if (!team) return null

  const projects = await listVercelProjects(team.id, token)
  const project = projects.find((p) => p.name === projectName)
  if (!project) return null

  return { vercelTeamId: team.id, vercelProjectId: project.id }
}

/**
 * List domains attached to a Vercel project.
 * GET /v9/projects/[projectId]/domains
 */
export async function listProjectDomains(
  vercelProjectId: string,
  vercelTeamId: string,
  token: string,
): Promise<VercelDomain[]> {
  const res = await vercelFetch(
    `/v9/projects/${encodeURIComponent(vercelProjectId)}/domains?teamId=${encodeURIComponent(vercelTeamId)}`,
    token,
  )
  const data = await res.json()
  return (data.domains ?? []) as VercelDomain[]
}

/**
 * List recent deployments across all projects for a team (no projectId filter).
 * GET /v6/deployments?teamId=[vercelTeamId]
 */
export async function listAllVercelDeployments(
  vercelTeamId: string,
  token: string,
  limit = 30,
): Promise<VercelDeployment[]> {
  const res = await vercelFetch(
    `/v6/deployments?teamId=${encodeURIComponent(vercelTeamId)}&limit=${limit}`,
    token,
  )
  const data = await res.json()
  return (data.deployments ?? []) as VercelDeployment[]
}

/**
 * List recent deployments for a project.
 * GET /v6/deployments?projectId=[projectId]&teamId=[vercelTeamId]
 */
export async function listVercelDeployments(
  projectId: string,
  vercelTeamId: string,
  token: string,
  limit = 20,
): Promise<VercelDeployment[]> {
  const res = await vercelFetch(
    `/v6/deployments?projectId=${encodeURIComponent(projectId)}&teamId=${encodeURIComponent(vercelTeamId)}&limit=${limit}`,
    token,
  )
  const data = await res.json()
  return (data.deployments ?? []) as VercelDeployment[]
}

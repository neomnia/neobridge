import { serviceApiRepository } from '@/lib/services'
import { resolveCredential } from '@/lib/api-management'

const VERCEL_API_URL = 'https://api.vercel.com'

type VercelEnvironment = 'production' | 'test' | 'sandbox'

export interface VercelTeamSummary {
  id: string
  slug: string
  name: string
  avatar?: string | null
}

export interface VercelProjectSummary {
  id: string
  name: string
  framework?: string | null
  updatedAt?: number | null
  teamId?: string | null
  teamSlug?: string | null
  productionUrl?: string | null
  repo?: string | null
}

export interface VercelDeploymentSummary {
  id: string
  name: string
  url?: string | null
  state: string
  target?: string | null
  createdAt: number
  readyAt?: number | null
  teamId?: string | null
  teamSlug?: string | null
  projectId?: string | null
  commitRef?: string | null
}

interface StoredVercelConfig {
  token: string
  teamId?: string | null
}

async function getStoredVercelConfig(
  environment: VercelEnvironment = 'production',
  teamId?: string,
): Promise<StoredVercelConfig> {
  if (teamId) {
    const teamOverride = await resolveCredential('vercel', teamId).catch(() => null)
    const token = teamOverride?.apiToken || teamOverride?.token
    if (typeof token === 'string' && token.trim()) {
      return {
        token: token.trim(),
        teamId: typeof teamOverride?.teamId === 'string' ? teamOverride.teamId : null,
      }
    }
  }

  const cfg = await serviceApiRepository.getConfig('vercel' as any, environment) as any
  const token = cfg?.config?.apiToken || cfg?.config?.token
  if (!token || typeof token !== 'string') {
    throw new Error('Vercel configuration not found in NeoBridge')
  }

  return {
    token,
    teamId: typeof cfg?.config?.teamId === 'string' ? cfg.config.teamId : null,
  }
}

async function vercelRequest<T>(
  path: string,
  options?: {
    environment?: VercelEnvironment
    token?: string
    teamId?: string
  },
): Promise<T> {
  const stored = options?.token
    ? { token: options.token, teamId: options.teamId }
    : await getStoredVercelConfig(options?.environment ?? 'production', options?.teamId)

  const response = await fetch(`${VERCEL_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${stored.token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload) {
    const message = payload && typeof payload === 'object' && 'error' in payload
      ? String((payload as any).error?.message || (payload as any).error?.code || response.statusText)
      : response.statusText
    throw new Error(`Vercel API request failed (${response.status}): ${message}`)
  }

  return payload as T
}

export async function listVercelTeams(
  environment: VercelEnvironment = 'production',
  teamId?: string,
): Promise<VercelTeamSummary[]> {
  const payload = await vercelRequest<{ teams?: Array<any> }>(`/v2/teams?limit=100`, { environment, teamId })
  return (payload.teams ?? []).map((team) => ({
    id: String(team.id),
    slug: String(team.slug || team.id),
    name: String(team.name || team.slug || team.id),
    avatar: team.avatar ?? null,
  }))
}

export async function listVercelProjects(
  vercelTeamId?: string,
  environment: VercelEnvironment = 'production',
  teamId?: string,
): Promise<VercelProjectSummary[]> {
  const params = new URLSearchParams({ limit: '100' })
  if (vercelTeamId) params.set('teamId', vercelTeamId)

  const payload = await vercelRequest<{ projects?: Array<any> }>(`/v9/projects?${params.toString()}`, { environment, teamId })
  return (payload.projects ?? []).map((project) => ({
    id: String(project.id),
    name: String(project.name || project.id),
    framework: project.framework ?? null,
    updatedAt: typeof project.updatedAt === 'number' ? project.updatedAt : null,
    teamId: project.accountId ?? vercelTeamId ?? null,
    teamSlug: project?.link?.orgSlug ?? null,
    productionUrl: project?.latestDeployments?.[0]?.url ?? project?.targets?.production?.alias?.[0] ?? null,
    repo: project?.link?.repo ?? null,
  }))
}

export async function listAllVercelProjects(
  environment: VercelEnvironment = 'production',
  teamId?: string,
): Promise<VercelProjectSummary[]> {
  const teams = await listVercelTeams(environment, teamId).catch(() => [])
  if (!teams.length) {
    return listVercelProjects(undefined, environment, teamId).catch(() => [])
  }

  const grouped = await Promise.all(
    teams.map(async (team) => {
      const projects = await listVercelProjects(team.id, environment, teamId).catch(() => [])
      return projects.map((project) => ({
        ...project,
        teamId: team.id,
        teamSlug: team.slug,
      }))
    }),
  )

  return grouped.flat()
}

export async function listVercelDeployments(
  input?: {
    vercelTeamId?: string
    vercelProjectId?: string
    limit?: number
    environment?: VercelEnvironment
    teamId?: string
  },
): Promise<VercelDeploymentSummary[]> {
  const params = new URLSearchParams({ limit: String(input?.limit ?? 20) })
  if (input?.vercelTeamId) params.set('teamId', input.vercelTeamId)
  if (input?.vercelProjectId) params.set('projectId', input.vercelProjectId)

  const payload = await vercelRequest<{ deployments?: Array<any> }>(`/v6/deployments?${params.toString()}`, {
    environment: input?.environment ?? 'production',
    teamId: input?.teamId,
  })

  return (payload.deployments ?? []).map((deployment) => ({
    id: String(deployment.uid || deployment.id),
    name: String(deployment.name || deployment.uid || deployment.id),
    url: deployment.url ?? null,
    state: String(deployment.state || 'UNKNOWN'),
    target: deployment.target ?? null,
    createdAt: typeof deployment.createdAt === 'number' ? deployment.createdAt : Date.now(),
    readyAt: typeof deployment.readyAt === 'number' ? deployment.readyAt : null,
    teamId: input?.vercelTeamId ?? null,
    teamSlug: deployment?.meta?.githubOrg ?? null,
    projectId: deployment.projectId ?? null,
    commitRef: deployment?.meta?.githubCommitRef ?? null,
  }))
}

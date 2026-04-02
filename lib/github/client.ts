import { resolveCredential } from '@/lib/api-management'
import { serviceApiRepository } from '@/lib/services'

const GITHUB_API_URL = 'https://api.github.com'

type GitHubEnvironment = 'production' | 'test' | 'sandbox'

export interface GitHubRepositorySummary {
  id: string
  name: string
  fullName: string
  owner: string
  description?: string | null
  htmlUrl: string
  visibility: 'public' | 'private'
  isPrivate: boolean
  archived: boolean
  defaultBranch?: string | null
  pushedAt?: string | null
  updatedAt?: string | null
  language?: string | null
}

export interface GitHubRecentActivity {
  id: string
  repoName: string
  fullName: string
  owner: string
  branch?: string | null
  url: string
  timestamp: number
  state: 'PUSHED' | 'UPDATED'
  visibility: 'public' | 'private'
}

interface StoredGitHubConfig {
  token: string
}

async function getStoredGitHubConfig(
  environment: GitHubEnvironment = 'production',
  teamId?: string,
): Promise<StoredGitHubConfig> {
  const storedCredential = await resolveCredential('github_token', teamId).catch(() => null)
  const credentialToken = storedCredential?.personalAccessToken || storedCredential?.token

  if (typeof credentialToken === 'string' && credentialToken.trim()) {
    return { token: credentialToken.trim() }
  }

  const [tokenCfg, apiCfg] = await Promise.all([
    serviceApiRepository.getConfig('github_token' as any, environment).catch(() => null),
    serviceApiRepository.getConfig('github_api' as any, environment).catch(() => null),
  ]) as any[]

  const token = tokenCfg?.config?.personalAccessToken
    || tokenCfg?.config?.token
    || apiCfg?.config?.personalAccessToken
    || apiCfg?.config?.token

  if (!token || typeof token !== 'string') {
    throw new Error('GitHub token not found in NeoBridge')
  }

  return { token: token.trim() }
}

async function githubRequest<T>(
  path: string,
  options?: {
    environment?: GitHubEnvironment
    teamId?: string
  },
): Promise<T> {
  const stored = await getStoredGitHubConfig(options?.environment ?? 'production', options?.teamId)

  const response = await fetch(`${GITHUB_API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${stored.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok || !payload) {
    const message = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as any).message)
      : response.statusText
    throw new Error(`GitHub API request failed (${response.status}): ${message}`)
  }

  return payload as T
}

function getRepositoryTimestamp(repository: GitHubRepositorySummary) {
  return Math.max(
    repository.pushedAt ? new Date(repository.pushedAt).getTime() : 0,
    repository.updatedAt ? new Date(repository.updatedAt).getTime() : 0,
  )
}

export function normalizeGitHubRepoReference(value: unknown): string[] {
  if (typeof value !== 'string') return []

  const trimmed = value.trim()
  if (!trimmed) return []

  const refs = new Set<string>()

  const addRef = (raw: string) => {
    const normalized = raw
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\/github\.com\//, '')
      .replace(/^git@github\.com:/, '')
      .replace(/^github\.com\//, '')
      .replace(/\.git$/, '')
      .replace(/^[/:]+/, '')
      .replace(/[?#].*$/, '')

    if (!normalized) return

    refs.add(normalized)

    const segments = normalized.split('/').filter(Boolean)
    if (segments.length >= 2) {
      refs.add(`${segments[segments.length - 2]}/${segments[segments.length - 1]}`)
    }
    if (segments.length > 0) {
      refs.add(segments[segments.length - 1])
    }
  }

  const githubMatch = trimmed.match(/github\.com[:/]+([^\s?#]+)/i)
  if (githubMatch?.[1]) {
    addRef(githubMatch[1])
  }

  addRef(trimmed)

  return Array.from(refs)
}

export function extractGitHubRepoReferences(input: { label?: string | null; config?: unknown } | unknown): string[] {
  const refs = new Set<string>()
  const source = typeof input === 'object' && input !== null && ('config' in input || 'label' in input)
    ? input as { label?: string | null; config?: unknown }
    : { config: input }

  const append = (value: unknown) => {
    for (const ref of normalizeGitHubRepoReference(value)) {
      refs.add(ref)
    }
  }

  append(source.label)

  if (source.config && typeof source.config === 'object') {
    const config = source.config as Record<string, unknown>
    const keys = ['repo', 'repository', 'repositoryUrl', 'repoUrl', 'sourceRepository', 'fullName', 'full_name', 'name']

    for (const key of keys) {
      append(config[key])
    }

    if (Array.isArray(config.repositories)) {
      for (const value of config.repositories) {
        append(value)
      }
    }
  }

  return Array.from(refs)
}

export async function getGitHubCurrentUser(
  environment: GitHubEnvironment = 'production',
  teamId?: string,
) {
  const payload = await githubRequest<any>('/user', { environment, teamId })
  return {
    login: String(payload.login || 'github'),
    name: payload.name ?? null,
    avatarUrl: payload.avatar_url ?? null,
  }
}

export async function listGitHubRepositories(input?: {
  limit?: number
  environment?: GitHubEnvironment
  teamId?: string
}): Promise<GitHubRepositorySummary[]> {
  const limit = Math.min(Math.max(input?.limit ?? 100, 1), 100)
  const params = new URLSearchParams({
    per_page: String(limit),
    sort: 'updated',
    direction: 'desc',
    affiliation: 'owner,collaborator,organization_member',
  })

  const payload = await githubRequest<Array<any>>(`/user/repos?${params.toString()}`, {
    environment: input?.environment ?? 'production',
    teamId: input?.teamId,
  })

  return payload
    .map((repository) => ({
      id: String(repository.id),
      name: String(repository.name || repository.full_name || repository.id),
      fullName: String(repository.full_name || repository.name || repository.id),
      owner: String(repository.owner?.login || 'github'),
      description: repository.description ?? null,
      htmlUrl: String(repository.html_url || '#'),
      visibility: repository.private ? 'private' : 'public',
      isPrivate: Boolean(repository.private),
      archived: Boolean(repository.archived),
      defaultBranch: repository.default_branch ?? null,
      pushedAt: repository.pushed_at ?? null,
      updatedAt: repository.updated_at ?? null,
      language: repository.language ?? null,
    }))
    .sort((a, b) => getRepositoryTimestamp(b) - getRepositoryTimestamp(a))
}

export async function listRecentGitHubActivity(input?: {
  limit?: number
  environment?: GitHubEnvironment
  teamId?: string
}): Promise<GitHubRecentActivity[]> {
  const repositories = await listGitHubRepositories({
    limit: Math.min(Math.max((input?.limit ?? 8) * 3, 12), 100),
    environment: input?.environment,
    teamId: input?.teamId,
  })

  return repositories
    .map((repository) => {
      const pushedTime = repository.pushedAt ? new Date(repository.pushedAt).getTime() : 0
      const updatedTime = repository.updatedAt ? new Date(repository.updatedAt).getTime() : 0
      const timestamp = Math.max(pushedTime, updatedTime)

      return {
        id: repository.id,
        repoName: repository.name,
        fullName: repository.fullName,
        owner: repository.owner,
        branch: repository.defaultBranch ?? null,
        url: repository.htmlUrl,
        timestamp,
        state: pushedTime >= updatedTime ? 'PUSHED' as const : 'UPDATED' as const,
        visibility: repository.visibility,
      }
    })
    .filter((activity) => activity.timestamp > 0)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, input?.limit ?? 8)
}

/**
 * GitHub API connector — Personal Access Token scope.
 * All functions are pure (no side-effects on DB).
 */

const GITHUB_API = "https://api.github.com"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  clone_url: string
  ssh_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  default_branch: string
  visibility: "public" | "private" | "internal"
  pushed_at: string | null
  updated_at: string
  created_at: string
  topics: string[]
  archived: boolean
  owner: {
    login: string
    avatar_url: string
    type: "User" | "Organization"
  }
}

export interface GitHubOrg {
  login: string
  avatar_url: string
  description: string | null
}

export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  public_repos: number
  total_private_repos?: number
}

// ---------------------------------------------------------------------------
// Internal fetch helper
// ---------------------------------------------------------------------------

async function githubFetch(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<Response> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(
      `GitHub API ${options.method ?? "GET"} ${path} → ${res.status}: ${body}`,
    )
  }

  return res
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the authenticated user's profile.
 */
export async function getGitHubUser(token: string): Promise<GitHubUser> {
  const res = await githubFetch("/user", token)
  return res.json()
}

/**
 * List all organizations for the authenticated user.
 */
export async function listGitHubOrgs(token: string): Promise<GitHubOrg[]> {
  const res = await githubFetch("/user/orgs?per_page=100", token)
  return res.json()
}

/**
 * Paginate a GitHub list endpoint. Returns all items up to `maxItems`.
 */
async function paginateGitHub<T>(
  baseUrl: string,
  token: string,
  maxItems = 1000,
): Promise<T[]> {
  const items: T[] = []
  let page = 1

  while (items.length < maxItems) {
    const sep = baseUrl.includes("?") ? "&" : "?"
    const res = await githubFetch(`${baseUrl}${sep}per_page=100&page=${page}`, token)
    const batch: T[] = await res.json()
    if (!Array.isArray(batch) || batch.length === 0) break
    items.push(...batch)
    if (batch.length < 100) break
    page++
  }

  return items
}

/**
 * List all repositories accessible to the authenticated user.
 * Combines personal repos + all org repos to guarantee full coverage
 * regardless of PAT scope (read:org vs repo).
 */
export async function listAllRepos(token: string): Promise<GitHubRepo[]> {
  // Fetch personal repos + orgs list in parallel
  const [personalRepos, orgs] = await Promise.all([
    paginateGitHub<GitHubRepo>("/user/repos?sort=pushed&visibility=all", token),
    listGitHubOrgs(token).catch(() => [] as GitHubOrg[]),
  ])

  // Fetch all org repos in parallel (one request stream per org)
  const orgRepoArrays = await Promise.allSettled(
    orgs.map((org) =>
      paginateGitHub<GitHubRepo>(
        `/orgs/${encodeURIComponent(org.login)}/repos?sort=pushed&type=all`,
        token,
      ),
    ),
  )

  const orgRepos = orgRepoArrays
    .filter((r): r is PromiseFulfilledResult<GitHubRepo[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)

  // Merge and deduplicate by repo id
  const seen = new Set<number>()
  const all: GitHubRepo[] = []
  for (const repo of [...personalRepos, ...orgRepos]) {
    if (!seen.has(repo.id)) {
      seen.add(repo.id)
      all.push(repo)
    }
  }

  // Sort by last push desc
  return all.sort((a, b) => {
    const ta = a.pushed_at ? new Date(a.pushed_at).getTime() : 0
    const tb = b.pushed_at ? new Date(b.pushed_at).getTime() : 0
    return tb - ta
  })
}

/**
 * List repos for a specific organization.
 */
export async function listOrgRepos(
  org: string,
  token: string,
): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = []
  let page = 1

  while (repos.length < 500) {
    const res = await githubFetch(
      `/orgs/${encodeURIComponent(org)}/repos?per_page=100&page=${page}&sort=pushed`,
      token,
    )
    const batch: GitHubRepo[] = await res.json()
    if (batch.length === 0) break
    repos.push(...batch)
    if (batch.length < 100) break
    page++
  }

  return repos
}

/**
 * Get a single repository by owner/name.
 */
export async function getRepo(
  owner: string,
  repo: string,
  token: string,
): Promise<GitHubRepo> {
  const res = await githubFetch(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
    token,
  )
  return res.json()
}

/**
 * Retrieve the GitHub PAT from serviceApiConfigs (encrypted) or env.
 * Returns null if not configured.
 */
export async function resolveGitHubToken(): Promise<string | null> {
  try {
    const { serviceApiRepository } = await import("@/lib/services")
    const config = await serviceApiRepository.getConfig("github_token", "production")
    if (config?.config?.personalAccessToken) {
      return config.config.personalAccessToken as string
    }
  } catch {
    // fall through to env fallback
  }
  return process.env.GITHUB_TOKEN ?? null
}

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
 * List all repositories accessible to the authenticated user (personal + org).
 * Paginates automatically up to 500 repos.
 */
export async function listAllRepos(token: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = []
  let page = 1

  while (repos.length < 500) {
    const res = await githubFetch(
      `/user/repos?per_page=100&page=${page}&sort=pushed&affiliation=owner,collaborator,organization_member`,
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

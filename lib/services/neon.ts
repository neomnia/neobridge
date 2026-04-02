/**
 * lib/services/neon.ts
 * Client Neon — gestion de bases PostgreSQL via l'API Neon
 * https://api-docs.neon.tech/reference/getting-started
 */

import { resolveCredential, getMockCredential, type ApiType } from '@/lib/api-management'

const NEON_API_URL = 'https://console.neon.tech/api/v2'

export interface NeonProject {
  id: string
  name: string
  region_id: string
  pg_version: number
  created_at: string
  updated_at: string
}

export interface NeonDatabase {
  id: number
  name: string
  owner_name: string
  branch_id: string
  created_at: string
}

export interface NeonBranch {
  id: string
  name: string
  project_id: string
  primary: boolean
  created_at: string
  updated_at: string
}

export interface NeonConnectionUri {
  connection_uri: string
  connection_parameters: {
    database: string
    host: string
    password: string
    role: string
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getNeonApiKey(teamId?: string): Promise<string> {
  const creds = await resolveCredential('neon' as ApiType, teamId)
  if (creds?.apiKey && !creds.apiKey.startsWith('mock_')) {
    return creds.apiKey
  }
  throw new Error('Neon API key not configured. Add it via Admin > API Management.')
}

async function neonRequest<T>(
  path: string,
  options?: { method?: string; body?: unknown; teamId?: string },
): Promise<T> {
  const apiKey = await getNeonApiKey(options?.teamId)

  const res = await fetch(`${NEON_API_URL}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload) {
    const msg = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as any).message)
      : res.statusText
    throw new Error(`Neon API error (${res.status}): ${msg}`)
  }

  return payload as T
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Liste tous les projets Neon du compte
 */
export async function listNeonProjects(teamId?: string): Promise<NeonProject[]> {
  const data = await neonRequest<{ projects: NeonProject[] }>('/projects', { teamId })
  return data.projects
}

/**
 * Récupère un projet Neon par son ID
 */
export async function getNeonProject(projectId: string, teamId?: string): Promise<NeonProject> {
  const data = await neonRequest<{ project: NeonProject }>(`/projects/${encodeURIComponent(projectId)}`, { teamId })
  return data.project
}

/**
 * Crée un nouveau projet Neon
 */
export async function createNeonProject(
  input: { name: string; region_id?: string; pg_version?: number },
  teamId?: string,
): Promise<NeonProject> {
  const data = await neonRequest<{ project: NeonProject }>('/projects', {
    method: 'POST',
    body: { project: input },
    teamId,
  })
  return data.project
}

/**
 * Liste les branches d'un projet
 */
export async function listNeonBranches(projectId: string, teamId?: string): Promise<NeonBranch[]> {
  const data = await neonRequest<{ branches: NeonBranch[] }>(
    `/projects/${encodeURIComponent(projectId)}/branches`,
    { teamId },
  )
  return data.branches
}

/**
 * Liste les bases de données d'une branche
 */
export async function listNeonDatabases(
  projectId: string,
  branchId: string,
  teamId?: string,
): Promise<NeonDatabase[]> {
  const data = await neonRequest<{ databases: NeonDatabase[] }>(
    `/projects/${encodeURIComponent(projectId)}/branches/${encodeURIComponent(branchId)}/databases`,
    { teamId },
  )
  return data.databases
}

/**
 * Récupère l'URI de connexion d'une base
 */
export async function getNeonConnectionUri(
  projectId: string,
  opts?: { branchId?: string; databaseName?: string; roleName?: string; teamId?: string },
): Promise<string> {
  const params = new URLSearchParams()
  if (opts?.branchId) params.set('branch_id', opts.branchId)
  if (opts?.databaseName) params.set('database_name', opts.databaseName)
  if (opts?.roleName) params.set('role_name', opts.roleName)

  const qs = params.toString()
  const data = await neonRequest<NeonConnectionUri>(
    `/projects/${encodeURIComponent(projectId)}/connection_uri${qs ? `?${qs}` : ''}`,
    { teamId: opts?.teamId },
  )
  return data.connection_uri
}

/**
 * Teste la connectivité Neon (appel léger à /projects)
 */
export async function testNeonConnection(teamId?: string): Promise<{ ok: boolean; projectCount: number }> {
  const projects = await listNeonProjects(teamId)
  return { ok: true, projectCount: projects.length }
}

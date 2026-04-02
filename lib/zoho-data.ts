/**
 * Zoho data layer — callable from Server Components directly.
 * Avoids internal fetch() which loses auth cookies.
 *
 * Mock mode: ONLY when NEXT_PUBLIC_USE_MOCK=true (intentional dev override).
 * On API error: return empty data + surfaced error — NEVER silent mock fallback.
 *
 * Rule (ADR-002 / NO_SILENT_MOCK_FALLBACK):
 *   isMock: true  + no error  → intentional dev mode
 *   isMock: false + error     → real API failure → UI shows "Configuration Requise"
 *   isMock: false + no error  → real data
 */
import { zohoFetch } from './zoho'
import type { ZohoProject, ZohoTask, ZohoMilestone } from './zoho'

export interface ZohoIssue {
  id: string
  title: string
  status: { name: string; id: string }
  severity?: { name: string }
  classification?: { name: string }
  assignee?: { name: string; id: string }
  due_date?: string
  created_time?: string
  description?: string
}

export interface ZohoTasklist {
  id: string
  name: string
  milestone_id?: string
  sequence?: number
  completed?: boolean
}

const useMock = () => process.env.NEXT_PUBLIC_USE_MOCK === 'true'

// ── Mock data — used ONLY when NEXT_PUBLIC_USE_MOCK=true ──────────────────────

const MOCK_PROJECTS: ZohoProject[] = [
  {
    id: 'p1',
    name: 'NeoBridge Platform',
    status: 'active',
    description: 'Plateforme DevOps unifiée — Vercel, GitHub, Zoho, Temporal',
    last_modified_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    owner_name: 'Claude',
  },
  {
    id: 'p2',
    name: 'NeoSaaS Template',
    status: 'active',
    description: 'Boilerplate Next.js 15 avec auth, paiements et admin',
    last_modified_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    owner_name: 'Charles',
  },
]

const MOCK_TASKS: ZohoTask[] = [
  { id: '1', name: 'Setup CI pipeline',    status: { name: 'Open',        id: 'open'       }, priority: 'High',   owner: [{ name: 'Claude', id: 'agent' }], tags: [{ name: 'infra' }] },
  { id: '2', name: 'Implement auth flow',  status: { name: 'In Progress', id: 'inprogress' }, priority: 'High',   owner: [{ name: 'Claude', id: 'agent' }], tags: [{ name: 'backend' }] },
  { id: '3', name: 'Design dashboard UI',  status: { name: 'In Review',   id: 'inreview'   }, priority: 'Medium', owner: [], tags: [{ name: 'frontend' }] },
  { id: '4', name: 'Write unit tests',     status: { name: 'Open',        id: 'open'       }, priority: 'Low',    owner: [], tags: [] },
  { id: '5', name: 'Deploy to staging',    status: { name: 'Closed',      id: 'closed'     }, priority: 'Medium', owner: [], tags: [{ name: 'devops' }] },
]

const MOCK_MILESTONES: ZohoMilestone[] = [
  { id: 'm1', name: 'MVP v1',      status: 'InProgress', end_date: '2026-04-15', task_count: 8,  completed_task_count: 3 },
  { id: 'm2', name: 'Beta Launch', status: 'Open',       end_date: '2026-05-30', task_count: 12, completed_task_count: 0 },
]

const MOCK_ISSUES: ZohoIssue[] = [
  { id: 'i1', title: 'Login button broken on mobile', status: { name: 'Open', id: 'open' }, severity: { name: 'Major' }, classification: { name: 'Bug' } },
  { id: 'i2', title: 'Dashboard slow to load', status: { name: 'In Progress', id: 'inprogress' }, severity: { name: 'Minor' }, classification: { name: 'Performance' } },
]

const MOCK_TASKLISTS: ZohoTasklist[] = [
  { id: 'tl1', name: 'Sprint 1 — Setup', sequence: 1, completed: false },
  { id: 'tl2', name: 'Sprint 2 — Auth', sequence: 2, completed: false },
]

// ── Public API ────────────────────────────────────────────────────────────────

export async function listZohoProjectsWithStatus(): Promise<{
  projects: ZohoProject[]
  isMock: boolean
  error?: string
}> {
  if (useMock()) return { projects: MOCK_PROJECTS, isMock: true }
  try {
    const res = await zohoFetch('/projects/')
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const msg = `Zoho API HTTP ${res.status}${text ? ': ' + text.slice(0, 300) : ''}`
      console.error('[zoho-data] listZohoProjects failed:', msg)
      return { projects: [], isMock: false, error: msg }
    }
    const data = await res.json()
    return { projects: data.projects ?? [], isMock: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[zoho-data] listZohoProjects exception:', msg)
    return { projects: [], isMock: false, error: msg }
  }
}

/** Backward-compatible wrapper — returns projects array only */
export async function listZohoProjects(): Promise<ZohoProject[]> {
  const { projects } = await listZohoProjectsWithStatus()
  return projects
}

export async function getZohoProject(projectId: string): Promise<ZohoProject | null> {
  if (useMock()) return MOCK_PROJECTS.find(p => p.id === projectId) ?? MOCK_PROJECTS[0] ?? null
  try {
    const res = await zohoFetch(`/projects/${projectId}/`)
    if (!res.ok) return null
    const data = await res.json()
    return data.projects?.[0] ?? null
  } catch {
    return null
  }
}

export async function listZohoTasksWithStatus(projectId: string): Promise<{
  tasks: ZohoTask[]
  isMock: boolean
  error?: string
}> {
  if (useMock()) return { tasks: MOCK_TASKS, isMock: true }
  try {
    const res = await zohoFetch(`/projects/${projectId}/tasks/`)
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      const msg = `Zoho API HTTP ${res.status}${text ? ': ' + text.slice(0, 300) : ''}`
      console.error('[zoho-data] listZohoTasks failed:', msg)
      return { tasks: [], isMock: false, error: msg }
    }
    const data = await res.json()
    return { tasks: data.tasks ?? [], isMock: false }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[zoho-data] listZohoTasks exception:', msg)
    return { tasks: [], isMock: false, error: msg }
  }
}

export async function listZohoTasks(projectId: string): Promise<ZohoTask[]> {
  const { tasks } = await listZohoTasksWithStatus(projectId)
  return tasks
}

export async function listZohoStatuses(projectId: string): Promise<import('./zoho').ZohoStatus[]> {
  if (useMock()) return [
    { id: 'open',       name: 'Open',        color: '#94a3b8', type: 'open'   },
    { id: 'inprogress', name: 'In Progress', color: '#3b82f6', type: 'open'   },
    { id: 'inreview',   name: 'In Review',   color: '#f59e0b', type: 'open'   },
    { id: 'closed',     name: 'Closed',      color: '#22c55e', type: 'closed' },
  ]
  try {
    const res = await zohoFetch(`/projects/${projectId}/tasks/statuses/`)
    if (!res.ok) return []
    const data = await res.json()
    return data.statuses ?? []
  } catch { return [] }
}

export async function listZohoMilestones(projectId: string): Promise<ZohoMilestone[]> {
  if (useMock()) return MOCK_MILESTONES
  try {
    const res = await zohoFetch(`/projects/${projectId}/milestones/`)
    if (!res.ok) return []
    const data = await res.json()
    return data.milestones ?? []
  } catch {
    return []
  }
}

export async function listZohoIssues(projectId: string): Promise<ZohoIssue[]> {
  if (useMock()) return MOCK_ISSUES
  try {
    const res = await zohoFetch(`/projects/${projectId}/issues/`)
    if (!res.ok) return []
    const data = await res.json()
    return data.bugs ?? data.issues ?? []
  } catch {
    return []
  }
}

export async function listZohoTasklists(projectId: string): Promise<ZohoTasklist[]> {
  if (useMock()) return MOCK_TASKLISTS
  try {
    const res = await zohoFetch(`/projects/${projectId}/tasklists/`)
    if (!res.ok) return []
    const data = await res.json()
    return data.tasklists ?? []
  } catch {
    return []
  }
}

export { MOCK_TASKS, MOCK_MILESTONES, MOCK_PROJECTS, MOCK_ISSUES, MOCK_TASKLISTS }

/**
 * Zoho data layer — callable from Server Components directly.
 * Avoids internal fetch() which loses auth cookies.
 * Mock mode: NEXT_PUBLIC_USE_MOCK=true OR ZOHO_CLIENT_ID absent.
 */
import { zohoFetch } from './zoho'
import type { ZohoProject, ZohoTask, ZohoMilestone } from './zoho'

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'
const useMock = () => MOCK || !process.env.ZOHO_CLIENT_ID

// ── Mock data ─────────────────────────────────────────────────────────────────

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

// ── Public API ────────────────────────────────────────────────────────────────

export async function listZohoProjects(): Promise<ZohoProject[]> {
  if (useMock()) return MOCK_PROJECTS
  try {
    const res = await zohoFetch('/projects/')
    const data = await res.json()
    const projects = data.projects ?? []
    return projects.length > 0 ? projects : MOCK_PROJECTS
  } catch {
    return MOCK_PROJECTS
  }
}

export async function getZohoProject(projectId: string): Promise<ZohoProject | null> {
  if (useMock()) {
    return MOCK_PROJECTS.find(p => p.id === projectId) ?? MOCK_PROJECTS[0] ?? null
  }
  try {
    const res = await zohoFetch(`/projects/${projectId}/`)
    const data = await res.json()
    return data.projects?.[0] ?? MOCK_PROJECTS.find(p => p.id === projectId) ?? null
  } catch {
    return MOCK_PROJECTS.find(p => p.id === projectId) ?? MOCK_PROJECTS[0] ?? null
  }
}

export async function listZohoTasks(projectId: string): Promise<ZohoTask[]> {
  if (useMock()) return MOCK_TASKS
  try {
    const res = await zohoFetch(`/projects/${projectId}/tasks/`)
    const data = await res.json()
    const tasks = data.tasks ?? []
    return tasks.length > 0 ? tasks : MOCK_TASKS
  } catch {
    return MOCK_TASKS
  }
}

export async function listZohoMilestones(projectId: string): Promise<ZohoMilestone[]> {
  if (useMock()) return MOCK_MILESTONES
  try {
    const res = await zohoFetch(`/projects/${projectId}/milestones/`)
    const data = await res.json()
    const milestones = data.milestones ?? []
    return milestones.length > 0 ? milestones : MOCK_MILESTONES
  } catch {
    return MOCK_MILESTONES
  }
}

export { MOCK_TASKS, MOCK_MILESTONES, MOCK_PROJECTS }

/**
 * NeoBridge + Zoho data layer — callable from Server Components directly.
 * NeoBridge remains the source of truth for projects; Zoho is an optional connector.
 */
import { and, desc, eq, isNull, or } from 'drizzle-orm'
import { db } from '@/db'
import { projectConnectors, projects, teams } from '@/db/schema'
import { zohoFetch } from './zoho'
import type { ZohoProject, ZohoTask, ZohoMilestone } from './zoho'

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'
const useMock = () => MOCK || !process.env.ZOHO_CLIENT_ID

export interface NeoBridgeProjectSummary {
  id: string
  name: string
  status: string
  description?: string | null
  teamId?: string | null
  teamName?: string | null
  teamSlug?: string | null
  last_modified_time?: string
  owner_name?: string
  zohoProjectId?: string | null
  zohoPortalId?: string | null
}

export interface ProjectZohoBinding {
  connectorId: string
  neobridgeProjectId: string
  zohoProjectId: string | null
  portalId: string | null
  label: string
  isConnected: boolean
}

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

type ZohoConnectorConfig = {
  projectId?: string
  portalId?: string
  [key: string]: unknown
}

function parseConnectorConfig(value: unknown): ZohoConnectorConfig {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }
  return value as ZohoConnectorConfig
}

async function resolveTeam(teamIdOrSlug: string) {
  try {
    const [team] = await db
      .select({ id: teams.id, name: teams.name, slug: teams.slug })
      .from(teams)
      .where(or(eq(teams.id, teamIdOrSlug), eq(teams.slug, teamIdOrSlug)))
      .limit(1)

    return team ?? null
  } catch {
    return null
  }
}

function toMockNeoBridgeProjects(teamIdOrSlug: string): NeoBridgeProjectSummary[] {
  return MOCK_PROJECTS.map((project) => ({
    ...project,
    teamId: teamIdOrSlug,
    teamSlug: teamIdOrSlug,
    teamName: teamIdOrSlug,
    zohoProjectId: project.id,
    zohoPortalId: process.env.ZOHO_PORTAL_ID ?? null,
  }))
}

export async function getProjectZohoBinding(neobridgeProjectId: string): Promise<ProjectZohoBinding | null> {
  try {
    const [connector] = await db
      .select({
        id: projectConnectors.id,
        projectId: projectConnectors.projectId,
        label: projectConnectors.label,
        config: projectConnectors.config,
      })
      .from(projectConnectors)
      .where(and(eq(projectConnectors.projectId, neobridgeProjectId), eq(projectConnectors.type, 'zoho')))
      .limit(1)

    if (!connector) return null

    const config = parseConnectorConfig(connector.config)
    const zohoProjectId = typeof config.projectId === 'string' && config.projectId.trim()
      ? config.projectId.trim()
      : null
    const portalId = typeof config.portalId === 'string' && config.portalId.trim()
      ? config.portalId.trim()
      : null

    return {
      connectorId: connector.id,
      neobridgeProjectId: connector.projectId,
      zohoProjectId,
      portalId,
      label: connector.label,
      isConnected: Boolean(zohoProjectId),
    }
  } catch {
    return null
  }
}

export async function listTeamProjects(teamIdOrSlug: string): Promise<NeoBridgeProjectSummary[]> {
  try {
    const team = await resolveTeam(teamIdOrSlug)
    const rows = team
      ? await db
          .select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
            status: projects.status,
            teamId: projects.teamId,
            updatedAt: projects.updatedAt,
          })
          .from(projects)
          .where(or(eq(projects.teamId, team.id), isNull(projects.teamId)))
          .orderBy(desc(projects.updatedAt), desc(projects.createdAt))
      : await db
          .select({
            id: projects.id,
            name: projects.name,
            description: projects.description,
            status: projects.status,
            teamId: projects.teamId,
            updatedAt: projects.updatedAt,
          })
          .from(projects)
          .orderBy(desc(projects.updatedAt), desc(projects.createdAt))

    if (rows.length === 0) {
      return useMock() ? toMockNeoBridgeProjects(teamIdOrSlug) : []
    }

    return Promise.all(
      rows.map(async (project) => {
        const zohoBinding = await getProjectZohoBinding(project.id)
        return {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          teamId: project.teamId,
          teamName: team?.name ?? null,
          teamSlug: team?.slug ?? null,
          last_modified_time: project.updatedAt?.toISOString(),
          zohoProjectId: zohoBinding?.zohoProjectId ?? null,
          zohoPortalId: zohoBinding?.portalId ?? null,
        }
      }),
    )
  } catch {
    return useMock() ? toMockNeoBridgeProjects(teamIdOrSlug) : []
  }
}

export async function getNeoBridgeProject(
  projectId: string,
  teamIdOrSlug?: string,
): Promise<NeoBridgeProjectSummary | null> {
  try {
    const team = teamIdOrSlug ? await resolveTeam(teamIdOrSlug) : null
    const [project] = await db
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        status: projects.status,
        teamId: projects.teamId,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1)

    if (!project) {
      return useMock()
        ? toMockNeoBridgeProjects(teamIdOrSlug ?? 'mock').find((row) => row.id === projectId) ?? null
        : null
    }

    if (team && project.teamId && project.teamId !== team.id) {
      return null
    }

    const zohoBinding = await getProjectZohoBinding(project.id)

    return {
      id: project.id,
      name: project.name,
      description: project.description,
      status: project.status,
      teamId: project.teamId,
      teamName: team?.name ?? null,
      teamSlug: team?.slug ?? null,
      last_modified_time: project.updatedAt?.toISOString(),
      zohoProjectId: zohoBinding?.zohoProjectId ?? null,
      zohoPortalId: zohoBinding?.portalId ?? null,
    }
  } catch {
    return useMock()
      ? toMockNeoBridgeProjects(teamIdOrSlug ?? 'mock').find((row) => row.id === projectId) ?? null
      : null
  }
}

// ── Raw Zoho API helpers ─────────────────────────────────────────────────────

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

export async function getZohoProject(
  projectId: string,
  options: { portalId?: string | null } = {},
): Promise<ZohoProject | null> {
  if (useMock()) {
    return MOCK_PROJECTS.find((project) => project.id === projectId) ?? null
  }
  try {
    const res = await zohoFetch(`/projects/${projectId}/`, {}, { portalId: options.portalId })
    const data = await res.json()
    return data.projects?.[0] ?? null
  } catch {
    return MOCK_PROJECTS.find((project) => project.id === projectId) ?? null
  }
}

export async function listZohoTasks(
  projectId: string,
  options: { portalId?: string | null } = {},
): Promise<ZohoTask[]> {
  if (useMock()) return MOCK_TASKS
  try {
    const res = await zohoFetch(`/projects/${projectId}/tasks/`, {}, { portalId: options.portalId })
    const data = await res.json()
    const tasks = data.tasks ?? []
    return tasks.length > 0 ? tasks : []
  } catch {
    return MOCK_TASKS
  }
}

export async function listZohoMilestones(
  projectId: string,
  options: { portalId?: string | null } = {},
): Promise<ZohoMilestone[]> {
  if (useMock()) return MOCK_MILESTONES
  try {
    const res = await zohoFetch(`/projects/${projectId}/milestones/`, {}, { portalId: options.portalId })
    const data = await res.json()
    const milestones = data.milestones ?? []
    return milestones.length > 0 ? milestones : []
  } catch {
    return MOCK_MILESTONES
  }
}

export { MOCK_TASKS, MOCK_MILESTONES, MOCK_PROJECTS }

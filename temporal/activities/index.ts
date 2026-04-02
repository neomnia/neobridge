import { MongoClient } from 'mongodb'
import { buildLangChainPlan, type AgentPlanInput } from '@/lib/agents/langchain'
import { listZohoTasks, listZohoMilestones, getProjectZohoBinding } from '@/lib/zoho-data'
import { sendAdminNotification } from '@/lib/notifications/admin-notifications'
import type { ZohoTask, ZohoMilestone } from '@/lib/zoho'

// ── Service health notification ──────────────────────────────────────────────

type ServiceName = 'zoho' | 'github' | 'anthropic' | 'mistral' | 'temporal' | 'mongodb' | 'railway' | 'notion'

async function notifyServiceFailure(
  service: ServiceName,
  workflow: string,
  projectId: string,
  error: unknown,
) {
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[temporal-activity] ${service} failure in ${workflow}:`, message)

  try {
    await sendAdminNotification({
      subject: `Service ${service} indisponible — ${workflow}`,
      message: [
        `⚠️ Le service **${service}** a échoué pendant l'exécution du workflow \`${workflow}\`.`,
        '',
        `**Projet :** ${projectId}`,
        `**Erreur :** ${message}`,
        '',
        'Le workflow continue en mode dégradé. Les données de ce service seront vides ou approximées.',
        '',
        `Vérifiez la configuration du service dans [API Management](/admin/api).`,
      ].join('\n'),
      type: 'system',
      mode: 'interactive',
      priority: 'high',
      metadata: {
        notificationType: 'service_failure',
        service,
        workflow,
        projectId,
        error: message,
        occurredAt: new Date().toISOString(),
      },
    })
  } catch (notifError) {
    console.error('[temporal-activity] Failed to send service failure notification:', notifError)
  }
}

// ── Prepare Execution Brief ──────────────────────────────────────────────────

export async function prepareExecutionBrief(input: AgentPlanInput) {
  try {
    return await buildLangChainPlan(input)
  } catch (error) {
    const provider = 'fallback' as const
    await notifyServiceFailure(
      'anthropic',
      input.workflow ?? 'agentSessionWorkflow',
      input.projectId,
      error,
    )
    return {
      provider,
      model: 'deterministic-brief',
      summary: `Execution brief generation failed (LLM unavailable). Project: ${input.projectId}, Mode: ${input.mode}. Manual review recommended.`,
      storedToMongo: false,
      railwayContext: null,
    }
  }
}

// ── Zoho Backlog — real integration ──────────────────────────────────────────

export interface ZohoBacklogResult {
  ok: boolean
  projectId: string
  zohoProjectId: string | null
  tasks: ZohoTask[]
  milestones: ZohoMilestone[]
  openTasks: number
  inProgressTasks: number
  closedTasks: number
}

export async function readZohoBacklog(projectId: string, teamId?: string): Promise<ZohoBacklogResult> {
  try {
    const binding = await getProjectZohoBinding(projectId)

    if (!binding?.zohoProjectId) {
      return {
        ok: false,
        projectId,
        zohoProjectId: null,
        tasks: [],
        milestones: [],
        openTasks: 0,
        inProgressTasks: 0,
        closedTasks: 0,
      }
    }

    const portalOpts = { portalId: binding.portalId }
    const [tasks, milestones] = await Promise.all([
      listZohoTasks(binding.zohoProjectId, portalOpts),
      listZohoMilestones(binding.zohoProjectId, portalOpts),
    ])

    return {
      ok: true,
      projectId,
      zohoProjectId: binding.zohoProjectId,
      tasks,
      milestones,
      openTasks: tasks.filter((t) => t.status.name.toLowerCase() === 'open').length,
      inProgressTasks: tasks.filter((t) => t.status.name.toLowerCase() === 'in progress').length,
      closedTasks: tasks.filter((t) => t.status.name.toLowerCase() === 'closed').length,
    }
  } catch (error) {
    await notifyServiceFailure('zoho', 'readZohoBacklog', projectId, error)
    return {
      ok: false,
      projectId,
      zohoProjectId: null,
      tasks: [],
      milestones: [],
      openTasks: 0,
      inProgressTasks: 0,
      closedTasks: 0,
    }
  }
}

export async function syncZohoContext(projectId: string, taskId?: string) {
  try {
    const backlog = await readZohoBacklog(projectId)

    if (!backlog.ok) {
      return {
        ok: false,
        projectId,
        taskId: taskId ?? null,
        source: 'zoho',
        note: 'Zoho binding not configured for this project.',
      }
    }

    const targetTask = taskId
      ? backlog.tasks.find((t) => t.id === taskId) ?? null
      : null

    return {
      ok: true,
      projectId,
      taskId: taskId ?? null,
      source: 'zoho',
      zohoProjectId: backlog.zohoProjectId,
      totalTasks: backlog.tasks.length,
      openTasks: backlog.openTasks,
      inProgressTasks: backlog.inProgressTasks,
      closedTasks: backlog.closedTasks,
      milestonesCount: backlog.milestones.length,
      targetTask: targetTask
        ? { id: targetTask.id, name: targetTask.name, status: targetTask.status.name, priority: targetTask.priority }
        : null,
    }
  } catch (error) {
    await notifyServiceFailure('zoho', 'syncZohoContext', projectId, error)
    return {
      ok: false,
      projectId,
      taskId: taskId ?? null,
      source: 'zoho',
      note: 'Zoho synchronization failed — workflow continues in degraded mode.',
    }
  }
}

// ── Report Compilation ───────────────────────────────────────────────────────

export interface CompileReportInput {
  projectId: string
  teamId?: string
  tasks: ZohoTask[]
  milestones: ZohoMilestone[]
}

export interface CompiledReport {
  generatedAt: string
  projectId: string
  teamId: string | null
  summary: {
    totalTasks: number
    openTasks: number
    inProgressTasks: number
    closedTasks: number
    completionRate: number
  }
  milestones: Array<{
    id: string
    name: string
    status: string
    progress: number
    endDate: string | null
  }>
  tasksByPriority: Record<string, number>
  recentlyUpdated: Array<{
    id: string
    name: string
    status: string
    priority: string
    lastUpdated: string | null
  }>
}

export async function compileReport(input: CompileReportInput): Promise<CompiledReport> {
  const { tasks, milestones } = input

  try {
    const open = tasks.filter((t) => t.status.name.toLowerCase() === 'open').length
    const inProgress = tasks.filter((t) => t.status.name.toLowerCase() === 'in progress').length
    const closed = tasks.filter((t) => t.status.name.toLowerCase() === 'closed').length
    const total = tasks.length

    const priorityCounts: Record<string, number> = {}
    for (const task of tasks) {
      const p = task.priority || 'None'
      priorityCounts[p] = (priorityCounts[p] ?? 0) + 1
    }

    const recentlyUpdated = [...tasks]
      .sort((a, b) => {
        const ta = a.last_updated_time ? new Date(a.last_updated_time).getTime() : 0
        const tb = b.last_updated_time ? new Date(b.last_updated_time).getTime() : 0
        return tb - ta
      })
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        name: t.name,
        status: t.status.name,
        priority: t.priority,
        lastUpdated: t.last_updated_time ?? null,
      }))

    return {
      generatedAt: new Date().toISOString(),
      projectId: input.projectId,
      teamId: input.teamId ?? null,
      summary: {
        totalTasks: total,
        openTasks: open,
        inProgressTasks: inProgress,
        closedTasks: closed,
        completionRate: total > 0 ? Math.round((closed / total) * 100) : 0,
      },
      milestones: milestones.map((m) => ({
        id: m.id,
        name: m.name,
        status: m.status,
        progress: m.task_count && m.task_count > 0
          ? Math.round(((m.completed_task_count ?? 0) / m.task_count) * 100)
          : 0,
        endDate: m.end_date ?? null,
      })),
      tasksByPriority: priorityCounts,
      recentlyUpdated,
    }
  } catch (error) {
    await notifyServiceFailure('zoho', 'compileReport', input.projectId, error)
    return {
      generatedAt: new Date().toISOString(),
      projectId: input.projectId,
      teamId: input.teamId ?? null,
      summary: { totalTasks: 0, openTasks: 0, inProgressTasks: 0, closedTasks: 0, completionRate: 0 },
      milestones: [],
      tasksByPriority: {},
      recentlyUpdated: [],
    }
  }
}

// ── MongoDB Persistence ──────────────────────────────────────────────────────

export async function persistExecutionTrace(payload: Record<string, unknown>) {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    return { stored: false, reason: 'MONGODB_URI not configured' }
  }

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const dbName = process.env.MONGODB_DATABASE || 'neobridge'
    await client.db(dbName).collection('workflow_events').insertOne({
      ...payload,
      createdAt: new Date(),
    })
    return { stored: true }
  } catch (error) {
    const projectId = typeof payload.projectId === 'string' ? payload.projectId : 'unknown'
    const workflow = typeof payload.workflow === 'string' ? payload.workflow : 'unknown'
    await notifyServiceFailure('mongodb', workflow, projectId, error)
    return { stored: false, reason: error instanceof Error ? error.message : 'MongoDB write failed' }
  } finally {
    await client.close().catch(() => undefined)
  }
}

// ── Repository Autofix ───────────────────────────────────────────────────────

export async function runRepositoryAutofix(input: {
  projectId: string
  taskId?: string
  workflowId?: string
}) {
  try {
    // Placeholder — will integrate GitHub Actions CI logs in future iteration
    return {
      ok: true,
      ...input,
      note: 'Repository autofix placeholder executed. Connect GitHub and CI next.',
    }
  } catch (error) {
    await notifyServiceFailure('github', 'ciAutoFixWorkflow', input.projectId, error)
    return {
      ok: false,
      ...input,
      note: 'Repository autofix failed — GitHub service unavailable.',
    }
  }
}

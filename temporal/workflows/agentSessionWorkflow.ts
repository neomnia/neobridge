import { log, proxyActivities } from '@temporalio/workflow'
import type * as activities from '../activities'

export interface AgentSessionWorkflowInput {
  workflow?: 'agentSessionWorkflow'
  mode?: 'single' | 'auto'
  projectId: string
  teamId?: string
  taskId?: string
  taskIds?: string[]
  prompt?: string
  metadata?: Record<string, unknown>
}

const { prepareExecutionBrief, syncZohoContext, persistExecutionTrace } = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: { maximumAttempts: 2 },
})

export async function agentSessionWorkflow(input: AgentSessionWorkflowInput) {
  log.info('agentSessionWorkflow started', { projectId: input.projectId, taskId: input.taskId })

  const degraded: string[] = []

  // 1. Sync Zoho context — non-blocking
  const zoho = await syncZohoContext(input.projectId, input.taskId)
  if (!zoho.ok) {
    degraded.push('zoho')
    log.warn('Zoho sync returned degraded result — continuing without Zoho context')
  }

  // 2. Prepare brief via LangChain — non-blocking
  const brief = await prepareExecutionBrief({
    workflow: 'agentSessionWorkflow',
    mode: input.mode ?? 'single',
    projectId: input.projectId,
    teamId: input.teamId,
    taskId: input.taskId,
    taskIds: input.taskIds,
    prompt: input.prompt,
  })
  if (brief.provider === 'fallback') {
    degraded.push('llm')
    log.warn('LLM unavailable — using fallback brief')
  }

  // 3. Persist trace — non-blocking
  const trace = await persistExecutionTrace({
    workflow: 'agentSessionWorkflow',
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    summary: brief.summary,
    provider: brief.provider,
    metadata: input.metadata ?? {},
    zoho,
    degradedServices: degraded,
  })
  if (!trace.stored) {
    degraded.push('mongodb')
    log.warn('Trace persistence failed — result not stored')
  }

  return {
    status: degraded.length > 0 ? 'COMPLETED_DEGRADED' : 'COMPLETED',
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    summary: brief.summary,
    provider: brief.provider,
    model: brief.model,
    degradedServices: degraded.length > 0 ? degraded : undefined,
  }
}

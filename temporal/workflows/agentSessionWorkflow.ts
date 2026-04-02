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

  const zoho = await syncZohoContext(input.projectId, input.taskId)
  const brief = await prepareExecutionBrief({
    workflow: 'agentSessionWorkflow',
    mode: input.mode ?? 'single',
    projectId: input.projectId,
    teamId: input.teamId,
    taskId: input.taskId,
    taskIds: input.taskIds,
    prompt: input.prompt,
  })

  await persistExecutionTrace({
    workflow: 'agentSessionWorkflow',
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    summary: brief.summary,
    provider: brief.provider,
    metadata: input.metadata ?? {},
    zoho,
  })

  return {
    status: 'COMPLETED',
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    summary: brief.summary,
    provider: brief.provider,
    model: brief.model,
  }
}

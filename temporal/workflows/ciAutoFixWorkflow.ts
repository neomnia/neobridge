import { log, proxyActivities } from '@temporalio/workflow'
import type * as activities from '../activities'

export interface CIAutoFixWorkflowInput {
  workflow?: 'ciAutoFixWorkflow'
  projectId: string
  taskId?: string
  prompt?: string
}

const { prepareExecutionBrief, runRepositoryAutofix, persistExecutionTrace } = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: { maximumAttempts: 2 },
})

export async function ciAutoFixWorkflow(input: CIAutoFixWorkflowInput) {
  log.info('ciAutoFixWorkflow started', { projectId: input.projectId, taskId: input.taskId })

  const degraded: string[] = []

  const brief = await prepareExecutionBrief({
    workflow: 'ciAutoFixWorkflow',
    mode: 'auto',
    projectId: input.projectId,
    taskId: input.taskId,
    prompt: input.prompt,
  })
  if (brief.provider === 'fallback') {
    degraded.push('llm')
    log.warn('LLM unavailable — using fallback brief for CI autofix')
  }

  const autofix = await runRepositoryAutofix({
    projectId: input.projectId,
    taskId: input.taskId,
  })
  if (!autofix.ok) {
    degraded.push('github')
    log.warn('Repository autofix failed — skipping')
  }

  const trace = await persistExecutionTrace({
    workflow: 'ciAutoFixWorkflow',
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    summary: brief.summary,
    autofix,
    degradedServices: degraded,
  })
  if (!trace.stored) {
    degraded.push('mongodb')
  }

  return {
    status: degraded.length > 0 ? 'COMPLETED_DEGRADED' : 'COMPLETED',
    summary: brief.summary,
    autofix,
    degradedServices: degraded.length > 0 ? degraded : undefined,
  }
}

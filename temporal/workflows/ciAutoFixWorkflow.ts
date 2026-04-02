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

  const brief = await prepareExecutionBrief({
    workflow: 'ciAutoFixWorkflow',
    mode: 'auto',
    projectId: input.projectId,
    taskId: input.taskId,
    prompt: input.prompt,
  })

  const autofix = await runRepositoryAutofix({
    projectId: input.projectId,
    taskId: input.taskId,
  })

  await persistExecutionTrace({
    workflow: 'ciAutoFixWorkflow',
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    summary: brief.summary,
    autofix,
  })

  return {
    status: 'COMPLETED',
    summary: brief.summary,
    autofix,
  }
}

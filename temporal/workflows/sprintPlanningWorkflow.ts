import { executeChild, log } from '@temporalio/workflow'
import { agentSessionWorkflow, type AgentSessionWorkflowInput } from './agentSessionWorkflow'

export interface SprintPlanningWorkflowInput {
  workflow?: 'sprintPlanningWorkflow'
  mode?: 'sprint'
  projectId: string
  teamId?: string
  taskIds: string[]
  prompt?: string
}

export async function sprintPlanningWorkflow(input: SprintPlanningWorkflowInput) {
  log.info('sprintPlanningWorkflow started', { projectId: input.projectId, totalTasks: input.taskIds.length })

  const results = [] as Array<{
    taskId: string
    status: string
    result?: Awaited<ReturnType<typeof agentSessionWorkflow>>
    error?: string
  }>

  for (const taskId of input.taskIds) {
    const childInput: AgentSessionWorkflowInput = {
      workflow: 'agentSessionWorkflow',
      mode: 'single',
      projectId: input.projectId,
      teamId: input.teamId,
      taskId,
      prompt: input.prompt,
      metadata: { parentWorkflow: 'sprintPlanningWorkflow' },
    }

    try {
      const result = await executeChild(agentSessionWorkflow, {
        args: [childInput],
        workflowId: `agent-${input.projectId}-${taskId}`,
      })

      results.push({ taskId, status: result.status, result })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.warn(`Child workflow failed for task ${taskId}: ${message}`)
      results.push({ taskId, status: 'FAILED', error: message })
    }
  }

  const succeeded = results.filter((r) => r.status !== 'FAILED').length
  const failed = results.filter((r) => r.status === 'FAILED').length

  return {
    status: failed > 0 ? (succeeded > 0 ? 'COMPLETED_DEGRADED' : 'FAILED') : 'COMPLETED',
    projectId: input.projectId,
    plannedTasks: input.taskIds.length,
    succeeded,
    failed,
    results,
  }
}

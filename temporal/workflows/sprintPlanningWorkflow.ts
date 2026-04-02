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

  const results = [] as Array<Awaited<ReturnType<typeof agentSessionWorkflow>>>

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

    const result = await executeChild(agentSessionWorkflow, {
      args: [childInput],
      workflowId: `agent-${input.projectId}-${taskId}`,
    })

    results.push(result)
  }

  return {
    status: 'COMPLETED',
    projectId: input.projectId,
    plannedTasks: input.taskIds.length,
    results,
  }
}

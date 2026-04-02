import { log, proxyActivities } from '@temporalio/workflow'
import type * as activities from '../activities'

export interface ReportingWorkflowInput {
  workflow?: 'reportingWorkflow'
  projectId: string
  teamId?: string
  metadata?: Record<string, unknown>
}

const { readZohoBacklog, compileReport, persistExecutionTrace } = proxyActivities<typeof activities>({
  startToCloseTimeout: '5 minutes',
  retry: { maximumAttempts: 3, initialInterval: '5s', backoffCoefficient: 2 },
})

export async function reportingWorkflow(input: ReportingWorkflowInput) {
  log.info('reportingWorkflow started', { projectId: input.projectId, teamId: input.teamId })

  const degraded: string[] = []

  // 1. Read Zoho backlog for the project
  const backlog = await readZohoBacklog(input.projectId, input.teamId)
  if (!backlog.ok) {
    degraded.push('zoho')
    log.warn('Zoho backlog unavailable — report will be empty')
  }

  // 2. Compile report from backlog data
  const report = await compileReport({
    projectId: input.projectId,
    teamId: input.teamId,
    tasks: backlog.tasks,
    milestones: backlog.milestones,
  })

  // 3. Persist trace
  const trace = await persistExecutionTrace({
    workflow: 'reportingWorkflow',
    projectId: input.projectId,
    teamId: input.teamId ?? null,
    report,
    metadata: input.metadata ?? {},
    degradedServices: degraded,
  })
  if (!trace.stored) {
    degraded.push('mongodb')
  }

  return {
    status: degraded.length > 0 ? 'COMPLETED_DEGRADED' : 'COMPLETED',
    projectId: input.projectId,
    report,
    degradedServices: degraded.length > 0 ? degraded : undefined,
  }
}

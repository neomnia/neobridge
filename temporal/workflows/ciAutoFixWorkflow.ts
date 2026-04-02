import { log, proxyActivities } from '@temporalio/workflow'
import type * as activities from '../activities'

export interface CIAutoFixWorkflowInput {
  workflow?: 'ciAutoFixWorkflow'
  projectId: string
  taskId?: string
  prompt?: string
  repoFullName?: string
  teamId?: string
}

const {
  prepareExecutionBrief,
  runRepositoryAutofix,
  openAutofixPullRequest,
  persistExecutionTrace,
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '2 minutes',
  retry: { maximumAttempts: 2 },
})

export async function ciAutoFixWorkflow(input: CIAutoFixWorkflowInput) {
  log.info('ciAutoFixWorkflow started', { projectId: input.projectId, taskId: input.taskId })

  const degraded: string[] = []

  // 1. Generate LLM brief for context
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

  // 2. Analyze CI failures (fetch failed runs, jobs, logs)
  const autofix = await runRepositoryAutofix({
    projectId: input.projectId,
    taskId: input.taskId,
    repoFullName: input.repoFullName,
    teamId: input.teamId,
  })
  if (!autofix.ok) {
    degraded.push('github')
    log.warn('Repository autofix analysis failed — skipping PR creation')
  }

  // 3. Open PR with analysis if we have failures to report
  let pr: { ok: boolean; prNumber?: number | null; prUrl?: string | null; branchName?: string | null } = {
    ok: false,
    prNumber: null,
    prUrl: null,
  }

  if (
    autofix.ok &&
    autofix.repoFullName &&
    autofix.failures &&
    autofix.failures.length > 0 &&
    autofix.runId
  ) {
    pr = await openAutofixPullRequest({
      projectId: input.projectId,
      repoFullName: autofix.repoFullName,
      baseBranch: autofix.branch ?? 'main',
      headSha: autofix.headSha ?? '',
      runId: autofix.runId,
      runNumber: autofix.runNumber ?? 0,
      failures: autofix.failures,
      fixSummary: brief.summary,
      teamId: input.teamId,
    })

    if (!pr.ok) {
      degraded.push('github-pr')
      log.warn('Failed to create autofix PR')
    } else {
      log.info('Autofix PR created', { prNumber: pr.prNumber, prUrl: pr.prUrl })
    }
  }

  // 4. Persist full execution trace
  const trace = await persistExecutionTrace({
    workflow: 'ciAutoFixWorkflow',
    projectId: input.projectId,
    taskId: input.taskId ?? null,
    repoFullName: input.repoFullName ?? null,
    summary: brief.summary,
    autofix,
    pr: pr.ok ? { number: pr.prNumber, url: pr.prUrl, branch: pr.branchName } : null,
    degradedServices: degraded,
  })
  if (!trace.stored) {
    degraded.push('mongodb')
  }

  return {
    status: degraded.length > 0 ? 'COMPLETED_DEGRADED' : 'COMPLETED',
    summary: brief.summary,
    autofix,
    pr: pr.ok ? { number: pr.prNumber, url: pr.prUrl } : null,
    degradedServices: degraded.length > 0 ? degraded : undefined,
  }
}

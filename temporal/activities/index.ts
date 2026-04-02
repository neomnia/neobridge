import { MongoClient } from 'mongodb'
import { buildLangChainPlan, type AgentPlanInput } from '@/lib/agents/langchain'

export async function prepareExecutionBrief(input: AgentPlanInput) {
  return buildLangChainPlan(input)
}

export async function syncZohoContext(projectId: string, taskId?: string) {
  return {
    ok: true,
    projectId,
    taskId: taskId ?? null,
    source: 'zoho',
    note: 'Zoho synchronization wrapper ready for Temporal worker integration.',
  }
}

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
  } finally {
    await client.close().catch(() => undefined)
  }
}

export async function runRepositoryAutofix(input: {
  projectId: string
  taskId?: string
  workflowId?: string
}) {
  return {
    ok: true,
    ...input,
    note: 'Repository autofix placeholder executed. Connect GitHub and CI next.',
  }
}

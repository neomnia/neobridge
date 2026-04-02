import { ChatAnthropic } from '@langchain/anthropic'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { MongoClient } from 'mongodb'
import { resolveCredential } from '@/lib/api-management'

export type AgentMode = 'single' | 'sprint' | 'auto'

export interface AgentPlanInput {
  workflow?: 'agentSessionWorkflow' | 'sprintPlanningWorkflow' | 'ciAutoFixWorkflow'
  mode: AgentMode
  projectId: string
  teamId?: string
  taskId?: string
  taskIds?: string[]
  prompt?: string
}

export interface AgentPlanResult {
  provider: 'anthropic' | 'mistral' | 'fallback'
  model: string
  summary: string
  storedToMongo: boolean
}

type ResolvedModel = {
  provider: 'anthropic' | 'mistral'
  model: string
  client: ChatAnthropic | ChatOpenAI
}

function buildFallbackSummary(input: AgentPlanInput): string {
  const taskScope = input.taskId
    ? `Task focus: ${input.taskId}`
    : input.taskIds?.length
      ? `Sprint focus: ${input.taskIds.length} selected tasks`
      : 'Project-wide review'

  return [
    `NeoBridge agent brief for project ${input.projectId}.`,
    `Mode: ${input.mode}.`,
    taskScope + '.',
    input.prompt?.trim() ? `User prompt: ${input.prompt.trim()}` : 'No custom prompt supplied.',
    'Next step: start or continue the Temporal workflow and persist execution traces in MongoDB when available.',
  ].join(' ')
}

async function resolveModel(teamId?: string): Promise<ResolvedModel | null> {
  const anthropic = await resolveCredential('anthropic', teamId).catch(() => null)
  if (anthropic?.apiKey) {
    const model = anthropic.model || 'claude-3-5-sonnet-latest'
    return {
      provider: 'anthropic',
      model,
      client: new ChatAnthropic({
        apiKey: anthropic.apiKey,
        model,
        temperature: 0.2,
      }),
    }
  }

  const mistral = await resolveCredential('mistral', teamId).catch(() => null)
  if (mistral?.apiKey) {
    const model = mistral.model || 'mistral-large-latest'
    return {
      provider: 'mistral',
      model,
      client: new ChatOpenAI({
        apiKey: mistral.apiKey,
        model,
        temperature: 0.2,
        configuration: {
          baseURL: 'https://api.mistral.ai/v1',
        },
      }),
    }
  }

  return null
}

async function persistRun(input: AgentPlanInput, result: { provider: string; model: string; summary: string }) {
  const uri = process.env.MONGODB_URI
  if (!uri) return false

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const dbName = process.env.MONGODB_DATABASE || 'neobridge'
    await client.db(dbName).collection('agent_runs').insertOne({
      kind: 'langchain-brief',
      projectId: input.projectId,
      teamId: input.teamId ?? null,
      workflow: input.workflow ?? null,
      mode: input.mode,
      taskId: input.taskId ?? null,
      taskIds: input.taskIds ?? [],
      prompt: input.prompt ?? null,
      provider: result.provider,
      model: result.model,
      summary: result.summary,
      createdAt: new Date(),
    })
    return true
  } catch (error) {
    console.warn('[langchain] Failed to persist run in MongoDB:', error)
    return false
  } finally {
    await client.close().catch(() => undefined)
  }
}

export async function buildLangChainPlan(input: AgentPlanInput): Promise<AgentPlanResult> {
  const resolved = await resolveModel(input.teamId)

  if (!resolved) {
    const summary = buildFallbackSummary(input)
    const storedToMongo = await persistRun(input, {
      provider: 'fallback',
      model: 'deterministic-brief',
      summary,
    })

    return {
      provider: 'fallback',
      model: 'deterministic-brief',
      summary,
      storedToMongo,
    }
  }

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are the NeoBridge LangChain orchestration layer. Produce a concise execution brief for a Temporal workflow. Keep it operational, implementation-oriented, and safe for a developer handoff.'],
    ['human', `Workflow: {workflow}\nMode: {mode}\nProject: {projectId}\nTaskId: {taskId}\nTaskIds: {taskIds}\nUser prompt: {prompt}\n\nReturn:\n1. goal\n2. recommended steps\n3. expected integrations (Temporal, Zoho, GitHub, MongoDB)\n4. risks/checks before deployment`],
  ])

  const chain = prompt.pipe(resolved.client).pipe(new StringOutputParser())
  const summary = (await chain.invoke({
    workflow: input.workflow ?? 'agentSessionWorkflow',
    mode: input.mode,
    projectId: input.projectId,
    taskId: input.taskId ?? 'n/a',
    taskIds: input.taskIds?.join(', ') || 'n/a',
    prompt: input.prompt ?? 'No extra prompt supplied.',
  })).trim()

  const storedToMongo = await persistRun(input, {
    provider: resolved.provider,
    model: resolved.model,
    summary,
  })

  return {
    provider: resolved.provider,
    model: resolved.model,
    summary,
    storedToMongo,
  }
}

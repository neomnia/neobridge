import { ChatAnthropic } from '@langchain/anthropic'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { ChatOpenAI } from '@langchain/openai'
import { MongoClient } from 'mongodb'
import { resolveCredential } from '@/lib/api-management'
import { buildRailwayContextSummary } from '@/lib/railway/client'

export type AgentMode = 'single' | 'sprint' | 'auto'

export interface AgentPlanInput {
  workflow?: 'agentSessionWorkflow' | 'sprintPlanningWorkflow' | 'ciAutoFixWorkflow'
  mode: AgentMode
  projectId: string
  teamId?: string
  taskId?: string
  taskIds?: string[]
  prompt?: string
  railwayProjectId?: string
  railwayEnvironmentId?: string
}

export interface AgentPlanResult {
  provider: 'anthropic' | 'mistral' | 'gemini' | 'perplexity' | 'fallback'
  model: string
  summary: string
  storedToMongo: boolean
  railwayContext?: string | null
}

type ResolvedModel = {
  provider: 'anthropic' | 'mistral' | 'gemini' | 'perplexity'
  model: string
  client: ChatAnthropic | ChatOpenAI
}

function buildFallbackSummary(input: AgentPlanInput, railwayContext?: string | null): string {
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
    railwayContext ? `Railway context: ${railwayContext}` : 'Railway context unavailable from the current NeoBridge configuration.',
    'Next step: start or continue the Temporal workflow, apply the Railway plan if needed, and persist execution traces in MongoDB when available.',
  ].join(' ')
}

async function resolveModel(teamId?: string): Promise<ResolvedModel | null> {
  // 1. Anthropic (priority)
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

  // 2. Mistral
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

  // 3. Gemini (Google AI Studio — API compatible OpenAI)
  const gemini = await resolveCredential('gemini', teamId).catch(() => null)
  if (gemini?.apiKey) {
    const model = gemini.model || 'gemini-2.0-flash'
    return {
      provider: 'gemini',
      model,
      client: new ChatOpenAI({
        apiKey: gemini.apiKey,
        model,
        temperature: 0.2,
        configuration: {
          baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai',
        },
      }),
    }
  }

  // 4. Perplexity (API compatible OpenAI)
  const perplexity = await resolveCredential('perplexity', teamId).catch(() => null)
  if (perplexity?.apiKey) {
    const model = perplexity.model || 'sonar-pro'
    return {
      provider: 'perplexity',
      model,
      client: new ChatOpenAI({
        apiKey: perplexity.apiKey,
        model,
        temperature: 0.2,
        configuration: {
          baseURL: 'https://api.perplexity.ai',
        },
      }),
    }
  }

  return null
}

async function persistRun(input: AgentPlanInput, result: { provider: string; model: string; summary: string; railwayContext?: string | null }) {
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
      railwayContext: result.railwayContext ?? null,
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

async function resolveRailwayContext(input: AgentPlanInput) {
  try {
    return await buildRailwayContextSummary(input.railwayProjectId)
  } catch (error) {
    console.warn('[langchain] Railway context unavailable:', error)
    return null
  }
}

export async function buildLangChainPlan(input: AgentPlanInput): Promise<AgentPlanResult> {
  const resolved = await resolveModel(input.teamId)
  const railwayContext = await resolveRailwayContext(input)

  if (!resolved) {
    const summary = buildFallbackSummary(input, railwayContext)
    const storedToMongo = await persistRun(input, {
      provider: 'fallback',
      model: 'deterministic-brief',
      summary,
      railwayContext,
    })

    return {
      provider: 'fallback',
      model: 'deterministic-brief',
      summary,
      storedToMongo,
      railwayContext,
    }
  }

  const prompt = ChatPromptTemplate.fromMessages([
    ['system', 'You are the NeoBridge LangChain orchestration layer. Produce a concise execution brief for a Temporal workflow. Keep it operational, implementation-oriented, and safe for a developer handoff.'],
    ['human', `Workflow: {workflow}\nMode: {mode}\nProject: {projectId}\nTaskId: {taskId}\nTaskIds: {taskIds}\nUser prompt: {prompt}\nRailway context: {railwayContext}\n\nReturn:\n1. goal\n2. recommended steps\n3. expected integrations (Railway, Temporal, Zoho, GitHub, MongoDB)\n4. risks/checks before deployment`],
  ])

  const chain = prompt.pipe(resolved.client).pipe(new StringOutputParser())
  const summary = (await chain.invoke({
    workflow: input.workflow ?? 'agentSessionWorkflow',
    mode: input.mode,
    projectId: input.projectId,
    taskId: input.taskId ?? 'n/a',
    taskIds: input.taskIds?.join(', ') || 'n/a',
    prompt: input.prompt ?? 'No extra prompt supplied.',
    railwayContext: railwayContext ?? 'No Railway project context available.',
  })).trim()

  const storedToMongo = await persistRun(input, {
    provider: resolved.provider,
    model: resolved.model,
    summary,
    railwayContext,
  })

  return {
    provider: resolved.provider,
    model: resolved.model,
    summary,
    storedToMongo,
    railwayContext,
  }
}

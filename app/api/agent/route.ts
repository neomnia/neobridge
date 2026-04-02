import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/server'
import { buildLangChainPlan } from '@/lib/agents/langchain'

const bodySchema = z.object({
  workflow: z.enum(['agentSessionWorkflow', 'sprintPlanningWorkflow', 'ciAutoFixWorkflow', 'reportingWorkflow']).default('agentSessionWorkflow'),
  mode: z.enum(['single', 'sprint', 'auto']).default('single'),
  projectId: z.string().min(1, 'projectId is required'),
  teamId: z.string().optional(),
  taskId: z.string().optional(),
  taskIds: z.array(z.string()).optional(),
  prompt: z.string().optional(),
  railwayProjectId: z.string().optional(),
  railwayEnvironmentId: z.string().optional(),
})

/**
 * POST /api/agent
 * Builds a LangChain brief, persists a Mongo trace when possible,
 * then delegates execution to the Temporal start endpoint.
 */
export async function POST(request: NextRequest) {
  const user = await verifyAuth()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = bodySchema.parse(await request.json())
    const brief = await buildLangChainPlan(body)

    const temporalResponse = await fetch(new URL('/api/temporal/start', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(request.headers.get('cookie') ? { cookie: request.headers.get('cookie') as string } : {}),
      },
      body: JSON.stringify({
        ...body,
        prompt: body.prompt ?? brief.summary,
        metadata: {
          initiatedBy: user.email,
          langchainProvider: brief.provider,
          langchainModel: brief.model,
          langchainBrief: brief.summary,
          storedToMongo: brief.storedToMongo,
        },
      }),
    })

    const temporalData = await temporalResponse.json()
    if (!temporalResponse.ok) {
      return NextResponse.json(
        { error: temporalData.error ?? 'Failed to start workflow', brief },
        { status: temporalResponse.status },
      )
    }

    return NextResponse.json({
      success: true,
      workflowId: temporalData.workflowId,
      runId: temporalData.runId,
      status: temporalData.status ?? 'RUNNING',
      brief,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? 'Invalid payload' }, { status: 400 })
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown agent error' },
      { status: 500 },
    )
  }
}

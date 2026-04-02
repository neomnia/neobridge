import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/server'
import { getRailwayVariables, upsertRailwayVariables } from '@/lib/railway/client'

const upsertVariablesSchema = z.object({
  environmentId: z.string().optional(),
  serviceId: z.string().optional(),
  replace: z.boolean().optional(),
  variables: z.record(z.string(), z.string()).default({}),
  environment: z.enum(['production', 'test', 'sandbox']).optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await verifyAuth()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { projectId } = await params
    const env = (request.nextUrl.searchParams.get('environment') || 'production') as 'production' | 'test' | 'sandbox'
    const environmentId = request.nextUrl.searchParams.get('environmentId') || undefined
    const serviceId = request.nextUrl.searchParams.get('serviceId') || undefined
    const unrendered = request.nextUrl.searchParams.get('unrendered') === 'true'

    const variables = await getRailwayVariables({ projectId, environmentId, serviceId, unrendered }, env)
    return NextResponse.json({ success: true, data: variables })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to read Railway variables' },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await verifyAuth()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { projectId } = await params
    const body = upsertVariablesSchema.parse(await request.json())
    const result = await upsertRailwayVariables(
      {
        projectId,
        environmentId: body.environmentId,
        serviceId: body.serviceId,
        variables: body.variables,
        replace: body.replace,
      },
      body.environment || 'production',
    )

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid payload' }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to update Railway variables' },
      { status: 500 },
    )
  }
}

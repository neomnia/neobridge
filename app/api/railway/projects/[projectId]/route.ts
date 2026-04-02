import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/server'
import { getRailwayProject, updateRailwayProject } from '@/lib/railway/client'

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
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
    const project = await getRailwayProject(projectId, env)
    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to fetch Railway project' },
      { status: 500 },
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const user = await verifyAuth()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { projectId } = await params
    const body = updateProjectSchema.parse(await request.json())
    const project = await updateRailwayProject(
      projectId,
      {
        ...(body.name ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description ?? undefined } : {}),
      },
      body.environment || 'production',
    )

    return NextResponse.json({ success: true, data: project })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid payload' }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to update Railway project' },
      { status: 500 },
    )
  }
}

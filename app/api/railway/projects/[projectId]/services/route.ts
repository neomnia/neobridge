import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/server'
import { createRailwayService, getRailwayProject } from '@/lib/railway/client'

const createServiceSchema = z.object({
  name: z.string().min(1, 'name is required'),
  repo: z.string().optional(),
  image: z.string().optional(),
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
    return NextResponse.json({ success: true, data: project.services })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to list Railway services' },
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
    const body = createServiceSchema.parse(await request.json())
    const service = await createRailwayService(
      {
        projectId,
        name: body.name,
        repo: body.repo,
        image: body.image,
      },
      body.environment || 'production',
    )

    return NextResponse.json({ success: true, data: service }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid payload' }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to create Railway service' },
      { status: 500 },
    )
  }
}

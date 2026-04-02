import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyAuth } from '@/lib/auth/server'
import { createRailwayProject, listRailwayProjects } from '@/lib/railway/client'

const createProjectSchema = z.object({
  name: z.string().min(1, 'name is required'),
  description: z.string().optional(),
  environment: z.enum(['production', 'test', 'sandbox']).optional(),
})

export async function GET(request: NextRequest) {
  const user = await verifyAuth()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const env = (request.nextUrl.searchParams.get('environment') || 'production') as 'production' | 'test' | 'sandbox'
    const projects = await listRailwayProjects(env)
    return NextResponse.json({ success: true, data: projects })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to list Railway projects' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const user = await verifyAuth()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = createProjectSchema.parse(await request.json())
    const project = await createRailwayProject(
      { name: body.name, description: body.description },
      body.environment || 'production',
    )

    return NextResponse.json({ success: true, data: project }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, error: error.errors[0]?.message || 'Invalid payload' }, { status: 400 })
    }

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to create Railway project' },
      { status: 500 },
    )
  }
}

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { db } from '@/db'
import { projectConnectors } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    const rows = await db.select().from(projectConnectors).where(eq(projectConnectors.projectId, id))
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const [row] = await db.insert(projectConnectors).values({
      projectId: id,
      type: body.type,
      label: body.label,
      config: body.config ?? {},
    }).returning()
    return NextResponse.json(row, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

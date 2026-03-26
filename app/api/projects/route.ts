import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { db } from '@/lib/db'
import { projects, projectConnectors } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    await requireAuth()
    const rows = await db.select().from(projects).orderBy(projects.createdAt)
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth()
    const body = await req.json()
    const [row] = await db.insert(projects).values({
      name: body.name,
      description: body.description ?? null,
      status: body.status ?? 'active',
      stack: body.stack ?? [],
    }).returning()
    return NextResponse.json(row, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

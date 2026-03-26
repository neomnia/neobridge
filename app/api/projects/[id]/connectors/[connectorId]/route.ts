import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { db } from '@/db'
import { projectConnectors } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; connectorId: string }> }
) {
  try {
    await requireAuth()
    const { id, connectorId } = await params
    await db.delete(projectConnectors)
      .where(and(eq(projectConnectors.id, connectorId), eq(projectConnectors.projectId, id)))
    return new NextResponse(null, { status: 204 })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

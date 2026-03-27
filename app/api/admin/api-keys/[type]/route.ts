/**
 * GET    /api/admin/api-keys/[type] — config d'un type (sans credentials)
 * PUT    /api/admin/api-keys/[type] — met à jour label/credentials/scope
 * DELETE /api/admin/api-keys/[type] — supprime
 *
 * Requiert : super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/server'
import { db } from '@/db'
import { encrypt } from '@/lib/encryption'

type Params = { params: Promise<{ type: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin()
    const { type } = await params

    try {
      const { adminApiKeys } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const [row] = await db
        .select({
          id: adminApiKeys.id,
          type: adminApiKeys.type,
          label: adminApiKeys.label,
          scope: adminApiKeys.scope,
          createdAt: adminApiKeys.createdAt,
          updatedAt: adminApiKeys.updatedAt,
        })
        .from(adminApiKeys)
        .where(eq(adminApiKeys.type, type))
        .limit(1)

      if (!row) {
        return NextResponse.json(
          { success: false, error: 'Not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, data: row })
    } catch (err) {
      console.warn('[admin/api-keys/[type]] Table not yet migrated:', err)
      return NextResponse.json(
        { success: false, error: 'Not found' },
        { status: 404 }
      )
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Super admin access required' },
      { status: 403 }
    )
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin()
    const { type } = await params
    const body = await req.json()

    const updates: Record<string, unknown> = { updatedAt: new Date() }
    if (body.label !== undefined) updates.label = body.label
    if (body.scope !== undefined) updates.scope = body.scope
    if (body.credentials && typeof body.credentials === 'object') {
      updates.credentials = await encrypt(body.credentials)
    }

    try {
      const { adminApiKeys } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      const [row] = await db
        .update(adminApiKeys)
        .set(updates)
        .where(eq(adminApiKeys.type, type))
        .returning({
          id: adminApiKeys.id,
          type: adminApiKeys.type,
          label: adminApiKeys.label,
          scope: adminApiKeys.scope,
          updatedAt: adminApiKeys.updatedAt,
        })

      if (!row) {
        return NextResponse.json(
          { success: false, error: 'Not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ success: true, data: row })
    } catch (err) {
      console.error('[admin/api-keys/[type]] Update failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to update — table may not be migrated yet' },
        { status: 500 }
      )
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Super admin access required' },
      { status: 403 }
    )
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin()
    const { type } = await params

    try {
      const { adminApiKeys } = await import('@/db/schema')
      const { eq } = await import('drizzle-orm')

      await db.delete(adminApiKeys).where(eq(adminApiKeys.type, type))

      return NextResponse.json({ success: true })
    } catch (err) {
      console.error('[admin/api-keys/[type]] Delete failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to delete — table may not be migrated yet' },
        { status: 500 }
      )
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Super admin access required' },
      { status: 403 }
    )
  }
}

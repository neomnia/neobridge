/**
 * GET  /api/admin/api-keys — liste les master keys (sans credentials en clair)
 * POST /api/admin/api-keys — crée une nouvelle master key
 *
 * Requiert : super_admin
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/server'
import { db } from '@/db'
import { encrypt } from '@/lib/encryption'

export async function GET() {
  try {
    await requireSuperAdmin()

    try {
      const { adminApiKeys } = await import('@/db/schema')
      const { desc } = await import('drizzle-orm')

      const rows = await db
        .select({
          id: adminApiKeys.id,
          type: adminApiKeys.type,
          label: adminApiKeys.label,
          scope: adminApiKeys.scope,
          createdAt: adminApiKeys.createdAt,
          updatedAt: adminApiKeys.updatedAt,
        })
        .from(adminApiKeys)
        .orderBy(desc(adminApiKeys.createdAt))

      return NextResponse.json({ success: true, data: rows })
    } catch (err) {
      console.warn('[admin/api-keys] Table not yet migrated:', err)
      return NextResponse.json({ success: true, data: [] })
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Super admin access required' },
      { status: 403 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const body = await req.json()
    const { type, label, credentials, scope } = body

    if (!type || !label || !credentials || typeof credentials !== 'object') {
      return NextResponse.json(
        { success: false, error: 'type, label and credentials (object) are required' },
        { status: 400 }
      )
    }

    const encryptedCredentials = await encrypt(credentials)

    try {
      const { adminApiKeys } = await import('@/db/schema')

      const [row] = await db
        .insert(adminApiKeys)
        .values({
          type,
          label,
          credentials: encryptedCredentials,
          scope: scope ?? null,
        })
        .returning({
          id: adminApiKeys.id,
          type: adminApiKeys.type,
          label: adminApiKeys.label,
          scope: adminApiKeys.scope,
          createdAt: adminApiKeys.createdAt,
        })

      return NextResponse.json({ success: true, data: row }, { status: 201 })
    } catch (err) {
      console.error('[admin/api-keys] Insert failed:', err)
      return NextResponse.json(
        { success: false, error: 'Failed to create master key — table may not be migrated yet' },
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

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export async function GET() {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (MOCK || !process.env.TEMPORAL_ADDRESS) {
    return NextResponse.json([])
  }

  // TODO: query Temporal for running workflows
  return NextResponse.json([])
}

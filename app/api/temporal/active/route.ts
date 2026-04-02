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

  try {
    const { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } = process.env
    const namespace = TEMPORAL_NAMESPACE ?? 'default'
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (process.env.TEMPORAL_API_KEY) {
      headers.Authorization = `Bearer ${process.env.TEMPORAL_API_KEY}`
    }

    const res = await fetch(
      `${TEMPORAL_ADDRESS}/api/v1/namespaces/${namespace}/workflows?query=ExecutionStatus='Running'`,
      { method: 'GET', headers }
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Temporal active failed: ${err}`)
    }

    const data = await res.json()
    const executions = data.executions ?? data.workflow_executions ?? []

    const normalized = executions.map((execution: any) => ({
      workflowId:
        execution?.execution?.workflow_id ??
        execution?.workflowId ??
        execution?.workflow_id ??
        null,
      runId:
        execution?.execution?.run_id ??
        execution?.runId ??
        execution?.run_id ??
        null,
      status: 'RUNNING',
      startTime: execution?.start_time ?? execution?.startTime ?? null,
      type:
        execution?.type?.name ??
        execution?.workflow_type?.name ??
        execution?.workflowType ??
        null,
    }))

    return NextResponse.json(normalized.filter((item: any) => item.workflowId))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/temporal/status/[id]
 * Returns the current status of a Temporal workflow execution.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/server"

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

// Mock statuses cycle for demo
const MOCK_SEQUENCES: Record<string, { calls: number }> = {}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: workflowId } = await params

  if (MOCK || !process.env.TEMPORAL_ADDRESS) {
    MOCK_SEQUENCES[workflowId] ??= { calls: 0 }
    const calls = ++MOCK_SEQUENCES[workflowId].calls

    // Simulate progression: RUNNING → COMPLETED after ~10 polls
    if (calls < 4) {
      return NextResponse.json({
        workflowId,
        status: "RUNNING",
        currentActivity: "Fetching Zoho tasks",
        completedSteps: calls,
        totalSteps: 5,
        startTime: new Date(Date.now() - calls * 3000).toISOString(),
        mock: true,
      })
    }
    if (calls < 8) {
      return NextResponse.json({
        workflowId,
        status: "RUNNING",
        currentActivity: "Calling Claude agent",
        completedSteps: calls,
        totalSteps: 5,
        startTime: new Date(Date.now() - calls * 3000).toISOString(),
        mock: true,
      })
    }
    return NextResponse.json({
      workflowId,
      status: "COMPLETED",
      currentActivity: null,
      completedSteps: 5,
      totalSteps: 5,
      endTime: new Date().toISOString(),
      mock: true,
    })
  }

  try {
    const { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } = process.env
    const namespace = TEMPORAL_NAMESPACE ?? "default"

    const res = await fetch(
      `${TEMPORAL_ADDRESS}/api/v1/namespaces/${namespace}/workflows/${workflowId}`,
      { method: "GET", headers: { "Content-Type": "application/json" } }
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Temporal status failed: ${err}`)
    }

    const data = await res.json()
    const execution = data.workflow_execution_info

    const STATUS_MAP: Record<string, string> = {
      WORKFLOW_EXECUTION_STATUS_RUNNING: "RUNNING",
      WORKFLOW_EXECUTION_STATUS_COMPLETED: "COMPLETED",
      WORKFLOW_EXECUTION_STATUS_FAILED: "FAILED",
      WORKFLOW_EXECUTION_STATUS_CANCELED: "CANCELED",
      WORKFLOW_EXECUTION_STATUS_TERMINATED: "TERMINATED",
      WORKFLOW_EXECUTION_STATUS_CONTINUED_AS_NEW: "RUNNING",
      WORKFLOW_EXECUTION_STATUS_TIMED_OUT: "TIMED_OUT",
    }

    return NextResponse.json({
      workflowId,
      status: STATUS_MAP[execution?.status] ?? "UNKNOWN",
      startTime: execution?.start_time,
      endTime: execution?.close_time,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

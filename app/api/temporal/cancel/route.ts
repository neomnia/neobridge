/**
 * POST /api/temporal/cancel
 * Cancels a running Temporal workflow.
 * Body: { workflowId: string; runId?: string }
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/server"

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export async function POST(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { workflowId } = await req.json()
  if (!workflowId) return NextResponse.json({ error: "workflowId required" }, { status: 400 })

  if (MOCK || !process.env.TEMPORAL_ADDRESS) {
    return NextResponse.json({ cancelled: true, workflowId, mock: true })
  }

  try {
    const { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } = process.env
    const namespace = TEMPORAL_NAMESPACE ?? "default"

    const res = await fetch(
      `${TEMPORAL_ADDRESS}/api/v1/namespaces/${namespace}/workflows/${workflowId}/terminate`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "User cancelled" }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Temporal cancel failed: ${err}`)
    }

    return NextResponse.json({ cancelled: true, workflowId })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

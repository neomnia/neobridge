/**
 * POST /api/temporal/start
 * Starts a Temporal workflow (AgentSessionWorkflow or SprintPlanningWorkflow).
 * Body: { workflow: string; taskId?: string; projectId?: string; taskIds?: string[]; mode?: string }
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/server"

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

interface StartBody {
  workflow: "agentSessionWorkflow" | "sprintPlanningWorkflow"
  taskId?: string
  taskIds?: string[]
  projectId?: string
  mode?: "single" | "sprint" | "auto"
}

export async function POST(req: NextRequest) {
  let user
  try {
    user = await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body: StartBody = await req.json()

  if (MOCK || !process.env.TEMPORAL_ADDRESS) {
    const workflowId = `wf-mock-${Date.now()}`
    return NextResponse.json({
      workflowId,
      runId: `run-${workflowId}`,
      status: "RUNNING",
      mock: true,
    })
  }

  try {
    const { TEMPORAL_ADDRESS, TEMPORAL_NAMESPACE } = process.env
    const namespace = TEMPORAL_NAMESPACE ?? "default"
    const headers: HeadersInit = { "Content-Type": "application/json" }
    if (process.env.TEMPORAL_API_KEY) {
      headers.Authorization = `Bearer ${process.env.TEMPORAL_API_KEY}`
    }
    const workflowId = `${body.workflow}-${user.userId}-${Date.now()}`

    // Temporal Cloud HTTP API: start workflow execution
    const res = await fetch(
      `${TEMPORAL_ADDRESS}/api/v1/namespaces/${namespace}/workflows`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          workflow_id: workflowId,
          workflow_type: { name: body.workflow },
          task_queue: { name: "neobridge-worker" },
          input: {
            payloads: [
              {
                metadata: { encoding: btoa("json/plain") },
                data: btoa(JSON.stringify(body)),
              },
            ],
          },
        }),
      }
    )

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Temporal start failed: ${err}`)
    }

    const data = await res.json()
    return NextResponse.json({
      workflowId: data.workflow_id ?? workflowId,
      runId: data.run_id,
      status: "RUNNING",
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

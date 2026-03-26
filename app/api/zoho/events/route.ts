/**
 * Zoho SSE stream — Server-Sent Events
 * Keeps a persistent connection open, forwarding Zoho webhook events to the client.
 * Falls back to a mock event stream when Zoho isn't configured.
 */
import { NextRequest } from "next/server"
import { requireAuth } from "@/lib/auth/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return new Response("Unauthorized", { status: 401 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    start(controller) {
      let closed = false

      function send(data: Record<string, unknown>) {
        if (closed) return
        const payload = `data: ${JSON.stringify(data)}\n\n`
        controller.enqueue(encoder.encode(payload))
      }

      // Send initial connection event
      send({ type: "connected", ts: Date.now() })

      if (MOCK || !process.env.ZOHO_CLIENT_ID) {
        // Mock: emit a fake event every 8 seconds
        const MOCK_EVENTS = [
          { type: "task_updated", taskId: "2", taskName: "Implement auth flow", status: "In Progress", actor: "Claude Agent" },
          { type: "task_completed", taskId: "5", taskName: "Deploy to staging", status: "Closed", actor: "System" },
          { type: "agent_started", workflowId: "wf-mock-001", mode: "single", actor: "User" },
          { type: "task_created", taskId: "6", taskName: "Add tests for API", status: "Open", actor: "Mistral PM" },
          { type: "milestone_updated", milestoneId: "m1", name: "MVP v1", completed: 4, total: 8 },
        ]
        let idx = 0
        const interval = setInterval(() => {
          if (closed) { clearInterval(interval); return }
          send(MOCK_EVENTS[idx % MOCK_EVENTS.length])
          idx++
        }, 8_000)

        req.signal.addEventListener("abort", () => {
          closed = true
          clearInterval(interval)
          try { controller.close() } catch {}
        })
        return
      }

      // Real: heartbeat every 30s to keep connection alive
      const heartbeat = setInterval(() => {
        if (closed) { clearInterval(heartbeat); return }
        send({ type: "heartbeat", ts: Date.now() })
      }, 30_000)

      req.signal.addEventListener("abort", () => {
        closed = true
        clearInterval(heartbeat)
        try { controller.close() } catch {}
      })
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  })
}

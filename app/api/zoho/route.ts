/**
 * Zoho Projects REST proxy
 * Actions: listProjects | listTasks | updateTask | listMilestones | getTask
 */
import { NextRequest, NextResponse } from "next/server"
import { zohoFetch } from "@/lib/zoho"
import { getProjectZohoBinding } from "@/lib/zoho-data"
import { requireAuth } from "@/lib/auth/server"

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

async function resolveZohoTarget(projectId: string) {
  if (!projectId) {
    return { zohoProjectId: "", portalId: undefined as string | undefined }
  }

  const binding = await getProjectZohoBinding(projectId)
  if (binding?.zohoProjectId) {
    return {
      zohoProjectId: binding.zohoProjectId,
      portalId: binding.portalId ?? undefined,
    }
  }

  if (UUID_RE.test(projectId)) {
    return { zohoProjectId: "", portalId: undefined as string | undefined }
  }

  return { zohoProjectId: projectId, portalId: undefined as string | undefined }
}

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_TASKS = [
  { id: "1", name: "Setup CI pipeline", status: { name: "Open", id: "open" }, priority: "High", owner: [{ name: "Claude", id: "agent" }], tags: [{ name: "infra" }] },
  { id: "2", name: "Implement auth flow", status: { name: "In Progress", id: "inprogress" }, priority: "High", owner: [{ name: "Claude", id: "agent" }], tags: [{ name: "backend" }] },
  { id: "3", name: "Design dashboard UI", status: { name: "In Review", id: "inreview" }, priority: "Medium", owner: [], tags: [{ name: "frontend" }] },
  { id: "4", name: "Write unit tests", status: { name: "Open", id: "open" }, priority: "Low", owner: [], tags: [] },
  { id: "5", name: "Deploy to staging", status: { name: "Closed", id: "closed" }, priority: "Medium", owner: [], tags: [{ name: "devops" }] },
]

const MOCK_MILESTONES = [
  { id: "m1", name: "MVP v1", status: "InProgress", end_date: "2026-04-15", task_count: 8, completed_task_count: 3 },
  { id: "m2", name: "Beta Launch", status: "Open", end_date: "2026-05-30", task_count: 12, completed_task_count: 0 },
]

const MOCK_PROJECTS = [
  {
    id: "p1",
    name: "NeoBridge Platform",
    status: "active",
    description: "Plateforme DevOps unifiée — Vercel, GitHub, Zoho, Temporal",
    last_modified_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    owner_name: "Claude",
  },
  {
    id: "p2",
    name: "NeoSaaS Template",
    status: "active",
    description: "Boilerplate Next.js 15 avec auth, paiements et admin",
    last_modified_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    owner_name: "Charles",
  },
]

// ── Route handler ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const action = searchParams.get("action")
  const rawProjectId = searchParams.get("projectId") ?? process.env.ZOHO_DEFAULT_PROJECT_ID ?? ""
  const { zohoProjectId, portalId } = await resolveZohoTarget(rawProjectId)

  if (MOCK || !process.env.ZOHO_CLIENT_ID) {
    return handleMock(action, zohoProjectId || rawProjectId)
  }

  try {
    switch (action) {
      case "listProjects": {
        const res = await zohoFetch("/projects/")
        const data = await res.json()
        return NextResponse.json(data.projects ?? [])
      }
      case "listTasks": {
        if (!zohoProjectId) {
          return NextResponse.json({ error: "Zoho connector not configured for this NeoBridge project" }, { status: 400 })
        }
        const res = await zohoFetch(`/projects/${zohoProjectId}/tasks/`, {}, { portalId })
        const data = await res.json()
        return NextResponse.json(data.tasks ?? [])
      }
      case "listMilestones": {
        if (!zohoProjectId) {
          return NextResponse.json({ error: "Zoho connector not configured for this NeoBridge project" }, { status: 400 })
        }
        const res = await zohoFetch(`/projects/${zohoProjectId}/milestones/`, {}, { portalId })
        const data = await res.json()
        return NextResponse.json(data.milestones ?? [])
      }
      case "getProject": {
        if (!zohoProjectId) {
          return NextResponse.json({ error: "Zoho connector not configured for this NeoBridge project" }, { status: 400 })
        }
        const res = await zohoFetch(`/projects/${zohoProjectId}/`, {}, { portalId })
        const data = await res.json()
        return NextResponse.json(data.projects?.[0] ?? null)
      }
      case "getTask": {
        const taskId = searchParams.get("taskId")
        if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 })
        if (!zohoProjectId) {
          return NextResponse.json({ error: "Zoho connector not configured for this NeoBridge project" }, { status: 400 })
        }
        const res = await zohoFetch(`/projects/${zohoProjectId}/tasks/${taskId}/`, {}, { portalId })
        const data = await res.json()
        return NextResponse.json(data.tasks?.[0] ?? null)
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[Zoho API]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const action = searchParams.get("action")
  const rawProjectId = searchParams.get("projectId") ?? process.env.ZOHO_DEFAULT_PROJECT_ID ?? ""
  const { zohoProjectId, portalId } = await resolveZohoTarget(rawProjectId)
  const taskId = searchParams.get("taskId")

  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 })

  if (MOCK || !process.env.ZOHO_CLIENT_ID) {
    return NextResponse.json({ success: true, mock: true })
  }

  try {
    if (action === "updateTask") {
      if (!zohoProjectId) {
        return NextResponse.json({ error: "Zoho connector not configured for this NeoBridge project" }, { status: 400 })
      }
      const body = await req.json()
      const params = new URLSearchParams(body)
      const res = await zohoFetch(`/projects/${zohoProjectId}/tasks/${taskId}/`, {
        method: "POST", // Zoho uses POST for updates via form params
        body: params,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      }, { portalId })
      const data = await res.json()
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Mock helpers ──────────────────────────────────────────────────────────────

function handleMock(action: string | null, projectId?: string) {
  switch (action) {
    case "listProjects":  return NextResponse.json(MOCK_PROJECTS)
    case "getProject": {
      const p = MOCK_PROJECTS.find(p => p.id === projectId) ?? MOCK_PROJECTS[0]
      return NextResponse.json(p)
    }
    case "listTasks":     return NextResponse.json(MOCK_TASKS)
    case "listMilestones": return NextResponse.json(MOCK_MILESTONES)
    default: return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}

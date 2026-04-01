/**
 * Zoho Projects REST proxy
 * Actions: listProjects | listTasks | updateTask | listMilestones | getTask
 */
import { NextRequest, NextResponse } from "next/server"
import { zohoFetch } from "@/lib/zoho"
import { requireAuth } from "@/lib/auth/server"

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

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
  const projectId = searchParams.get("projectId") ?? process.env.ZOHO_DEFAULT_PROJECT_ID ?? ""

  if (MOCK || !process.env.ZOHO_CLIENT_ID) {
    return handleMock(action, projectId)
  }

  try {
    switch (action) {
      case "listProjects": {
        const res = await zohoFetch("/projects/")
        const data = await res.json()
        return NextResponse.json(data.projects ?? [])
      }
      case "listTasks": {
        const res = await zohoFetch(`/projects/${projectId}/tasks/`)
        const data = await res.json()
        return NextResponse.json(data.tasks ?? [])
      }
      case "listMilestones": {
        const res = await zohoFetch(`/projects/${projectId}/milestones/`)
        const data = await res.json()
        return NextResponse.json(data.milestones ?? [])
      }
      case "getProject": {
        const res = await zohoFetch(`/projects/${projectId}/`)
        const data = await res.json()
        return NextResponse.json(data.projects?.[0] ?? null)
      }
      case "getTask": {
        const taskId = searchParams.get("taskId")
        if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 })
        const res = await zohoFetch(`/projects/${projectId}/tasks/${taskId}/`)
        const data = await res.json()
        return NextResponse.json(data.tasks?.[0] ?? null)
      }
      case "listIssues":
      case "listBugs": {
        // V3 API: /issues/ (old /bugs/ was renamed)
        const res = await zohoFetch(`/projects/${projectId}/issues/`)
        const data = await res.json()
        return NextResponse.json(data.bugs ?? data.issues ?? [])
      }
      case "listTasklists": {
        const res = await zohoFetch(`/projects/${projectId}/tasklists/`)
        const data = await res.json()
        return NextResponse.json(data.tasklists ?? [])
      }
      case "listUsers": {
        const res = await zohoFetch(`/projects/${projectId}/users/`)
        const data = await res.json()
        return NextResponse.json(data.users ?? [])
      }
      case "listStatuses": {
        const res = await zohoFetch(`/projects/${projectId}/tasks/statuses/`)
        const data = await res.json()
        return NextResponse.json(data.statuses ?? [])
      }
      case "getPortals": {
        // Diagnostic — list all accessible portals
        const { getZohoAccessToken } = await import('@/lib/zoho')
        const { serviceApiRepository } = await import('@/lib/services')
        const cfg = await serviceApiRepository.getConfig('zoho', 'production')
        const domain = (cfg?.config as any)?.domain ?? process.env.ZOHO_DOMAIN ?? 'zoho.com'
        const token = await getZohoAccessToken()
        const res = await fetch(`https://projectsapi.${domain}/api/v3/portals/`, {
          headers: { Authorization: `Zoho-oauthtoken ${token}` },
        })
        const data = await res.json()
        return NextResponse.json({ portals: data.login_info?.portals ?? data.portals ?? [], raw: data })
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
  const projectId = searchParams.get("projectId") ?? process.env.ZOHO_DEFAULT_PROJECT_ID ?? ""
  const taskId = searchParams.get("taskId")

  if (!taskId) return NextResponse.json({ error: "taskId required" }, { status: 400 })

  if (MOCK || !process.env.ZOHO_CLIENT_ID) {
    return NextResponse.json({ success: true, mock: true })
  }

  try {
    if (action === "updateTask") {
      const body = await req.json()
      const res = await zohoFetch(`/projects/${projectId}/tasks/${taskId}/`, {
        method: "PUT",
        body: JSON.stringify(body),
      })
      const data = await res.json()
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * POST /api/zoho?action=createTask|createBug|createMilestone|createProject
 * Body: JSON object with Zoho field names
 */
export async function POST(req: NextRequest) {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const action = searchParams.get("action")
  const projectId = searchParams.get("projectId") ?? ""
  const body = await req.json()

  if (MOCK || !process.env.ZOHO_CLIENT_ID) {
    return NextResponse.json({ success: true, mock: true, id: `mock-${Date.now()}` })
  }

  try {
    switch (action) {
      case "createTask": {
        if (!projectId || !body.name) return NextResponse.json({ error: "projectId and name required" }, { status: 400 })
        const payload: Record<string, string> = { name: body.name }
        if (body.status_id)          payload.status_id          = body.status_id
        if (body.priority)           payload.priority           = body.priority
        if (body.description)        payload.description        = body.description
        if (body.milestone_id)       payload.milestone_id       = body.milestone_id
        if (body.person_responsible) payload.person_responsible = body.person_responsible
        if (body.end_date)           payload.end_date           = body.end_date
        const res = await zohoFetch(`/projects/${projectId}/tasks/`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        return NextResponse.json(data)
      }
      case "updateTask": {
        const taskId = searchParams.get("taskId")
        if (!projectId || !taskId) return NextResponse.json({ error: "projectId and taskId required" }, { status: 400 })
        const res = await zohoFetch(`/projects/${projectId}/tasks/${taskId}/`, {
          method: "PUT",
          body: JSON.stringify(body),
        })
        const data = await res.json()
        return NextResponse.json(data)
      }
      case "createIssue":
      case "createBug": {
        // V3 API: /issues/ endpoint (formerly /bugs/)
        if (!projectId || !body.title) return NextResponse.json({ error: "projectId and title required" }, { status: 400 })
        const payload: Record<string, string> = { title: body.title }
        if (body.description)    payload.description    = body.description
        if (body.severity)       payload.severity       = body.severity
        if (body.classification) payload.classification = body.classification
        if (body.assignee)       payload.assignee       = body.assignee
        if (body.due_date)       payload.due_date       = body.due_date
        const res = await zohoFetch(`/projects/${projectId}/issues/`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        return NextResponse.json(data)
      }
      case "createTasklist": {
        if (!projectId || !body.name) return NextResponse.json({ error: "projectId and name required" }, { status: 400 })
        const payload: Record<string, string> = { name: body.name }
        if (body.milestone_id) payload.milestone_id = body.milestone_id
        const res = await zohoFetch(`/projects/${projectId}/tasklists/`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        return NextResponse.json(data)
      }
      case "createMilestone": {
        if (!projectId || !body.name) return NextResponse.json({ error: "projectId and name required" }, { status: 400 })
        const payload: Record<string, string> = { name: body.name }
        if (body.end_date)   payload.end_date   = body.end_date
        if (body.start_date) payload.start_date = body.start_date
        if (body.flag)       payload.flag       = body.flag
        if (body.owner)      payload.owner      = body.owner
        const res = await zohoFetch(`/projects/${projectId}/milestones/`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        return NextResponse.json(data)
      }
      case "createProject": {
        if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 })
        const payload: Record<string, string> = { name: body.name }
        if (body.description) payload.description = body.description
        if (body.start_date)  payload.start_date  = body.start_date
        if (body.end_date)    payload.end_date     = body.end_date
        if (body.owner)       payload.owner        = body.owner
        if (body.template_id) payload.template_id  = body.template_id
        const res = await zohoFetch(`/projects/`, {
          method: "POST",
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        return NextResponse.json(data)
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[Zoho API POST]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ── Mock helpers ──────────────────────────────────────────────────────────────

const MOCK_ISSUES = [
  { id: "i1", title: "Login button broken on mobile", status: { name: "Open", id: "open" }, severity: { name: "Major" } },
  { id: "i2", title: "Dashboard slow to load", status: { name: "In Progress", id: "inprogress" }, severity: { name: "Minor" } },
]
const MOCK_TASKLISTS = [
  { id: "tl1", name: "Sprint 1 — Setup", sequence: 1, completed: false },
  { id: "tl2", name: "Sprint 2 — Auth", sequence: 2, completed: false },
]

function handleMock(action: string | null, projectId?: string) {
  switch (action) {
    case "listProjects":  return NextResponse.json(MOCK_PROJECTS)
    case "getProject": {
      const p = MOCK_PROJECTS.find(p => p.id === projectId) ?? MOCK_PROJECTS[0]
      return NextResponse.json(p)
    }
    case "listTasks":      return NextResponse.json(MOCK_TASKS)
    case "listMilestones": return NextResponse.json(MOCK_MILESTONES)
    case "listIssues":
    case "listBugs":       return NextResponse.json(MOCK_ISSUES)
    case "listTasklists":  return NextResponse.json(MOCK_TASKLISTS)
    default: return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  }
}

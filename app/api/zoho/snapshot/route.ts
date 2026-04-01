/**
 * GET /api/zoho/snapshot?teamId=X&projectId=Y
 *
 * Returns a full project snapshot (tasks + milestones + project info)
 * for a given NeoBridge project that is linked to Zoho.
 *
 * Designed for AI agents — returns structured, machine-readable JSON.
 * Requires authentication.
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/server"
import { db } from "@/db"
import { platformConfig } from "@/db/schema"
import { eq } from "drizzle-orm"
import type { ZohoProjectLink } from "@/lib/types/zoho"
import { listZohoTasks, listZohoMilestones } from "@/lib/zoho-data"
import { isZohoConfigured } from "@/lib/zoho"

export const maxDuration = 30

export async function GET(req: NextRequest) {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const teamId    = searchParams.get("teamId")
  const projectId = searchParams.get("projectId")

  if (!teamId || !projectId) {
    return NextResponse.json(
      { error: "teamId and projectId are required query params" },
      { status: 400 }
    )
  }

  // ── Look up the Zoho link ──────────────────────────────────────────────────
  let link: ZohoProjectLink | null = null
  try {
    const row = await db.select().from(platformConfig)
      .where(eq(platformConfig.key, "zoho_project_links")).limit(1)
    if (row[0]?.value) {
      const links: Record<string, ZohoProjectLink> = JSON.parse(row[0].value)
      link = Object.values(links).find(l => l.teamId === teamId && l.projectId === projectId) ?? null
    }
  } catch (err) {
    console.error("[zoho/snapshot] Failed to load links:", err)
  }

  if (!link) {
    return NextResponse.json(
      { error: `No Zoho link found for ${teamId}/${projectId}. Link it in /dashboard/projects-pm.` },
      { status: 404 }
    )
  }

  const configured = await isZohoConfigured()
  if (!configured) {
    return NextResponse.json(
      { error: "Zoho credentials not configured. Set them in Admin → API Management." },
      { status: 503 }
    )
  }

  // ── Fetch Zoho data ────────────────────────────────────────────────────────
  const [tasksResult, milestonesResult] = await Promise.allSettled([
    listZohoTasks(link.zohoProjectId),
    listZohoMilestones(link.zohoProjectId),
  ])

  const tasks      = tasksResult.status      === "fulfilled" ? tasksResult.value      : []
  const milestones = milestonesResult.status === "fulfilled" ? milestonesResult.value : []

  // ── Compute summary ────────────────────────────────────────────────────────
  const byStatus = tasks.reduce<Record<string, number>>((acc, t) => {
    const s = t.status.name
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const byPriority = tasks.reduce<Record<string, number>>((acc, t) => {
    acc[t.priority] = (acc[t.priority] ?? 0) + 1
    return acc
  }, {})

  const openTasks      = tasks.filter(t => t.status.name === "Open")
  const inProgressTasks = tasks.filter(t => t.status.name === "In Progress")
  const inReviewTasks  = tasks.filter(t => t.status.name === "In Review")
  const closedTasks    = tasks.filter(t => t.status.name === "Closed")

  const completedMilestones = milestones.filter(m => m.status?.toLowerCase() === "completed").length
  const totalMilestones     = milestones.length

  return NextResponse.json({
    meta: {
      snapshotAt: new Date().toISOString(),
      teamId,
      projectId,
      zohoProjectId:   link.zohoProjectId,
      zohoProjectName: link.zohoProjectName,
      linkedAt:        link.linkedAt,
    },
    summary: {
      totalTasks:           tasks.length,
      tasksByStatus:        byStatus,
      tasksByPriority:      byPriority,
      totalMilestones,
      completedMilestones,
      milestoneProgress:    totalMilestones > 0
        ? Math.round((completedMilestones / totalMilestones) * 100)
        : null,
    },
    milestones: milestones.map(m => ({
      id:             m.id,
      name:           m.name,
      status:         m.status,
      endDate:        m.end_date,
      taskCount:      m.task_count ?? 0,
      completedTasks: m.completed_task_count ?? 0,
      progress:       (m.task_count ?? 0) > 0
        ? Math.round(((m.completed_task_count ?? 0) / m.task_count!) * 100)
        : 0,
    })),
    tasks: {
      open:       openTasks,
      inProgress: inProgressTasks,
      inReview:   inReviewTasks,
      closed:     closedTasks,
    },
  })
}

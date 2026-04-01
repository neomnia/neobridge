/**
 * Zoho ↔ NeoBridge project links
 * Stored in platform_config as key "zoho_project_links" (JSON)
 * Shape: Record<zohoProjectId, { teamId, projectId, projectName, zohoProjectName }>
 */
import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/server"
import { db } from "@/db"
import { platformConfig } from "@/db/schema"
import { eq } from "drizzle-orm"

const CONFIG_KEY = "zoho_project_links"

// Re-export from shared types to avoid boundary violations
export type { ZohoProjectLink } from "@/lib/types/zoho"
import type { ZohoProjectLink } from "@/lib/types/zoho"

async function getLinks(): Promise<Record<string, ZohoProjectLink>> {
  const row = await db.select().from(platformConfig).where(eq(platformConfig.key, CONFIG_KEY)).limit(1)
  if (!row[0]?.value) return {}
  try { return JSON.parse(row[0].value) } catch { return {} }
}

async function saveLinks(links: Record<string, ZohoProjectLink>) {
  await db.insert(platformConfig)
    .values({ key: CONFIG_KEY, value: JSON.stringify(links), updatedAt: new Date() })
    .onConflictDoUpdate({ target: platformConfig.key, set: { value: JSON.stringify(links), updatedAt: new Date() } })
}

export async function GET() {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const links = await getLinks()
  return NextResponse.json(links)
}

export async function POST(req: NextRequest) {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body: ZohoProjectLink = await req.json()
  if (!body.zohoProjectId || !body.teamId || !body.projectId) {
    return NextResponse.json({ error: "zohoProjectId, teamId, projectId required" }, { status: 400 })
  }
  const links = await getLinks()
  links[body.zohoProjectId] = { ...body, linkedAt: new Date().toISOString() }
  await saveLinks(links)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  try { await requireAuth() } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const { zohoProjectId } = await req.json()
  if (!zohoProjectId) return NextResponse.json({ error: "zohoProjectId required" }, { status: 400 })
  const links = await getLinks()
  delete links[zohoProjectId]
  await saveLinks(links)
  return NextResponse.json({ success: true })
}

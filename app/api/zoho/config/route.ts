/**
 * Zoho config — returns portal/project metadata used by the frontend.
 */
import { NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth/server"
import { zohoFetch } from "@/lib/zoho"

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true"

export async function GET() {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (MOCK || !process.env.ZOHO_CLIENT_ID) {
    return NextResponse.json({
      portalId: "mock-portal",
      projects: [{ id: "p1", name: "NeoBridge Platform", status: "active" }],
    })
  }

  try {
    const res = await zohoFetch("/projects/")
    const data = await res.json()
    return NextResponse.json({
      portalId: process.env.ZOHO_PORTAL_ID,
      projects: data.projects ?? [],
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

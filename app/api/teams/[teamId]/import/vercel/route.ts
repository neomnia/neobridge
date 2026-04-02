import { NextResponse } from 'next/server'
import { and, eq, or } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth/server'
import { db } from '@/db'
import { teams } from '@/db/schema'
import { listAllVercelProjects, listVercelProjects, listVercelTeams } from '@/lib/vercel/client'

async function resolveTeam(teamIdOrSlug: string) {
  const [team] = await db
    .select({ id: teams.id, slug: teams.slug, name: teams.name })
    .from(teams)
    .where(or(eq(teams.id, teamIdOrSlug), eq(teams.slug, teamIdOrSlug)))
    .limit(1)

  return team ?? null
}

async function buildPayload(teamIdOrSlug: string, vercelTeamId?: string) {
  const team = await resolveTeam(teamIdOrSlug).catch(() => null)
  const internalTeamId = team?.id

  const teamsList = await listVercelTeams('production', internalTeamId).catch(() => [])
  const projects = vercelTeamId
    ? await listVercelProjects(vercelTeamId, 'production', internalTeamId).catch(() => [])
    : await listAllVercelProjects('production', internalTeamId).catch(() => [])

  return {
    team: team ?? { id: teamIdOrSlug, slug: teamIdOrSlug, name: teamIdOrSlug },
    vercelTeams: teamsList,
    vercelProjects: projects,
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    await requireAuth()
    const { teamId } = await params
    const url = new URL(req.url)
    const vercelTeamId = url.searchParams.get('vercelTeamId') ?? undefined
    const data = await buildPayload(teamId, vercelTeamId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to import Vercel resources' },
      { status: 500 },
    )
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ teamId: string }> }) {
  try {
    await requireAuth()
    const { teamId } = await params
    const body = await req.json().catch(() => ({})) as { vercelTeamId?: string }
    const data = await buildPayload(teamId, body.vercelTeamId)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unable to import Vercel resources' },
      { status: 500 },
    )
  }
}

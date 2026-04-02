import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { db } from '@/db'
import { projectApps, projectConnectors, projects, teams } from '@/db/schema'
import { eq, or } from 'drizzle-orm'

export async function GET() {
  try {
    await requireAuth()
    const rows = await db.select().from(projects).orderBy(projects.createdAt)
    return NextResponse.json(rows)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

async function resolveTeam(teamIdOrSlug?: string | null) {
  if (!teamIdOrSlug) return null

  const [team] = await db
    .select({ id: teams.id, slug: teams.slug, name: teams.name })
    .from(teams)
    .where(or(eq(teams.id, teamIdOrSlug), eq(teams.slug, teamIdOrSlug)))
    .limit(1)

  return team ?? null
}

export async function POST(req: Request) {
  try {
    await requireAuth()
    const body = await req.json()

    if (!body?.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Project name is required' }, { status: 400 })
    }

    const stack = Array.isArray(body.stack)
      ? body.stack.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
      : []

    const team = await resolveTeam(body.teamId ?? body.teamSlug ?? null)

    const [row] = await db.insert(projects).values({
      name: body.name.trim(),
      description: typeof body.description === 'string' && body.description.trim() ? body.description.trim() : null,
      status: body.status ?? 'active',
      stack,
      teamId: team?.id ?? null,
      client: typeof body.client === 'string' ? body.client : null,
      automationRules: body.automationRules ?? null,
    }).returning()

    const connectorValues: Array<typeof projectConnectors.$inferInsert> = []
    const appValues: Array<typeof projectApps.$inferInsert> = []

    if (body.vercelMode === 'link-existing' && body.vercelProjectId) {
      connectorValues.push({
        projectId: row.id,
        type: 'vercel',
        label: body.vercelProjectName || `${row.name} — Vercel`,
        config: {
          mode: 'linked',
          projectId: body.vercelProjectId,
          teamId: body.vercelTeamId ?? null,
        },
      })
      appValues.push({
        projectId: row.id,
        platform: 'vercel',
        externalResourceId: body.vercelProjectId,
        name: body.vercelProjectName || row.name,
        type: 'frontend',
        branch: 'main',
        credentialSource: 'admin',
        config: { importMode: 'linked' },
      })
    } else if (body.vercelMode === 'create-new') {
      connectorValues.push({
        projectId: row.id,
        type: 'vercel',
        label: `${row.name} — Vercel`,
        config: {
          mode: 'create',
          requested: true,
          projectName: row.name,
        },
      })
    }

    if (body.createGithubRepo) {
      connectorValues.push({
        projectId: row.id,
        type: 'github',
        label: `${row.name} — GitHub`,
        config: {
          requested: true,
          template: body.template ?? 'neosaas-official',
          sourceRepository: 'https://github.com/neosaastech/Neosaas-app',
        },
      })
    }

    if (body.createZohoProject) {
      connectorValues.push({
        projectId: row.id,
        type: 'zoho',
        label: `${row.name} — Zoho Projects`,
        config: {
          requested: true,
          mode: 'create',
        },
      })
    }

    if (body.enableRailwayTemporal) {
      connectorValues.push(
        {
          projectId: row.id,
          type: 'railway',
          label: `${row.name} — Railway`,
          config: { requested: true, mode: 'provision' },
        },
        {
          projectId: row.id,
          type: 'temporal',
          label: `${row.name} — Temporal`,
          config: { requested: true, orchestration: 'project-creation' },
        },
      )
    }

    if (body.connectNeon) {
      appValues.push({
        projectId: row.id,
        platform: 'neon',
        externalResourceId: `${row.id}:neon:pending`,
        name: `${row.name}-db`,
        type: 'database',
        branch: null,
        credentialSource: 'admin',
        config: { requested: true, provider: 'neon' },
      })
    }

    if (connectorValues.length > 0) {
      await db.insert(projectConnectors).values(connectorValues)
    }

    if (appValues.length > 0) {
      await db.insert(projectApps).values(appValues)
    }

    return NextResponse.json({ ...row, teamSlug: team?.slug ?? body.teamSlug ?? null }, { status: 201 })
  } catch (error) {
    console.error('[api/projects] POST failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to create project' },
      { status: 500 },
    )
  }
}

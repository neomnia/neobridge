/**
 * GET /api/projects/logs?teamSlug=X&projectName=Y&limit=N
 * Returns merged log entries from:
 *   1. Vercel build events (latest deployment)
 *   2. NeoBridge system logs matching the project name
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { serviceApiRepository } from '@/lib/services'
import {
  syncVercelTeams,
  listVercelProjects,
  listVercelDeployments,
  listDeploymentEvents,
} from '@/lib/connectors/vercel'
import { getSystemLogs } from '@/app/actions/logs'

export interface ProjectLogEntry {
  id: string
  level: 'error' | 'warning' | 'info' | 'debug'
  message: string
  timestamp: number
  source: 'vercel' | 'neobridge'
  deployment?: string
}

export async function GET(req: NextRequest) {
  try {
    await requireAuth()

    const { searchParams } = new URL(req.url)
    const teamSlug    = searchParams.get('teamSlug') ?? ''
    const projectName = searchParams.get('projectName') ?? ''
    const limit       = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200)

    if (!teamSlug || !projectName) {
      return NextResponse.json({ error: 'teamSlug and projectName are required' }, { status: 400 })
    }

    const entries: ProjectLogEntry[] = []

    // ── 1. Vercel build events for the latest deployment ──────────────────────
    try {
      const config = await serviceApiRepository.getConfig('vercel', 'production')
      const token = (config?.config as Record<string, unknown>)?.apiToken as string | undefined

      if (token) {
        const teams = await syncVercelTeams(token)
        const team  = teams.find((t) => t.slug === teamSlug)

        if (team) {
          const projects   = await listVercelProjects(team.id, token)
          const project    = projects.find((p) => p.name === projectName)

          if (project) {
            const deployments = await listVercelDeployments(project.id, team.id, token, 3)

            for (const dep of deployments.slice(0, 2)) {
              const events = await listDeploymentEvents(dep.uid, token, 80)
              for (const ev of events) {
                if (!ev.text.trim()) continue
                entries.push({
                  id:         `vercel-${ev.id}`,
                  level:      ev.type === 'stderr' ? 'error' : detectLevel(ev.text),
                  message:    ev.text,
                  timestamp:  ev.created,
                  source:     'vercel',
                  deployment: dep.uid.slice(-8),
                })
              }
            }
          }
        }
      }
    } catch {
      // Vercel unavailable — continue with NeoBridge logs only
    }

    // ── 2. NeoBridge system logs matching project name ────────────────────────
    try {
      const result = await getSystemLogs({ search: projectName })
      if (result.success) {
        for (const log of result.data ?? []) {
          entries.push({
            id:        `nb-${log.id}`,
            level:     (log.level as ProjectLogEntry['level']) ?? 'info',
            message:   log.message,
            timestamp: log.createdAt ? new Date(log.createdAt).getTime() : Date.now(),
            source:    'neobridge',
          })
        }
      }
    } catch {
      // ignore
    }

    // Sort desc by timestamp, deduplicate, limit
    const sorted = entries
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit)

    return NextResponse.json({ data: sorted, total: sorted.length })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

function detectLevel(text: string): ProjectLogEntry['level'] {
  const t = text.toLowerCase()
  if (t.includes('error') || t.includes('err ') || t.includes('✗') || t.includes('failed')) return 'error'
  if (t.includes('warn') || t.includes('⚠') || t.includes('deprecated')) return 'warning'
  if (t.includes('debug') || t.includes('verbose') || t.startsWith('  ')) return 'debug'
  return 'info'
}

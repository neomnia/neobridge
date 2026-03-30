import { FolderKanban, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'
import { listZohoProjects } from '@/lib/zoho-data'
import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ZohoPmClient } from '@/components/dashboard/zoho-pm-client'
import type { ZohoProjectLink } from '@/app/api/zoho/links/route'

export const metadata = { title: 'Gestion de projets — NeoBridge' }
export const dynamic = 'force-dynamic'

async function fetchVercelProjects() {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown>)?.apiToken as string | undefined
    if (!token) return []
    const teams = await syncVercelTeams(token)
    const grouped = await Promise.all(
      teams.map(async (team) => {
        const projects = await listVercelProjects(team.id, token)
        return projects.map(p => ({ ...p, teamId: team.slug, teamName: team.name }))
      })
    )
    return grouped.flat()
  } catch { return [] }
}

async function fetchLinks(): Promise<Record<string, ZohoProjectLink>> {
  try {
    const row = await db.select().from(platformConfig).where(eq(platformConfig.key, 'zoho_project_links')).limit(1)
    if (!row[0]?.value) return {}
    return JSON.parse(row[0].value)
  } catch { return {} }
}

export default async function ProjectsPmPage() {
  const [zohoProjects, vercelProjects, links] = await Promise.all([
    listZohoProjects(),
    fetchVercelProjects(),
    fetchLinks(),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-7 w-7 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold">Gestion de projets</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Vue globale Zoho Projects · {zohoProjects.length} projet{zohoProjects.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <a
          href="https://projects.zoho.eu"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border rounded-lg px-3 py-2"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir Zoho
        </a>
      </div>

      {/* Info banner when Zoho not configured */}
      {zohoProjects.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 text-sm">
          <strong>Zoho Projects non configuré.</strong>{' '}
          Ajoutez vos credentials Zoho OAuth dans{' '}
          <Link href="/admin/api" className="underline underline-offset-2 text-amber-700 dark:text-amber-400">
            Admin → API Management
          </Link>
          {' '}pour synchroniser vos projets.
        </div>
      )}

      <ZohoPmClient
        zohoProjects={zohoProjects}
        vercelProjects={vercelProjects}
        initialLinks={links}
      />
    </div>
  )
}

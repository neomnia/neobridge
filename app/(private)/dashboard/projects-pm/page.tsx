import { FolderKanban, ExternalLink, AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'
import { listZohoProjectsWithStatus } from '@/lib/zoho-data'
import { getZohoPortalUrl, isZohoConfigured } from '@/lib/zoho'
import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ProjectSyncClient } from '@/components/dashboard/project-sync-client'
import type { ZohoProjectLink } from '@/app/api/zoho/links/route'

export const metadata = { title: 'Gestion de projets — NeoBridge' }
export const dynamic = 'force-dynamic'
export const maxDuration = 30

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
  // Run everything in parallel — each fetch has its own fallback
  const [
    zohoConfigured,
    { projects: zohoProjects, error: zohoError },
    vercelProjects,
    links,
    zohoPortalUrl,
  ] = await Promise.all([
    isZohoConfigured().catch(() => false),
    listZohoProjectsWithStatus().catch(() => ({ projects: [], isMock: false, error: 'Erreur de connexion Zoho' })),
    fetchVercelProjects(),
    fetchLinks(),
    getZohoPortalUrl().catch(() => 'https://projects.zoho.com'),
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-7 w-7 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold">Synchronisation des projets</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {zohoProjects.length} projet{zohoProjects.length !== 1 ? 's' : ''} Zoho
              · {vercelProjects.length} projet{vercelProjects.length !== 1 ? 's' : ''} Vercel
            </p>
          </div>
        </div>
        {zohoConfigured && (
          <a
            href={zohoPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border rounded-lg px-3 py-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir Zoho
          </a>
        )}
      </div>

      {/* Zoho sync error (credentials present but API failing) */}
      {zohoConfigured && zohoError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 flex gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-800 dark:text-red-200">Erreur de synchronisation Zoho</p>
            <p className="font-mono text-xs text-red-700 dark:text-red-400 break-all">{zohoError}</p>
            <Link href="/admin/api" className="text-xs underline underline-offset-2 text-red-600">
              Vérifier les credentials → Admin › API Management › Zoho
            </Link>
          </div>
        </div>
      )}

      {/* Zoho not configured — inline notice, does NOT hide Vercel projects */}
      {!zohoConfigured && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-amber-800 dark:text-amber-200">
              <strong>Zoho non configuré</strong> — les projets Vercel sont visibles mais la synchronisation PM est désactivée.
            </span>
          </div>
          <Link
            href="/admin/api"
            className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Configurer
          </Link>
        </div>
      )}

      {/* Main sync table — always rendered */}
      <ProjectSyncClient
        zohoProjects={zohoProjects}
        vercelProjects={vercelProjects}
        initialLinks={links}
        zohoPortalBaseUrl={zohoPortalUrl}
        zohoConfigured={zohoConfigured}
      />
    </div>
  )
}

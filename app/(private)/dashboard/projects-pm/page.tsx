import { FolderKanban, ExternalLink, Plus, AlertTriangle, Settings } from 'lucide-react'
import Link from 'next/link'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listVercelProjects } from '@/lib/connectors/vercel'
import { listZohoProjectsWithStatus } from '@/lib/zoho-data'
import { getZohoPortalUrl, isZohoConfigured } from '@/lib/zoho'
import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ZohoProjectList } from '@/components/dashboard/zoho-project-list'
import type { ZohoProjectLink } from '@/app/api/zoho/links/route'

export const metadata = { title: 'Projets Zoho — NeoBridge' }
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

  // Zoho not configured — show setup gate
  if (!zohoConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-7 w-7 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold">Projets Zoho</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Gestion de projets PM connectée à NeoBridge</p>
          </div>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="space-y-3">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Connexion Zoho requise</p>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                Configurez vos credentials Zoho pour synchroniser vos projets et les connecter à NeoBridge.
              </p>
              <ol className="text-sm text-amber-800 dark:text-amber-300 space-y-1 list-decimal list-inside">
                <li>Aller dans <strong>Admin → API Management → Zoho</strong></li>
                <li>Saisir <strong>Client ID</strong>, <strong>Client Secret</strong> et <strong>Portal ID</strong></li>
                <li>Cliquer <strong>"Enregistrer et connecter"</strong></li>
              </ol>
              <Link
                href="/admin/api"
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 text-sm font-medium transition-colors"
              >
                <Settings className="h-4 w-4" />
                Configurer Zoho
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const connectedCount = Object.keys(links).length
  const unconnectedCount = zohoProjects.length - connectedCount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-7 w-7 text-violet-500" />
          <div>
            <h1 className="text-2xl font-bold">Projets Zoho</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {zohoProjects.length} projet{zohoProjects.length !== 1 ? 's' : ''}
              {connectedCount > 0 && ` · ${connectedCount} connecté${connectedCount !== 1 ? 's' : ''}`}
              {unconnectedCount > 0 && ` · ${unconnectedCount} non connecté${unconnectedCount !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={zohoPortalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border rounded-lg px-3 py-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ouvrir Zoho
          </a>
        </div>
      </div>

      {/* API error (credentials OK but sync failing) */}
      {zohoError && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-4 flex gap-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-red-800 dark:text-red-200">Erreur de synchronisation</p>
            <p className="font-mono text-xs text-red-700 dark:text-red-400 break-all">{zohoError}</p>
            <Link href="/admin/api" className="text-xs underline underline-offset-2 text-red-600">
              Vérifier les credentials
            </Link>
          </div>
        </div>
      )}

      {/* Project list */}
      <ZohoProjectList
        zohoProjects={zohoProjects}
        vercelProjects={vercelProjects}
        initialLinks={links}
        zohoPortalBaseUrl={zohoPortalUrl}
      />
    </div>
  )
}

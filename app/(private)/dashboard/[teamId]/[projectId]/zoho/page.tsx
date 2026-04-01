import { db } from '@/db'
import { platformConfig } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { ZohoProjectLink } from '@/lib/types/zoho'
import {
  listZohoTasksWithStatus,
  listZohoMilestones,
  listZohoStatuses,
} from '@/lib/zoho-data'
import { getZohoPortalUrl } from '@/lib/zoho'
import { KanbanBoard } from '@/components/neobridge/kanban/KanbanBoard'
import { BarChart3, ExternalLink, Link2Off, Milestone } from 'lucide-react'
import Link from 'next/link'

export const metadata = { title: 'Zoho — NeoBridge' }
export const dynamic = 'force-dynamic'
export const maxDuration = 30

async function getZohoLink(teamId: string, projectId: string): Promise<ZohoProjectLink | null> {
  try {
    const row = await db.select().from(platformConfig)
      .where(eq(platformConfig.key, 'zoho_project_links')).limit(1)
    if (!row[0]?.value) return null
    const links: Record<string, ZohoProjectLink> = JSON.parse(row[0].value)
    return Object.values(links).find(l => l.teamId === teamId && l.projectId === projectId) ?? null
  } catch { return null }
}

export default async function ZohoPage({
  params,
}: {
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId, projectId } = await params

  const [link, portalBaseUrl] = await Promise.all([
    getZohoLink(teamId, projectId),
    getZohoPortalUrl(),
  ])

  // ── Not linked ──────────────────────────────────────────────────────────────
  if (!link) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-20">
        <Link2Off className="h-12 w-12 text-muted-foreground/40" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Projet non lié à Zoho</h2>
          <p className="text-muted-foreground text-sm">
            Associez ce projet depuis{' '}
            <Link href="/dashboard/projects-pm" className="underline text-brand hover:text-brand/80">
              Gestion PM
            </Link>
            .
          </p>
        </div>
      </div>
    )
  }

  // ── Fetch everything in parallel ────────────────────────────────────────────
  const syncedAt = new Date()
  const [taskResult, milestones, statuses] = await Promise.all([
    listZohoTasksWithStatus(link.zohoProjectId),
    listZohoMilestones(link.zohoProjectId),
    listZohoStatuses(link.zohoProjectId),
  ])

  const { tasks, isMock, error: syncError } = taskResult

  return (
    <div className="flex flex-col h-full space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="h-6 w-6 text-violet-500 shrink-0" />
          <div>
            <h2 className="text-xl font-semibold">{link.zohoProjectName}</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              {tasks.length} tâche{tasks.length !== 1 ? 's' : ''}
              {milestones.length > 0 && (
                <> · {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}</>
              )}
              {!isMock && (
                <span className="ml-2 text-green-600 dark:text-green-400">
                  · Synchro {syncedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
        </div>
        <a
          href={portalBaseUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors border rounded-lg px-3 py-2 whitespace-nowrap shrink-0"
        >
          <ExternalLink className="h-4 w-4" />
          Ouvrir Zoho
        </a>
      </div>

      {/* Sync error banner */}
      {isMock && syncError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm space-y-1">
          <p className="font-medium text-amber-800 dark:text-amber-300">
            Données de démonstration — synchronisation Zoho échouée
          </p>
          <p className="font-mono text-xs text-amber-700 dark:text-amber-400 break-all">{syncError}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Vérifiez les credentials dans{' '}
            <Link href="/admin/api" className="underline underline-offset-2">Admin → API Management → Zoho</Link>
          </p>
        </div>
      )}
      {isMock && !syncError && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-sm text-blue-700 dark:text-blue-300">
          Mode démonstration — données fictives. Configurez Zoho dans{' '}
          <Link href="/admin/api" className="underline underline-offset-2">Admin → API Management</Link>.
        </div>
      )}

      {/* Milestones */}
      {milestones.length > 0 && (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {milestones.map(m => {
            const total = m.task_count ?? 0
            const done = m.completed_task_count ?? 0
            const pct = total > 0 ? Math.round((done / total) * 100) : 0
            const isComplete = m.status?.toLowerCase() === 'completed'
            return (
              <div key={m.id} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Milestone className={`h-4 w-4 shrink-0 mt-0.5 ${isComplete ? 'text-green-500' : 'text-violet-500'}`} />
                  <span className="text-sm font-medium leading-snug">{m.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap shrink-0">{pct}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full transition-all ${isComplete ? 'bg-green-500' : 'bg-violet-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{done}/{total} tâches</span>
                  {m.end_date && <span>{m.end_date}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Kanban */}
      <div className="flex-1 overflow-hidden min-h-0">
        <KanbanBoard
          initialTasks={tasks}
          zohoProjectId={link.zohoProjectId}
          portalBaseUrl={portalBaseUrl}
          statuses={statuses}
          isMock={isMock}
          milestones={milestones}
        />
      </div>
    </div>
  )
}

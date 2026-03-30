import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Key } from 'lucide-react'
import { serviceApiRepository } from '@/lib/services'
import { syncVercelTeams, listAllVercelDeployments, type VercelDeployment } from '@/lib/connectors/vercel'
import { getSystemLogs } from '@/app/actions/logs'
import { DeploymentsClient, type DeploymentRow } from '@/components/dashboard/deployments-client'

export const metadata = { title: 'Déploiements — NeoBridge' }
export const dynamic = 'force-dynamic'

async function fetchVercelDeployments(): Promise<{ rows: DeploymentRow[]; token: boolean }> {
  try {
    const config = await serviceApiRepository.getConfig('vercel', 'production')
    const token = (config?.config as Record<string, unknown>)?.apiToken as string | undefined
    if (!token) return { rows: [], token: false }

    const teams = await syncVercelTeams(token)
    if (!teams.length) return { rows: [], token: true }

    const grouped = await Promise.all(
      teams.map(async (team) => {
        const deployments: VercelDeployment[] = await listAllVercelDeployments(team.id, token, 50)
        return deployments.map<DeploymentRow>((d) => ({
          id:         d.uid,
          shortId:    d.uid.slice(-9),
          project:    d.name,
          teamSlug:   team.slug,
          env:        d.target === 'production' ? 'Production' : d.target === 'development' ? 'Development' : 'Preview',
          state:      d.state,
          duration:   d.readyAt ? Math.round((d.readyAt - d.createdAt) / 1000) : null,
          branch:     d.meta?.githubCommitRef ?? null,
          commitMsg:  d.meta?.githubCommitMessage ?? null,
          commitSha:  d.meta?.githubCommitSha?.slice(0, 7) ?? null,
          author:     d.meta?.githubCommitAuthorName ?? d.creator?.username ?? null,
          createdAt:  d.createdAt,
          source:     'vercel',
          url:        d.url ?? null,
        }))
      }),
    )
    const rows = grouped.flat().sort((a, b) => b.createdAt - a.createdAt)
    return { rows, token: true }
  } catch {
    return { rows: [], token: false }
  }
}

async function fetchNeoBridgeDeployments(): Promise<DeploymentRow[]> {
  try {
    const result = await getSystemLogs({ category: 'deployment' })
    if (!result.success) return []
    return (result.data ?? []).map<DeploymentRow>((log) => ({
      id:        log.id,
      shortId:   log.id.slice(-8),
      project:   'neobridge',
      teamSlug:  'neomnia-studio',
      env:       'Production',
      state:     log.level === 'error' ? 'ERROR' : 'READY',
      duration:  null,
      branch:    null,
      commitMsg: log.message,
      commitSha: null,
      author:    log.user ? `${log.user.firstName} ${log.user.lastName}`.trim() : null,
      createdAt: log.createdAt ? new Date(log.createdAt).getTime() : Date.now(),
      source:    'neobridge',
      url:       null,
    }))
  } catch {
    return []
  }
}

export default async function DeploymentsPage() {
  const [{ rows: vercelRows, token }, neobridgeRows] = await Promise.all([
    fetchVercelDeployments(),
    fetchNeoBridgeDeployments(),
  ])

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Key className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <p className="font-semibold text-lg">Token Vercel non configuré</p>
          <p className="text-sm text-muted-foreground mt-1">
            Configurez votre token dans Gestion des API pour voir les déploiements.
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/api">Configurer Vercel</Link>
        </Button>
      </div>
    )
  }

  const all = [...vercelRows, ...neobridgeRows].sort((a, b) => b.createdAt - a.createdAt)

  return <DeploymentsClient deployments={all} />
}

import { DollarSign, Database, Rocket, Bot, BarChart3 } from 'lucide-react'
import { db } from '@/db'
import { projectApps, projectConnectors, projects, teams } from '@/db/schema'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export const metadata = { title: 'Coûts — NeoBridge' }

async function fetchCostFoundation() {
  try {
    const [teamRows, projectRows, appRows, connectorRows] = await Promise.all([
      db.select().from(teams),
      db.select().from(projects),
      db.select({ platform: projectApps.platform }).from(projectApps),
      db.select({ type: projectConnectors.type }).from(projectConnectors),
    ])

    const perPlatform = appRows.reduce<Record<string, number>>((acc, app) => {
      acc[app.platform] = (acc[app.platform] ?? 0) + 1
      return acc
    }, {})

    const perConnector = connectorRows.reduce<Record<string, number>>((acc, connector) => {
      acc[connector.type] = (acc[connector.type] ?? 0) + 1
      return acc
    }, {})

    return {
      teams: teamRows.length,
      projects: projectRows.length,
      perPlatform,
      perConnector,
    }
  } catch {
    return {
      teams: 0,
      projects: 0,
      perPlatform: {},
      perConnector: {},
    }
  }
}

export default async function GlobalCostsPage() {
  const data = await fetchCostFoundation()

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <DollarSign className="h-6 w-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold">Coûts & empreinte globale</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Base de pilotage NeoBridge avant branchement des APIs de billing détaillées
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Workspaces</p><p className="text-2xl font-bold mt-1">{data.teams}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Projets</p><p className="text-2xl font-bold mt-1">{data.projects}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Apps connectées</p><p className="text-2xl font-bold mt-1">{Object.values(data.perPlatform).reduce((sum, value) => sum + value, 0)}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Connecteurs actifs</p><p className="text-2xl font-bold mt-1">{Object.values(data.perConnector).reduce((sum, value) => sum + value, 0)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Rocket className="h-4 w-4" /> Répartition infrastructure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(data.perPlatform).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune ressource technique reliée pour le moment.</p>
            ) : (
              Object.entries(data.perPlatform).map(([platform, count]) => (
                <div key={platform} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">{platform}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" /> Connecteurs & orchestration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.keys(data.perConnector).length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun connecteur métier enregistré pour le moment.</p>
            ) : (
              Object.entries(data.perConnector).map(([connector, count]) => (
                <div key={connector} className="flex items-center justify-between rounded-lg border p-3">
                  <span className="font-medium">{connector}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground flex items-start gap-3">
        <BarChart3 className="h-4 w-4 mt-0.5 shrink-0" />
        <p>
          Cette vue consolide déjà l’empreinte technique. Les montants réels Vercel / Neon / Railway seront branchés ensuite, sans changer le principe : NeoBridge reste le cockpit maître.
        </p>
      </div>
    </div>
  )
}

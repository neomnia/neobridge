import Link from 'next/link'
import { requireAuth, isAdmin } from '@/lib/auth/server'
import { db } from '@/db'
import { serviceApiConfigs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Key, CheckCircle2, XCircle, ExternalLink, Settings2, Zap } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const maxDuration = 30
export const metadata = { title: 'APIs NeoBridge' }

const NEOBRIDGE_SERVICES = [
  { id: 'anthropic', name: 'Anthropic (Claude)', description: 'Agent Dev — génération de code, commits et automatisation', category: '🤖 Agents IA', docs: 'https://docs.anthropic.com' },
  { id: 'mistral', name: 'Mistral', description: 'Orchestration, priorisation et synthèse', category: '🤖 Agents IA', docs: 'https://docs.mistral.ai' },
  { id: 'vercel', name: 'Vercel', description: 'Déploiements, projets, env vars et sync teams', category: '🚀 Infrastructure', docs: 'https://vercel.com/docs/rest-api' },
  { id: 'github_token', name: 'GitHub Token', description: 'Accès repos, branches et PRs', category: '🚀 Infrastructure', docs: 'https://docs.github.com/en/authentication' },
  { id: 'railway', name: 'Railway', description: 'Services backend et workflows', category: '🚀 Infrastructure', docs: 'https://docs.railway.app' },
  { id: 'neon', name: 'Neon', description: 'Base de données PostgreSQL et monitoring', category: '🚀 Infrastructure', docs: 'https://neon.tech/docs/reference/api-reference' },
  { id: 'zoho', name: 'Zoho Projects', description: 'Tâches, jalons, bugs et suivi PM', category: '📋 Project Management', docs: 'https://www.zoho.com/projects/help/rest-api/zohoprojectsapi.html' },
  { id: 'notion', name: 'Notion', description: 'Documentation produit et spécifications', category: '📋 Project Management', docs: 'https://developers.notion.com' },
  { id: 'temporal', name: 'Temporal', description: 'Workflows durables et orchestration', category: '⚙️ Orchestration', docs: 'https://docs.temporal.io' },
] as const

function groupByCategory(services: typeof NEOBRIDGE_SERVICES) {
  const map = new Map<string, typeof NEOBRIDGE_SERVICES[number][]>()
  for (const service of services) {
    if (!map.has(service.category)) map.set(service.category, [])
    map.get(service.category)!.push(service)
  }
  return map
}

export default async function ApiKeysPage() {
  const user = await requireAuth()
  const userIsAdmin = await isAdmin(user.userId)

  const statusMap = new Map<string, boolean>()
  try {
    const rows = await db
      .select({ serviceName: serviceApiConfigs.serviceName, isActive: serviceApiConfigs.isActive })
      .from(serviceApiConfigs)
      .where(eq(serviceApiConfigs.environment, 'production'))

    for (const row of rows) {
      statusMap.set(row.serviceName, row.isActive)
    }
  } catch {
    // DB or config unavailable → read-only empty state
  }

  const configuredCount = [...statusMap.values()].filter(Boolean).length
  const groups = groupByCategory(NEOBRIDGE_SERVICES)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Key className="h-7 w-7 text-brand" />
          <div>
            <h1 className="text-2xl font-bold">APIs NeoBridge</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {configuredCount}/{NEOBRIDGE_SERVICES.length} services connectés
            </p>
          </div>
        </div>
        {userIsAdmin && (
          <Button asChild variant="outline" size="sm" className="gap-2">
            <Link href="/admin/api">
              <Settings2 className="h-4 w-4" />
              Configurer les clés
            </Link>
          </Button>
        )}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between mb-2 text-sm">
          <span className="font-medium">Couverture des services</span>
          <span className="text-muted-foreground">{Math.round((configuredCount / NEOBRIDGE_SERVICES.length) * 100)}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(configuredCount / NEOBRIDGE_SERVICES.length) * 100}%` }} />
        </div>
      </div>

      {[...groups.entries()].map(([category, services]) => (
        <div key={category}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-0.5">{category}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {services.map((service) => {
              const active = statusMap.get(service.id) ?? false
              return (
                <div key={service.id} className="rounded-xl border bg-card p-4 flex items-start gap-3 hover:border-brand/40 transition-colors">
                  <div className="mt-0.5 shrink-0">
                    {active ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-muted-foreground/50" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{service.name}</span>
                      <Badge variant={active ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0">
                        {active ? 'Connecté' : 'Non configuré'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>
                  </div>

                  <div className="flex flex-col gap-1 shrink-0">
                    <a href={service.docs} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" title="Documentation">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                    {userIsAdmin && (
                      <Link href="/admin/api" title="Configurer">
                        <Zap className="h-3.5 w-3.5 text-muted-foreground hover:text-brand transition-colors" />
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {!userIsAdmin && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-4 text-sm text-blue-700 dark:text-blue-300">
          <strong>Vue lecture seule.</strong> Pour configurer les clés API, contactez un administrateur.
        </div>
      )}
    </div>
  )
}

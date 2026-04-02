import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import { Plus, Building2, FolderKanban, Rocket, Key } from 'lucide-react'

export const metadata = { title: 'Cockpit global — NeoBridge' }

interface Team {
  id: string
  name: string
  slug: string
  plan: 'free' | 'pro' | 'enterprise'
  projectCount: number
}

const PLAN_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  free:       'outline',
  pro:        'default',
  enterprise: 'secondary',
}

const PLAN_LABEL: Record<string, string> = {
  free:       'Free',
  pro:        'Pro',
  enterprise: 'Enterprise',
}

async function fetchDashboardData(): Promise<{ teams: Team[]; totalProjects: number; activeServices: number }> {
  try {
    const { db } = await import('@/db')
    const { projects, serviceApiConfigs, teams } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const [teamRows, projectRows, serviceRows] = await Promise.all([
      db.select().from(teams),
      db.select({ id: projects.id, teamId: projects.teamId }).from(projects),
      db.select({ id: serviceApiConfigs.id }).from(serviceApiConfigs).where(eq(serviceApiConfigs.isActive, true)),
    ])

    const projectCountByTeam = new Map<string, number>()
    for (const project of projectRows) {
      if (!project.teamId) continue
      projectCountByTeam.set(project.teamId, (projectCountByTeam.get(project.teamId) ?? 0) + 1)
    }

    return {
      teams: teamRows.map((team) => ({
        id: team.id,
        name: team.name,
        slug: team.slug,
        plan: (team.plan ?? 'free') as Team['plan'],
        projectCount: projectCountByTeam.get(team.id) ?? 0,
      })),
      totalProjects: projectRows.length,
      activeServices: serviceRows.length,
    }
  } catch {
    return { teams: [], totalProjects: 0, activeServices: 0 }
  }
}

export default async function DashboardPage() {
  const { teams, totalProjects, activeServices } = await fetchDashboardData()

  return (
    <div className="space-y-6">
      <ImpersonationBanner />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cockpit global NeoBridge</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {teams.length} workspace{teams.length !== 1 ? 's' : ''} · {totalProjects} projet{totalProjects !== 1 ? 's' : ''} · {activeServices} service{activeServices !== 1 ? 's' : ''} actif{activeServices !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/dashboard/projects-pm">
              <FolderKanban className="h-4 w-4 mr-2" />
              Gestion PM
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/deployments">
              <Rocket className="h-4 w-4 mr-2" />
              Déploiements
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/api-keys">
              <Key className="h-4 w-4 mr-2" />
              APIs NeoBridge
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Workspaces</p><p className="text-2xl font-bold mt-1">{teams.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Projets maîtrisés par NeoBridge</p><p className="text-2xl font-bold mt-1">{totalProjects}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-sm text-muted-foreground">Services connectés</p><p className="text-2xl font-bold mt-1">{activeServices}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.length === 0 ? (
          <Card className="sm:col-span-2 lg:col-span-3">
            <CardContent className="py-16 text-center space-y-2">
              <p className="font-medium text-muted-foreground">Aucun workspace NeoBridge détecté</p>
              <p className="text-sm text-muted-foreground">Le cockpit global est prêt ; la prochaine étape consiste à rattacher ou créer les workspaces et projets.</p>
            </CardContent>
          </Card>
        ) : teams.map((team) => (
          <Link key={team.id} href={`/dashboard/${team.slug ?? team.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{team.name}</h3>
                      <p className="text-xs text-muted-foreground">/{team.slug}</p>
                    </div>
                  </div>
                  <Badge variant={PLAN_VARIANT[team.plan] ?? 'outline'} className="shrink-0">
                    {PLAN_LABEL[team.plan] ?? team.plan}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  {team.projectCount ?? 0} projet{(team.projectCount ?? 0) !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

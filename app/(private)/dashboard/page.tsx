import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ImpersonationBanner } from '@/components/admin/impersonation-banner'
import { Plus, Building2 } from 'lucide-react'

export const metadata = { title: 'Mes espaces de travail — NeoBridge' }

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

const MOCK_TEAM: Team = {
  id:           'neomnia',
  name:         'Agence Neomnia',
  slug:         'neomnia',
  plan:         'pro',
  projectCount: 2,
}

async function fetchTeams(): Promise<Team[]> {
  try {
    const { db } = await import('@/db')
    const { teams } = await import('@/db/schema')
    const rows = await db.select().from(teams)
    return rows.map(t => ({
      id:           t.id,
      name:         t.name,
      slug:         t.slug,
      plan:         (t.plan ?? 'free') as Team['plan'],
      projectCount: 0,
    }))
  } catch {
    return []
  }
}

export default async function DashboardPage() {
  const teams = await fetchTeams()

  // Mode mock : aucune team → une team fictive + redirect direct
  if (teams.length === 0) {
    redirect(`/dashboard/${MOCK_TEAM.slug}`)
  }

  // Une seule team → redirect direct
  if (teams.length === 1) {
    redirect(`/dashboard/${teams[0].slug ?? teams[0].id}`)
  }

  return (
    <div className="space-y-6">
      <ImpersonationBanner />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mes espaces de travail</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {teams.length} workspace{teams.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau workspace
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams.map((team) => (
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

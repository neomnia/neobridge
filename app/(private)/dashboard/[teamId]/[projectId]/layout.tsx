import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { getNeoBridgeProject } from '@/lib/zoho-data'
import { Server, Shield, Bot, BarChart3, Settings, ChevronRight } from 'lucide-react'

const STATUS_LABEL: Record<string, string> = {
  active:    'Actif',
  completed: 'Terminé',
  archived:  'Archivé',
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  active:    'default',
  completed: 'secondary',
  archived:  'outline',
}

const tabs = [
  { name: 'Infrastructure', href: 'infrastructure', icon: Server },
  { name: 'Gouvernance',    href: 'governance',     icon: Shield },
  { name: 'Orchestration', href: 'orchestration',  icon: Bot },
  { name: 'Zoho',          href: 'zoho',           icon: BarChart3 },
  { name: 'Paramètres',    href: 'settings',       icon: Settings },
]

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ teamId: string; projectId: string }>
}) {
  const { teamId, projectId } = await params
  const project = await getNeoBridgeProject(projectId, teamId)
  if (!project) notFound()

  const teamName = project.teamName ?? teamId.charAt(0).toUpperCase() + teamId.slice(1)
  const base = `/dashboard/${teamId}/${projectId}`

  return (
    <div className="space-y-0">
      <div className="border-b pb-4 mb-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
          <Link href="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <Link
            href={`/dashboard/${teamId}`}
            className="hover:text-foreground transition-colors"
          >
            {teamName}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">{project.name}</span>
        </nav>

        {/* Project header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold">{project.name}</h1>
            {project.description && (
              <p className="text-sm text-muted-foreground mt-0.5">{project.description}</p>
            )}
          </div>
          <Badge
            variant={STATUS_VARIANT[project.status] ?? 'secondary'}
            className="shrink-0"
          >
            {STATUS_LABEL[project.status] ?? project.status}
          </Badge>
        </div>

        {/* Tabs */}
        <nav className="flex gap-1 mt-4 flex-wrap">
          {tabs.map(({ name, href, icon: Icon }) => (
            <Link
              key={href}
              href={`${base}/${href}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4" />
              {name}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  )
}

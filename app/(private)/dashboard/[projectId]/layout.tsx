import { notFound } from 'next/navigation'
import { LayoutDashboard, Kanban, Bot, ListTodo, Settings } from 'lucide-react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { Project } from '@/db/schema'

async function fetchProject(id: string): Promise<Project | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const res = await fetch(`${baseUrl}/api/projects/${id}`, { cache: 'no-store' })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

const statusLabel: Record<string, string> = {
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
}

const tabNav = [
  { label: 'Vue d\'ensemble', href: '', icon: LayoutDashboard },
  { label: 'Kanban', href: '/kanban', icon: Kanban },
  { label: 'Agent', href: '/agent', icon: Bot },
  { label: 'Sprint', href: '/sprint', icon: ListTodo },
]

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = await params
  const project = await fetchProject(projectId)
  if (!project) notFound()

  const base = `/dashboard/${projectId}`

  return (
    <div className="space-y-0">
      {/* Project header */}
      <div className="border-b pb-4 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href="/dashboard" className="hover:text-foreground transition-colors">Projets</Link>
              <span>/</span>
              <span className="text-foreground font-medium">{project.name}</span>
            </div>
            {project.description && (
              <p className="text-sm text-muted-foreground">{project.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {project.stack?.map(t => (
              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
            ))}
            <Badge variant="secondary">{statusLabel[project.status]}</Badge>
          </div>
        </div>

        {/* Tab nav */}
        <nav className="flex gap-1 mt-4">
          {tabNav.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={`${base}${href}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {children}
    </div>
  )
}

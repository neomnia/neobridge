'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { Project } from '@/db/schema'

const statusVariant: Record<string, 'default' | 'secondary' | 'outline'> = {
  active: 'default',
  completed: 'secondary',
  archived: 'outline',
}

const statusLabel: Record<string, string> = {
  active: 'Actif',
  completed: 'Terminé',
  archived: 'Archivé',
}

interface ProjectCardProps {
  project: Project
  taskCount?: { open: number; total: number }
  agentActive?: boolean
}

export function ProjectCard({ project, taskCount, agentActive }: ProjectCardProps) {
  const progress = taskCount && taskCount.total > 0
    ? Math.round(((taskCount.total - taskCount.open) / taskCount.total) * 100)
    : 0

  return (
    <Link href={`/dashboard/${project.id}`}>
      <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">{project.name}</h3>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {agentActive && (
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" title="Agent actif" />
              )}
              <Badge variant={statusVariant[project.status]}>{statusLabel[project.status]}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {project.stack && project.stack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {project.stack.map((tech) => (
                <Badge key={tech} variant="outline" className="text-xs px-1.5 py-0">{tech}</Badge>
              ))}
            </div>
          )}

          {taskCount && taskCount.total > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Avancement</span>
                <span>{taskCount.total - taskCount.open}/{taskCount.total} tâches</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Créé {formatDistanceToNow(new Date(project.createdAt), { addSuffix: true, locale: fr })}
          </p>
        </CardContent>
      </Card>
    </Link>
  )
}

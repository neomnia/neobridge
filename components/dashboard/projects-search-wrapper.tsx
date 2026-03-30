"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface ProjectCard {
  id: string; name: string; framework: string | null; updatedAt: number
  deployState: string | null; teamSlug: string; teamName: string
}

interface Props {
  projects: ProjectCard[]
  deployVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'>
  deployLabel: Record<string, string>
}

export function ProjectsSearchWrapper({ projects, deployVariant, deployLabel }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return projects
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q) || (p.framework ?? '').toLowerCase().includes(q),
    )
  }, [projects, query])

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un projet…"
          className="pl-9"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Aucun projet correspondant.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <Link key={project.id} href={`/dashboard/${project.teamSlug}/${project.name}/infrastructure`}>
              <Card className="hover:border-brand/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{project.name}</h3>
                      {project.framework && (
                        <p className="text-xs text-muted-foreground mt-0.5">{project.framework}</p>
                      )}
                    </div>
                    {project.deployState && (
                      <Badge variant={deployVariant[project.deployState] ?? 'outline'} className="shrink-0 text-xs">
                        {deployLabel[project.deployState] ?? project.deployState}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true, locale: fr })}
                    </p>
                    <Badge variant="outline" className="text-xs font-mono shrink-0">
                      {project.teamSlug}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

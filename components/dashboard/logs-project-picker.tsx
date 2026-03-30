"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { ScrollText, Search, Plus, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ProjectEntry {
  name: string
  teamSlug: string
  framework: string | null
}

const PROJECT_COLORS: string[] = [
  'bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500',
  'bg-pink-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-red-500',
]
function projectColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return PROJECT_COLORS[h % PROJECT_COLORS.length]
}

interface Props { projects: ProjectEntry[] }

export function LogsProjectPicker({ projects }: Props) {
  const router = useRouter()
  const [query, setQuery]     = useState('')
  const [hovered, setHovered] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.framework ?? '').toLowerCase().includes(q),
    )
  }, [projects, query])

  return (
    <div className="min-h-[500px] flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-2 pb-6">
        <ScrollText className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-bold">Logs</h1>
        <Badge variant="outline" className="text-xs">{projects.length} projets</Badge>
      </div>

      {/* Picker card */}
      <div className="flex-1 flex items-start justify-center">
        <div className="w-full max-w-xl">

          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-center border rounded-xl bg-muted/30">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <ScrollText className="h-7 w-7 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold text-lg">Continuer vers les Logs</p>
                <p className="text-sm text-muted-foreground mt-1">Aucun projet Vercel configuré.</p>
              </div>
              <Link
                href="/admin/api"
                className="text-sm text-brand hover:underline flex items-center gap-1"
              >
                Configurer Vercel <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
              {/* Empty state icon + title */}
              <div className="flex flex-col items-center pt-8 pb-4 px-6 text-center border-b">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted mb-3">
                  <ScrollText className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="font-semibold">Continuer vers les Logs</p>
                <p className="text-xs text-muted-foreground mt-1">Choisissez un projet pour continuer</p>
              </div>

              {/* Search */}
              <div className="p-3 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Rechercher un projet…"
                    className="pl-9 h-9 text-sm bg-muted/50"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
              </div>

              {/* Project list */}
              <ScrollArea className="h-72">
                <div className="py-1">
                  {filtered.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      Aucun projet correspondant.
                    </p>
                  ) : (
                    filtered.map((project) => (
                      <button
                        key={project.name}
                        onClick={() => router.push(`/dashboard/${project.teamSlug}/${project.name}/logs`)}
                        onMouseEnter={() => setHovered(project.name)}
                        onMouseLeave={() => setHovered(null)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          hovered === project.name ? 'bg-muted' : '',
                        )}
                      >
                        <div className={cn(
                          'h-7 w-7 rounded-md text-white flex items-center justify-center text-xs font-bold shrink-0',
                          projectColor(project.name),
                        )}>
                          {project.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{project.name}</p>
                          {project.framework && (
                            <p className="text-xs text-muted-foreground">{project.framework}</p>
                          )}
                        </div>
                        {hovered === project.name && (
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                      </button>
                    ))
                  )}

                  {/* Create project link */}
                  <Link
                    href="/dashboard/new"
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:bg-muted transition-colors border-t mt-1"
                  >
                    <div className="h-7 w-7 rounded-md border border-dashed flex items-center justify-center shrink-0">
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                    Créer un projet
                  </Link>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

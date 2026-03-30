"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Terminal, RefreshCw, Circle, ArrowLeft, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import type { ProjectLogEntry } from '@/app/api/projects/logs/route'

type LevelFilter = 'all' | 'error' | 'warning' | 'info' | 'debug'

const LEVEL_COLOR: Record<string, string> = {
  error:   'text-red-500 dark:text-red-400',
  warning: 'text-amber-500 dark:text-amber-400',
  info:    'text-blue-400',
  debug:   'text-muted-foreground',
}
const LEVEL_BADGE: Record<string, 'destructive' | 'outline' | 'secondary' | 'default'> = {
  error:   'destructive',
  warning: 'outline',
  info:    'secondary',
  debug:   'outline',
}
const SOURCE_COLOR: Record<string, string> = {
  vercel:    'text-foreground',
  neobridge: 'text-purple-500',
}

export default function LogsPage() {
  const { teamId, projectId } = useParams<{ teamId: string; projectId: string }>()
  const [logs, setLogs]       = useState<ProjectLogEntry[]>([])
  const [filter, setFilter]   = useState<LevelFilter>('all')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const bottomRef             = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/projects/logs?teamSlug=${encodeURIComponent(teamId)}&projectName=${encodeURIComponent(projectId)}&limit=150`,
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { data } = await res.json()
      setLogs(data ?? [])
    } catch (e) {
      setError("Impossible de charger les logs.")
    } finally {
      setLoading(false)
    }
  }, [teamId, projectId])

  useEffect(() => { refresh() }, [refresh])

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.level === filter)

  const counts = {
    error:   logs.filter((l) => l.level === 'error').length,
    warning: logs.filter((l) => l.level === 'warning').length,
    info:    logs.filter((l) => l.level === 'info').length,
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Terminal className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Logs runtime</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vercel build events + NeoBridge · projet{' '}
              <span className="font-mono text-foreground">{projectId}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground h-8" asChild>
            <Link href="/dashboard/logs">
              <ArrowLeft className="h-3.5 w-3.5" />
              Tous les projets
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Summary + filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-2">
          <Badge variant="destructive" className="gap-1.5 cursor-pointer" onClick={() => setFilter(filter === 'error' ? 'all' : 'error')}>
            <Circle className="h-2 w-2 fill-current" />{counts.error} erreurs
          </Badge>
          <Badge variant="outline" className={cn('gap-1.5 cursor-pointer border-amber-400 text-amber-600 dark:text-amber-400', filter === 'warning' && 'bg-amber-50 dark:bg-amber-950')} onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}>
            <Circle className="h-2 w-2 fill-amber-500" />{counts.warning} warnings
          </Badge>
          <Badge variant="secondary" className="gap-1.5 cursor-pointer" onClick={() => setFilter(filter === 'info' ? 'all' : 'info')}>
            <Circle className="h-2 w-2 fill-blue-500" />{counts.info} infos
          </Badge>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as LevelFilter)}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les niveaux</SelectItem>
              <SelectItem value="error">Erreurs</SelectItem>
              <SelectItem value="warning">Avertissements</SelectItem>
              <SelectItem value="info">Infos</SelectItem>
              <SelectItem value="debug">Debug</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Log viewer */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[540px]">
            <div className="font-mono text-xs divide-y divide-border">

              {loading && logs.length === 0 && (
                <div className="flex items-center justify-center gap-2 py-20 text-muted-foreground">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Chargement des logs…
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-20 gap-2 text-center text-muted-foreground">
                  <Terminal className="h-8 w-8" />
                  <p className="font-medium">{error}</p>
                  <p className="text-xs">Vérifiez votre token Vercel dans <Link href="/admin/api" className="underline">Gestion des API</Link>.</p>
                </div>
              )}

              {!loading && !error && filtered.length === 0 && (
                <p className="text-muted-foreground p-6 text-center">
                  {filter !== 'all' ? `Aucun log de niveau "${filter}".` : 'Aucun log disponible pour ce projet.'}
                </p>
              )}

              {filtered.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 px-4 py-2 hover:bg-muted/20 transition-colors group">
                  {/* Timestamp */}
                  <span className="text-muted-foreground whitespace-nowrap shrink-0 pt-0.5 w-20 text-right">
                    {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: false, locale: fr })}
                  </span>

                  {/* Level badge */}
                  <Badge variant={LEVEL_BADGE[entry.level]} className="text-[10px] h-4 shrink-0 mt-0.5 uppercase">
                    {entry.level}
                  </Badge>

                  {/* Source */}
                  <span className={cn('shrink-0 mt-0.5 opacity-70', SOURCE_COLOR[entry.source])}>
                    [{entry.source}{entry.deployment ? `:${entry.deployment}` : ''}]
                  </span>

                  {/* Message */}
                  <span className={cn('break-all flex-1', LEVEL_COLOR[entry.level])}>
                    {entry.message}
                  </span>
                </div>
              ))}

              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Footer links */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
        <span>{filtered.length} entrée{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-4">
          <Link href="/dashboard/logs" className="hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Sélecteur de projets
          </Link>
          <Link
            href={`/dashboard/${teamId}/${projectId}/deployments`}
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            Voir les déploiements <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}

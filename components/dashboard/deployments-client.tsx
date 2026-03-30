"use client"

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  GitBranch, GitCommitHorizontal, ChevronRight, Search,
  Rocket, Circle, Loader, MoreHorizontal,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export interface DeploymentRow {
  id: string
  shortId: string
  project: string
  teamSlug: string
  env: 'Production' | 'Preview' | 'Development'
  state: string
  duration: number | null
  branch: string | null
  commitMsg: string | null
  commitSha: string | null
  author: string | null
  createdAt: number
  source: 'vercel' | 'neobridge'
  url: string | null
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  READY:    'text-green-500',
  ERROR:    'text-red-500',
  BUILDING: 'text-yellow-500',
  QUEUED:   'text-muted-foreground',
  CANCELED: 'text-muted-foreground',
}
const STATUS_LABEL: Record<string, string> = {
  READY:    'Ready',
  ERROR:    'Error',
  BUILDING: 'Building',
  QUEUED:   'Queued',
  CANCELED: 'Canceled',
}

// ── Project avatar ─────────────────────────────────────────────────────────────

const PROJECT_COLORS: string[] = [
  'bg-orange-500', 'bg-blue-500', 'bg-purple-500', 'bg-green-500',
  'bg-pink-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-red-500',
]
function projectColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff
  return PROJECT_COLORS[h % PROJECT_COLORS.length]
}

// ── Duration label ─────────────────────────────────────────────────────────────

function fmtDuration(s: number | null): string {
  if (s == null) return '—'
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m${s % 60}s`
}

// ── Row ───────────────────────────────────────────────────────────────────────

function DeployRow({ d }: { d: DeploymentRow }) {
  const dotColor = STATUS_DOT[d.state] ?? 'text-muted-foreground'
  const isBuilding = d.state === 'BUILDING'

  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors group">

      {/* ID + env */}
      <div className="w-32 shrink-0">
        <Link
          href={d.url ? `https://${d.url}` : `/dashboard/${d.teamSlug}/${d.project}/deployments`}
          target={d.url ? '_blank' : undefined}
          rel="noreferrer"
          className="font-mono text-sm font-semibold hover:underline"
        >
          {d.shortId}
        </Link>
        <p className="text-xs text-muted-foreground mt-0.5">{d.env}</p>
      </div>

      {/* Status + duration */}
      <div className="w-28 shrink-0 flex items-center gap-1.5">
        {isBuilding
          ? <Loader className="h-3.5 w-3.5 animate-spin text-yellow-500" />
          : <Circle className={cn('h-3 w-3 fill-current', dotColor)} />
        }
        <div>
          <p className="text-xs font-medium">{STATUS_LABEL[d.state] ?? d.state}</p>
          <p className="text-[10px] text-muted-foreground">{fmtDuration(d.duration)}</p>
        </div>
      </div>

      {/* Project */}
      <div className="w-36 shrink-0 flex items-center gap-2">
        <div className={cn(
          'h-6 w-6 rounded text-white flex items-center justify-center text-xs font-bold shrink-0',
          projectColor(d.project),
        )}>
          {d.project[0].toUpperCase()}
        </div>
        <div className="min-w-0">
          <Link
            href={`/dashboard/${d.teamSlug}/${d.project}/infrastructure`}
            className="text-sm font-medium truncate block hover:underline"
          >
            {d.project}
          </Link>
          {d.source === 'neobridge' && (
            <span className="text-[10px] text-purple-500 font-medium">NeoBridge</span>
          )}
        </div>
      </div>

      {/* Branch + commit */}
      <div className="flex-1 min-w-0 hidden md:block">
        {d.branch && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <GitBranch className="h-3 w-3 shrink-0" />
            <span className="font-mono truncate">{d.branch}</span>
          </div>
        )}
        {d.commitMsg && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <GitCommitHorizontal className="h-3 w-3 shrink-0" />
            {d.commitSha && (
              <span className="font-mono text-[10px] opacity-60 shrink-0">{d.commitSha}</span>
            )}
            <span className="truncate">{d.commitMsg}</span>
          </div>
        )}
      </div>

      {/* Author + time */}
      <div className="shrink-0 text-right hidden sm:block">
        <p className="text-xs text-muted-foreground whitespace-nowrap">
          {formatDistanceToNow(new Date(d.createdAt), { addSuffix: true, locale: fr })}
        </p>
        {d.author && (
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">par {d.author}</p>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

const PAGE_SIZE = 20

interface Props { deployments: DeploymentRow[] }

export function DeploymentsClient({ deployments }: Props) {
  const [search, setSearch]   = useState('')
  const [env, setEnv]         = useState<string>('all')
  const [status, setStatus]   = useState<string>('all')
  const [source, setSource]   = useState<string>('all')
  const [page, setPage]       = useState(1)

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return deployments.filter((d) => {
      if (env !== 'all' && d.env !== env) return false
      if (status !== 'all' && d.state !== status) return false
      if (source !== 'all' && d.source !== source) return false
      if (q && !d.project.toLowerCase().includes(q) &&
          !d.shortId.toLowerCase().includes(q) &&
          !(d.branch ?? '').toLowerCase().includes(q) &&
          !(d.commitMsg ?? '').toLowerCase().includes(q) &&
          !(d.author ?? '').toLowerCase().includes(q)) return false
      return true
    })
  }, [deployments, search, env, status, source])

  const visible = filtered.slice(0, page * PAGE_SIZE)
  const hasMore = visible.length < filtered.length

  const statuses = [...new Set(deployments.map((d) => d.state))]

  return (
    <div className="space-y-0">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-4">
        <div className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-xl font-bold">Déploiements</h1>
          <Badge variant="outline" className="text-xs">{deployments.length}</Badge>
        </div>
        <Button variant="ghost" size="icon" className="text-muted-foreground">
          <MoreHorizontal className="h-5 w-5" />
        </Button>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 pb-4 border-b">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Rechercher…"
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>

        <Select value={source} onValueChange={(v) => { setSource(v); setPage(1) }}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes sources</SelectItem>
            <SelectItem value="vercel">Vercel</SelectItem>
            <SelectItem value="neobridge">NeoBridge</SelectItem>
          </SelectContent>
        </Select>

        <Select value={env} onValueChange={(v) => { setEnv(v); setPage(1) }}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Environnement" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous envs</SelectItem>
            <SelectItem value="Production">Production</SelectItem>
            <SelectItem value="Preview">Preview</SelectItem>
            <SelectItem value="Development">Development</SelectItem>
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
          <SelectTrigger className="h-8 w-36 text-xs">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {statuses.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-1.5">
                  <Circle className={cn('h-2.5 w-2.5 fill-current', STATUS_DOT[s] ?? 'text-muted-foreground')} />
                  {STATUS_LABEL[s] ?? s}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || env !== 'all' || status !== 'all' || source !== 'all') && (
          <Button
            variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setSearch(''); setEnv('all'); setStatus('all'); setSource('all'); setPage(1) }}
          >
            Réinitialiser
          </Button>
        )}

        <p className="ml-auto text-xs text-muted-foreground shrink-0">
          {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* ── List ───────────────────────────────────────────────────────── */}
      <div className="border rounded-lg divide-y overflow-hidden mt-4">
        {/* Column header */}
        <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 text-[11px] text-muted-foreground font-medium uppercase tracking-wider hidden md:flex">
          <div className="w-32">ID</div>
          <div className="w-28">Statut</div>
          <div className="w-36">Projet</div>
          <div className="flex-1">Branche / Commit</div>
          <div className="shrink-0 text-right">Auteur</div>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-2">
            <p className="text-sm text-muted-foreground font-medium">Aucun déploiement trouvé</p>
            <p className="text-xs text-muted-foreground">Modifiez les filtres pour afficher plus de résultats.</p>
          </div>
        ) : (
          visible.map((d) => <DeployRow key={d.id} d={d} />)
        )}
      </div>

      {/* ── Load more ──────────────────────────────────────────────────── */}
      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            className="w-full max-w-xs gap-2"
            onClick={() => setPage((p) => p + 1)}
          >
            Charger plus <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}

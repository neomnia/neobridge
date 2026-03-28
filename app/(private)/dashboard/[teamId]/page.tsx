'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle2, Clock, Plus, Search,
  Brain, Activity,
  Terminal, ChevronRight, Loader2, Zap, GitCommit,
  FileText, Target, Bot, ExternalLink, Server,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface VercelProject {
  id: string; name: string; source: 'vercel'
  url: string; status: string; updatedAt: string | null; framework: string | null
}
interface RailwayProject {
  id: string; name: string; source: 'railway'
  url: string | null; status: string; updatedAt: string | null
  services: string[]; environments: string[]
}
interface PulseEvent {
  id: string; timestamp: Date
  source: 'zoho' | 'github' | 'temporal' | 'notion' | 'agent'
  message: string; confidenceScore?: number
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

const SOURCE_ICON: Record<string, React.ReactNode> = {
  zoho:     <Target    className="h-3.5 w-3.5 text-orange-500" />,
  github:   <GitCommit className="h-3.5 w-3.5 text-gray-500" />,
  temporal: <Clock     className="h-3.5 w-3.5 text-purple-500" />,
  notion:   <FileText  className="h-3.5 w-3.5 text-gray-600" />,
  agent:    <Bot       className="h-3.5 w-3.5 text-blue-500" />,
}

function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 95) return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">🟢 {score}%</Badge>
  if (score >= 70) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">🟠 {score}%</Badge>
  return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">🔴 {score}%</Badge>
}

function StatusBadge({ status, source }: { status: string; source: 'vercel' | 'railway' }) {
  const map: Record<string, { label: string; className: string }> = {
    READY:    { label: 'Ready',    className: 'bg-green-100 text-green-700 border-green-200' },
    RUNNING:  { label: 'Running',  className: 'bg-green-100 text-green-700 border-green-200' },
    BUILDING: { label: 'Building', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    ERROR:    { label: 'Error',    className: 'bg-red-100 text-red-700 border-red-200' },
    CRASHED:  { label: 'Crashed',  className: 'bg-red-100 text-red-700 border-red-200' },
    CANCELED: { label: 'Canceled', className: 'bg-gray-100 text-gray-600 border-gray-200' },
    UNKNOWN:  { label: 'Unknown',  className: 'bg-gray-100 text-gray-500 border-gray-200' },
  }
  const s = map[status] ?? map.UNKNOWN
  return <Badge variant="outline" className={`text-[10px] ${s.className}`}>{s.label}</Badge>
}

const MOCK_PULSE: PulseEvent[] = [
  { id: '1', timestamp: new Date(Date.now() -  60000), source: 'agent',    message: 'Claude : composant TableCompta généré et committé', confidenceScore: 97 },
  { id: '2', timestamp: new Date(Date.now() - 180000), source: 'github',   message: '3 commits automatiques — Fix: TVA Logic' },
  { id: '3', timestamp: new Date(Date.now() - 300000), source: 'zoho',     message: 'Nouveau jalon atteint : MVP Compta validé 🎯' },
  { id: '4', timestamp: new Date(Date.now() - 600000), source: 'temporal', message: 'Workflow #872 terminé : Déploiement Staging ✓' },
  { id: '5', timestamp: new Date(Date.now() - 900000), source: 'notion',   message: 'Roadmap mise à jour : Étape 4 débloquée 📓' },
  { id: '6', timestamp: new Date(Date.now()-1200000),  source: 'agent',    message: 'Mistral PM : tâche #41 priorisée → brief envoyé à Claude', confidenceScore: 91 },
]

// Ghost steps cycle — each step becomes 'done' then next 'running', loops
const GHOST_STEPS = [
  'Analyse du ticket Zoho',
  'Consultation doc Notion via MCP',
  'Écriture du composant React',
  'Validation du schéma Neon',
  'Déploiement sur Vercel',
]

// ─── Ghost Dev Monitor ─────────────────────────────────────────────────────────

function GhostDevMonitor() {
  const [doneCount, setDoneCount] = useState(2)  // 0→2 already done at mount

  useEffect(() => {
    if (doneCount >= GHOST_STEPS.length) return
    const t = setTimeout(() => setDoneCount(d => d + 1), 3500)
    return () => clearTimeout(t)
  }, [doneCount])

  return (
    <div className="space-y-2">
      {GHOST_STEPS.map((label, i) => {
        const isDone    = i < doneCount
        const isRunning = i === doneCount && doneCount < GHOST_STEPS.length
        const isPending = i > doneCount
        return (
          <div key={i} className="flex items-center gap-2.5 text-xs">
            {isDone    && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
            {isRunning && <Loader2      className="h-3.5 w-3.5 text-blue-500 shrink-0 animate-spin" />}
            {isPending && <div          className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />}
            <span className={isPending ? 'text-muted-foreground/50' : ''}>{label}</span>
          </div>
        )
      })}
      {doneCount >= GHOST_STEPS.length && (
        <p className="text-[11px] text-green-600 font-medium pt-1">✓ Ticket #42 livré</p>
      )}
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function PanoptiqueePage() {
  const params  = useParams<{ teamId: string }>()
  const teamId  = params.teamId

  const [vercelProjects, setVercelProjects] = useState<VercelProject[]>([])
  const [railwayProjects, setRailwayProjects] = useState<RailwayProject[]>([])
  const [loading, setLoading]   = useState(true)
  const [pulse]                 = useState<PulseEvent[]>(MOCK_PULSE)
  const [search, setSearch]     = useState('')
  const inputRef                = useRef<HTMLInputElement>(null)

  const loadProjects = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/projects')
      if (r.ok) {
        const data = await r.json()
        setVercelProjects(data.vercel ?? [])
        setRailwayProjects(data.railway ?? [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    loadProjects()
    const interval = setInterval(loadProjects, 30000)
    return () => clearInterval(interval)
  }, [loadProjects])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const q = search.toLowerCase().trim()
  const filteredVercel  = q ? vercelProjects.filter(p  => p.name.toLowerCase().includes(q)  || p.framework?.toLowerCase().includes(q))  : vercelProjects
  const filteredRailway = q ? railwayProjects.filter(p => p.name.toLowerCase().includes(q)  || p.services.some(s => s.toLowerCase().includes(q))) : railwayProjects

  return (
    <div className="space-y-4">

      {/* ── Recherche de projets ────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5 border rounded-xl bg-background shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-all">
        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Rechercher un projet Vercel ou Railway…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {search && (
          <button type="button" onClick={() => setSearch('')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ✕
          </button>
        )}
        {!loading && (
          <span className="text-[11px] text-muted-foreground shrink-0">
            {filteredVercel.length + filteredRailway.length} projet{filteredVercel.length + filteredRailway.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ── Zone A — Vercel Projects ───────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            <svg className="h-4 w-4" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 4L28 24H4L16 4Z"/>
            </svg>
            Vercel
          </h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/${teamId}/new`}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nouveau
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredVercel.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-8 text-center">
              {q ? (
                <p className="text-muted-foreground text-sm">Aucun projet Vercel correspondant à « {search} »</p>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">Aucun projet Vercel</p>
                  <p className="text-xs text-muted-foreground mt-1">Configurez votre token dans <Link href="/admin/api" className="text-primary hover:underline">Admin → API Management</Link></p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredVercel.map(p => (
              <Card key={p.id} className="hover:border-primary/40 hover:shadow-sm transition-all group">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.name}</h3>
                      {p.framework && <p className="text-[11px] text-muted-foreground mt-0.5">{p.framework}</p>}
                    </div>
                    <StatusBadge status={p.status} source="vercel" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors truncate">
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      {p.url.replace('https://', '')}
                    </a>
                  )}
                  <div className="flex items-center justify-between">
                    {p.updatedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: fr })}
                      </span>
                    )}
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Zone A — Railway Projects ──────────────────────────────── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Server className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Railway</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filteredRailway.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-6 text-center">
              {q ? (
                <p className="text-muted-foreground text-sm">Aucun projet Railway correspondant à « {search} »</p>
              ) : (
                <>
                  <p className="text-muted-foreground text-sm">Aucun projet Railway</p>
                  <p className="text-xs text-muted-foreground mt-1">Configurez votre clé dans <Link href="/admin/api" className="text-primary hover:underline">Admin → API Management</Link></p>
                </>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredRailway.map(p => (
              <Card key={p.id} className="hover:border-primary/40 hover:shadow-sm transition-all group">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors flex-1">{p.name}</h3>
                    <StatusBadge status={p.status} source="railway" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-2">
                  {p.services.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {p.services.map(s => (
                        <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                      ))}
                    </div>
                  )}
                  {p.environments.length > 0 && (
                    <div className="flex gap-1">
                      {p.environments.map(env => (
                        <Badge key={env} variant="outline" className="text-[10px]">{env}</Badge>
                      ))}
                    </div>
                  )}
                  {p.updatedAt && (
                    <span className="text-[10px] text-muted-foreground block">
                      {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: fr })}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Zone B — Pulse + Ghost Dev ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pulse */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" />
              Le Pulse
              <span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-green-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                Live
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="h-56">
              <div className="space-y-3">
                {pulse.map(event => (
                  <div key={event.id} className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">{SOURCE_ICON[event.source]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">{event.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(event.timestamp, { addSuffix: true, locale: fr })}
                        </span>
                        {event.confidenceScore !== undefined && <ConfidenceBadge score={event.confidenceScore} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Ghost Dev Monitor */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-blue-500" />
              Ghost Dev Monitor
              <Badge variant="outline" className="ml-auto text-[10px] font-normal">Ticket #42</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <GhostDevMonitor />

            {/* Knowledge Growth */}
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Brain className="h-3.5 w-3.5 text-violet-500" />
                Knowledge Growth
                <Badge variant="secondary" className="ml-auto text-[10px]">+3 ce jour</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5 pl-5">
                <p>└── Déploiement Railway avec migration Drizzle</p>
                <p>└── Composant tableau comptable multi-devise</p>
                <p>└── Workflow Temporal avec retry exponentiel</p>
              </div>
              <div className="flex items-center gap-1.5 pl-5 pt-0.5">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="text-[11px] text-muted-foreground">
                  Base totale : <span className="font-semibold text-foreground">47</span> patterns
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

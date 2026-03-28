'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  CheckCircle2, XCircle, AlertCircle, Clock, Plus, Send,
  Brain, Activity, Terminal, ChevronRight, Loader2,
  Zap, GitCommit, FileText, Target, Bot,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  description?: string
  status: string
  last_modified_time?: string
}

interface StatusCard extends Project {
  vercel: 'READY' | 'BUILDING' | 'ERROR' | 'UNKNOWN'
  railway: 'RUNNING' | 'CRASHED' | 'UNKNOWN'
  neonLatency: number | null
  temporalActive: number
  tokensToday: number
  tokenLimit: number
  confidence: number
}

interface PulseEvent {
  id: string
  timestamp: Date
  source: 'zoho' | 'github' | 'temporal' | 'notion' | 'agent'
  type: string
  message: string
  confidenceScore?: number
  projectId?: string
}

interface GhostStep {
  id: string
  label: string
  status: 'done' | 'running' | 'pending'
  duration?: string
}

// ─── Source icons ─────────────────────────────────────────────────────────────

const SOURCE_ICON: Record<string, React.ReactNode> = {
  zoho:     <Target className="h-3.5 w-3.5 text-orange-500" />,
  github:   <GitCommit className="h-3.5 w-3.5 text-gray-600" />,
  temporal: <Clock className="h-3.5 w-3.5 text-purple-500" />,
  notion:   <FileText className="h-3.5 w-3.5 text-gray-700" />,
  agent:    <Bot className="h-3.5 w-3.5 text-blue-500" />,
}

// ─── Confidence badge ─────────────────────────────────────────────────────────

function ConfidenceBadge({ score }: { score: number }) {
  if (score >= 95) return <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">🟢 {score}%</Badge>
  if (score >= 70) return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">🟠 {score}%</Badge>
  return <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px]">🔴 {score}%</Badge>
}

// ─── Status dot ───────────────────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  const ok = status === 'READY' || status === 'RUNNING'
  const err = status === 'ERROR' || status === 'CRASHED'
  if (ok)  return <span className="inline-block h-2 w-2 rounded-full bg-green-500 shrink-0" />
  if (err) return <span className="inline-block h-2 w-2 rounded-full bg-red-500 shrink-0" />
  return <span className="inline-block h-2 w-2 rounded-full bg-yellow-400 shrink-0" />
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockCard(project: Project): StatusCard {
  const seed = project.id.charCodeAt(0) % 4
  const vercelStates: StatusCard['vercel'][] = ['READY', 'READY', 'BUILDING', 'ERROR']
  const railwayStates: StatusCard['railway'][] = ['RUNNING', 'RUNNING', 'RUNNING', 'CRASHED']
  return {
    ...project,
    vercel: vercelStates[seed],
    railway: railwayStates[seed],
    neonLatency: 8 + (seed * 14),
    temporalActive: seed * 2,
    tokensToday: 20000 + seed * 22000,
    tokenLimit: 200000,
    confidence: 97 - seed * 9,
  }
}

const MOCK_PULSE: PulseEvent[] = [
  { id: '1', timestamp: new Date(Date.now() - 60000),   source: 'agent',    type: 'agent_step', message: 'Claude : composant TableCompta généré et committé', confidenceScore: 97 },
  { id: '2', timestamp: new Date(Date.now() - 180000),  source: 'github',   type: 'commit',     message: '3 commits automatiques — Fix: TVA Logic' },
  { id: '3', timestamp: new Date(Date.now() - 300000),  source: 'zoho',     type: 'milestone',  message: 'Nouveau jalon atteint : MVP Compta validé 🎯' },
  { id: '4', timestamp: new Date(Date.now() - 600000),  source: 'temporal', type: 'workflow',   message: 'Workflow #872 terminé : Déploiement Staging ✓' },
  { id: '5', timestamp: new Date(Date.now() - 900000),  source: 'notion',   type: 'doc_update', message: 'Roadmap mise à jour : Étape 4 débloquée 📓' },
  { id: '6', timestamp: new Date(Date.now() - 1200000), source: 'agent',    type: 'agent_step', message: 'Mistral PM : tâche #41 priorisée → brief envoyé à Claude', confidenceScore: 91 },
]

const MOCK_GHOST: GhostStep[] = [
  { id: '1', label: 'Analyse du ticket Zoho terminée',     status: 'done',    duration: '2s' },
  { id: '2', label: 'Consultation doc Notion via MCP',     status: 'done',    duration: '1s' },
  { id: '3', label: 'Écriture du composant React',         status: 'running' },
  { id: '4', label: 'Validation du schéma Neon',           status: 'pending' },
  { id: '5', label: 'Déploiement sur Vercel',              status: 'pending' },
]

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PanoptiqueePage() {
  const params = useParams<{ teamId: string }>()
  const router = useRouter()
  const teamId = params.teamId

  const [projects, setProjects]     = useState<StatusCard[]>([])
  const [loading, setLoading]       = useState(true)
  const [pulse]                     = useState<PulseEvent[]>(MOCK_PULSE)
  const [ghost]                     = useState<GhostStep[]>(MOCK_GHOST)
  const [command, setCommand]       = useState('')
  const [sending, setSending]       = useState(false)
  const [patterns]                  = useState(47)
  const [newPatterns]               = useState(3)
  const inputRef                    = useRef<HTMLInputElement>(null)

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch(`/api/zoho?action=listProjects`)
      const data = res.ok ? await res.json() : null
      const list: Project[] = Array.isArray(data?.projects)
        ? data.projects
        : Array.isArray(data)
        ? data
        : []
      setProjects(list.map(mockCard))
    } catch {
      setProjects([])
    } finally {
      setLoading(false)
    }
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

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!command.trim()) return
    setSending(true)
    // TODO: envoyer vers /api/agent avec contexte teamId
    await new Promise(r => setTimeout(r, 600))
    setCommand('')
    setSending(false)
  }

  return (
    <div className="space-y-4">

      {/* ── Zone C — Command Bar ─────────────────────────────────────── */}
      <form onSubmit={handleCommand}>
        <div className="flex items-center gap-2 p-3 border rounded-xl bg-muted/30 shadow-sm focus-within:ring-2 focus-within:ring-primary/30 transition-all">
          <Terminal className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="NeoBridge, … (⌘K)"
            value={command}
            onChange={e => setCommand(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <Button type="submit" size="sm" disabled={!command.trim() || sending} className="shrink-0">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">⌘K</span>
        </div>
      </form>

      {/* ── Zone A — Project Status Cards ────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Projets</h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/dashboard/${teamId}/new`}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Nouveau
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <p className="text-muted-foreground text-sm">Aucun projet disponible</p>
              <Button asChild className="mt-4" size="sm">
                <Link href={`/dashboard/${teamId}/new`}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Créer un projet
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {projects.map(p => (
              <Link key={p.id} href={`/dashboard/${teamId}/${p.id}/infrastructure`}>
                <Card className="hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer h-full group">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                          {p.name}
                        </h3>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{p.description}</p>
                        )}
                      </div>
                      <ConfidenceBadge score={p.confidence} />
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2.5">
                    {/* Deploy status */}
                    <div className="flex items-center gap-3 text-xs">
                      <span className="flex items-center gap-1.5">
                        <StatusDot status={p.vercel} />
                        <span className="text-muted-foreground">Vercel</span>
                        <span className="font-mono font-medium">{p.vercel}</span>
                      </span>
                      <span className="text-muted-foreground/40">•</span>
                      <span className="flex items-center gap-1.5">
                        <StatusDot status={p.railway} />
                        <span className="text-muted-foreground">Railway</span>
                        <span className="font-mono font-medium">{p.railway}</span>
                      </span>
                    </div>
                    {/* Metrics */}
                    <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                      <div className="rounded-md bg-muted/50 px-2 py-1 text-center">
                        <div className="font-semibold text-foreground">{p.neonLatency}ms</div>
                        <div className="text-muted-foreground">Neon</div>
                      </div>
                      <div className="rounded-md bg-muted/50 px-2 py-1 text-center">
                        <div className="font-semibold text-foreground">{p.temporalActive}</div>
                        <div className="text-muted-foreground">Workflows</div>
                      </div>
                      <div className="rounded-md bg-muted/50 px-2 py-1 text-center">
                        <div className="font-semibold text-foreground">{Math.round(p.tokensToday / 1000)}K</div>
                        <div className="text-muted-foreground">Tokens</div>
                      </div>
                    </div>
                    {/* Token bar */}
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Tokens IA</span>
                        <span>{Math.round(p.tokensToday / 1000)}K / {Math.round(p.tokenLimit / 1000)}K</span>
                      </div>
                      <div className="h-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${Math.min(100, (p.tokensToday / p.tokenLimit) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      {p.last_modified_time && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(p.last_modified_time), { addSuffix: true, locale: fr })}
                        </span>
                      )}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Zone B — Pulse + Ghost Dev ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Pulse Timeline */}
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
            <ScrollArea className="h-64">
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
                        {event.confidenceScore !== undefined && (
                          <ConfidenceBadge score={event.confidenceScore} />
                        )}
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
            <div className="space-y-2">
              {ghost.map(step => (
                <div key={step.id} className="flex items-center gap-2.5 text-xs">
                  {step.status === 'done'    && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                  {step.status === 'running' && <Loader2     className="h-3.5 w-3.5 text-blue-500 shrink-0 animate-spin" />}
                  {step.status === 'pending' && <div         className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />}
                  <span className={step.status === 'pending' ? 'text-muted-foreground/50' : ''}>
                    {step.label}
                  </span>
                  {step.duration && (
                    <span className="ml-auto text-muted-foreground/60 font-mono">{step.duration}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Knowledge Growth */}
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Brain className="h-3.5 w-3.5 text-violet-500" />
                <span>Knowledge Growth</span>
                <Badge variant="secondary" className="ml-auto text-[10px]">+{newPatterns} ce jour</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5 pl-5">
                <p>└── Déploiement Railway avec migration Drizzle</p>
                <p>└── Composant tableau comptable multi-devise</p>
                <p>└── Workflow Temporal avec retry exponentiel</p>
              </div>
              <div className="flex items-center gap-1.5 pl-5 pt-0.5">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="text-[11px] text-muted-foreground">
                  Base totale : <span className="font-semibold text-foreground">{patterns}</span> patterns
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

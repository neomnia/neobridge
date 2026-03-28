'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2, ExternalLink, Server, Plus,
  CheckCircle2, XCircle, Clock, AlertCircle,
  GitCommit as GitCommitIcon, FileText, Target, Bot,
  TrendingUp, DollarSign, Cpu, Database,
  Activity, Brain, Zap, ChevronRight, LayoutGrid,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ──────────────────────────────────────────────────────────────────────

interface SpendingData {
  vercel:    { current: number | null; period: string } | null
  neon:      { computeHours: number; period: string; daily?: { date: string; computeHours: number }[] } | null
  railway:   { current: number | null; period: string } | null
  anthropic: { current: number | null; inputTokens: number; outputTokens: number; period: string; daily?: { date: string; inputTokens: number; outputTokens: number }[] } | null
  openai:    { tokens: number; period: string; daily?: { date: string; tokens: number }[] } | null
}

interface VercelProject  { id: string; name: string; source: 'vercel';   url: string;  status: string; updatedAt: string | null; framework: string | null }
interface RailwayProject { id: string; name: string; source: 'railway';  url: string | null; status: string; updatedAt: string | null; services: string[]; environments: string[] }
interface PulseEvent { id: string; timestamp: Date; source: string; message: string; confidenceScore?: number }

// ─── Inline helpers ─────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: 'vercel' | 'railway' }) {
  return source === 'vercel'
    ? <Badge variant="outline" className="text-[10px] gap-1 px-1.5"><svg className="h-2.5 w-2.5" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg>Vercel</Badge>
    : <Badge variant="outline" className="text-[10px] gap-1 px-1.5"><Server className="h-2.5 w-2.5" />Railway</Badge>
}

function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/30" />
  return ok
    ? <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
    : <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
}

// ─── Mock pulse ─────────────────────────────────────────────────────────────────

const SOURCE_ICON: Record<string, React.ReactNode> = {
  zoho:     <Target        className="h-3.5 w-3.5 text-orange-500" />,
  github:   <GitCommitIcon className="h-3.5 w-3.5 text-gray-500" />,
  temporal: <Clock         className="h-3.5 w-3.5 text-purple-500" />,
  notion:   <FileText      className="h-3.5 w-3.5 text-gray-600" />,
  agent:    <Bot           className="h-3.5 w-3.5 text-blue-500" />,
}
function ConfidenceBadge({ score }: { score: number }) {
  const cls = score >= 95 ? 'bg-green-100 text-green-700 border-green-200' : score >= 70 ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-red-100 text-red-700 border-red-200'
  const dot = score >= 95 ? '🟢' : score >= 70 ? '🟠' : '🔴'
  return <Badge className={`${cls} text-[10px]`}>{dot} {score}%</Badge>
}
const MOCK_PULSE: PulseEvent[] = [
  { id:'1', timestamp: new Date(Date.now()-60000),   source:'agent',    message:'Claude : composant TableCompta généré et committé', confidenceScore:97 },
  { id:'2', timestamp: new Date(Date.now()-180000),  source:'github',   message:'3 commits automatiques — Fix: TVA Logic' },
  { id:'3', timestamp: new Date(Date.now()-300000),  source:'zoho',     message:'Nouveau jalon atteint : MVP Compta validé 🎯' },
  { id:'4', timestamp: new Date(Date.now()-600000),  source:'temporal', message:'Workflow #872 terminé : Déploiement Staging ✓' },
  { id:'5', timestamp: new Date(Date.now()-900000),  source:'notion',   message:'Roadmap mise à jour : Étape 4 débloquée 📓' },
]

// ─── Ghost Dev Monitor ──────────────────────────────────────────────────────────

const GHOST_STEPS = ['Analyse ticket Zoho','Consultation doc Notion via MCP','Écriture composant React','Validation schéma Neon','Déploiement Vercel']
function GhostDevMonitor() {
  const [done, setDone] = useState(2)
  useEffect(() => {
    if (done >= GHOST_STEPS.length) return
    const t = setTimeout(() => setDone(d => d + 1), 3500)
    return () => clearTimeout(t)
  }, [done])
  return (
    <div className="space-y-2">
      {GHOST_STEPS.map((label, i) => (
        <div key={i} className="flex items-center gap-2.5 text-xs">
          {i < done       && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
          {i === done && done < GHOST_STEPS.length && <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0" />}
          {i > done       && <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/30 shrink-0" />}
          <span className={i > done ? 'text-muted-foreground/50' : ''}>{label}</span>
        </div>
      ))}
      {done >= GHOST_STEPS.length && <p className="text-[11px] text-green-600 font-medium pt-1">✓ Ticket #42 livré</p>}
    </div>
  )
}

// ─── Spending skeleton ──────────────────────────────────────────────────────────

function SpendingSkeleton() {
  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded-full" />
        <Skeleton className="h-4 w-36" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => (
          <Card key={i} className="px-4 py-3">
            <Skeleton className="h-3 w-14 mb-2" />
            <Skeleton className="h-7 w-20" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="px-4 py-3"><Skeleton className="h-[100px] w-full" /></Card>
        <Card className="px-4 py-3"><Skeleton className="h-[100px] w-full" /></Card>
      </div>
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function PanoptiquePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [spending, setSpending]               = useState<SpendingData | null>(null)
  const [loadingSpending, setLoadingSpending] = useState(true)
  const [vercelProjects, setVP]               = useState<VercelProject[]>([])
  const [railwayProjects, setRP]              = useState<RailwayProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)

  const loadSpending = useCallback(async () => {
    setLoadingSpending(true)
    try {
      const r = await fetch('/api/dashboard/spending')
      if (r.ok) setSpending(await r.json())
    } catch {} finally { setLoadingSpending(false) }
  }, [])

  const loadProjects = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/projects')
      if (r.ok) { const d = await r.json(); setVP(d.vercel ?? []); setRP(d.railway ?? []) }
    } catch {} finally { setLoadingProjects(false) }
  }, [])

  useEffect(() => { loadSpending() }, [loadSpending])
  useEffect(() => { loadProjects() }, [loadProjects])

  const recentProjects: (VercelProject | RailwayProject)[] =
    [...vercelProjects, ...railwayProjects]
      .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))
      .slice(0, 4)

  // API health derived from spending (null = not configured)
  const apiHealth = {
    vercel:    spending ? spending.vercel   !== null : null,
    railway:   spending ? spending.railway  !== null : null,
    neon:      spending ? spending.neon     !== null : null,
    anthropic: spending ? spending.anthropic !== null : null,
    openai:    spending ? spending.openai   !== null : null,
  }

  return (
    <div className="space-y-6">

      {/* ── 1. Spending ──────────────────────────────────────────────── */}
      {loadingSpending ? <SpendingSkeleton /> : (
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Dépenses du mois</h2>
          </div>

          {/* Cost cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <svg className="h-3 w-3" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg>Vercel
              </div>
              <p className="text-lg font-bold">
                {spending?.vercel?.current != null ? `$${spending.vercel.current.toFixed(2)}` : <span className="text-muted-foreground text-sm">—</span>}
              </p>
              {spending?.vercel?.period && <p className="text-[10px] text-muted-foreground mt-0.5">{spending.vercel.period}</p>}
            </Card>
            <Card className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Server className="h-3 w-3" />Railway
              </div>
              <p className="text-lg font-bold">
                {spending?.railway?.current != null ? `$${spending.railway.current.toFixed(2)}` : <span className="text-muted-foreground text-sm">—</span>}
              </p>
              {spending?.railway?.period && <p className="text-[10px] text-muted-foreground mt-0.5">{spending.railway.period}</p>}
            </Card>
            <Card className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <Database className="h-3 w-3" />Neon
              </div>
              <p className="text-lg font-bold">
                {spending?.neon?.computeHours != null ? `${spending.neon.computeHours.toFixed(1)}h` : <span className="text-muted-foreground text-sm">—</span>}
              </p>
              {spending?.neon?.period && <p className="text-[10px] text-muted-foreground mt-0.5">compute · {spending.neon.period}</p>}
            </Card>
            <Card className="px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                <TrendingUp className="h-3 w-3" />Anthropic
              </div>
              <p className="text-lg font-bold">
                {spending?.anthropic?.current != null ? `$${spending.anthropic.current.toFixed(2)}` : <span className="text-muted-foreground text-sm">—</span>}
              </p>
              {spending?.anthropic?.period && <p className="text-[10px] text-muted-foreground mt-0.5">{spending.anthropic.period}</p>}
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3.5 w-3.5" />Anthropic — tokens / jour
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {spending?.anthropic?.daily && spending.anthropic.daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={spending.anthropic.daily} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                      <Tooltip contentStyle={{ fontSize: 11 }} formatter={(val: number, name: string) => [val.toLocaleString(), name === 'inputTokens' ? 'Input' : 'Output']} />
                      <Area type="monotone" dataKey="inputTokens"  stroke="#8b5cf6" fill="url(#gradIn)"  strokeWidth={1.5} dot={false} />
                      <Area type="monotone" dataKey="outputTokens" stroke="#06b6d4" fill="url(#gradOut)" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Cpu className="h-3.5 w-3.5" />OpenAI tokens · Neon compute
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                {spending?.openai?.daily && spending.openai.daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={spending.openai.daily} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                      <Tooltip contentStyle={{ fontSize: 11 }} formatter={(val: number) => [val.toLocaleString(), 'Tokens']} />
                      <Bar dataKey="tokens" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : spending?.neon?.daily && spending.neon.daily.length > 0 ? (
                  <ResponsiveContainer width="100%" height={100}>
                    <AreaChart data={spending.neon.daily} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradNeon" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                      <Tooltip contentStyle={{ fontSize: 11 }} formatter={(val: number) => [`${val.toFixed(2)}h`, 'Compute']} />
                      <Area type="monotone" dataKey="computeHours" stroke="#10b981" fill="url(#gradNeon)" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[100px] flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── 2. État des API ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">État des services</h2>
          {loadingSpending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'vercel',    label: 'Vercel',    icon: <svg className="h-3 w-3" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg> },
            { key: 'railway',   label: 'Railway',   icon: <Server    className="h-3 w-3" /> },
            { key: 'neon',      label: 'Neon DB',   icon: <Database  className="h-3 w-3" /> },
            { key: 'anthropic', label: 'Anthropic', icon: <TrendingUp className="h-3 w-3" /> },
            { key: 'openai',    label: 'OpenAI',    icon: <Brain     className="h-3 w-3" /> },
          ] as const).map(s => (
            <div key={s.key} className="flex items-center gap-2 px-3 py-1.5 border rounded-lg text-xs">
              {s.icon}
              <span>{s.label}</span>
              <StatusDot ok={apiHealth[s.key]} />
            </div>
          ))}
          <Link href="/admin/api" className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed rounded-lg text-xs text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors">
            Gérer les clés <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* ── 3. Projets récents ────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Projets récents</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="outline" className="h-7 text-xs">
              <Link href={`/dashboard/${teamId}/new`}><Plus className="h-3 w-3 mr-1" />Nouveau</Link>
            </Button>
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link href={`/dashboard/${teamId}/projects`}>Voir tout <ChevronRight className="h-3 w-3 ml-0.5" /></Link>
            </Button>
          </div>
        </div>

        {loadingProjects ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {[0,1,2,3].map(i => <Card key={i} className="px-4 py-4"><Skeleton className="h-4 w-3/4 mb-2" /><Skeleton className="h-3 w-1/2" /></Card>)}
          </div>
        ) : recentProjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-8 text-center">
              <p className="text-muted-foreground text-sm font-medium">Aucun projet</p>
              <p className="text-xs text-muted-foreground mt-1">Configurez Vercel et Railway dans <Link href="/admin/api" className="text-primary hover:underline">Admin → API Management</Link></p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {recentProjects.map(p => {
              const href = p.source === 'vercel'
                ? (p as VercelProject).url
                : ((p as RailwayProject).url ?? '#')
              return (
                <a
                  key={`${p.source}-${p.id}`}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block group"
                >
                  <Card className="hover:border-primary/40 hover:shadow-sm transition-all h-full">
                    <CardContent className="px-4 py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-sm truncate group-hover:text-primary transition-colors">{p.name}</span>
                        <SourceBadge source={p.source} />
                      </div>
                      {'framework' in p && p.framework && <p className="text-[11px] text-muted-foreground">{p.framework}</p>}
                      {'services' in p && (p as RailwayProject).services.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {(p as RailwayProject).services.slice(0,3).map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-0.5">
                        {p.updatedAt && <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: fr })}</span>}
                        <ExternalLink className="h-3 w-3 text-muted-foreground/40 ml-auto" />
                      </div>
                    </CardContent>
                  </Card>
                </a>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 4. Pulse + Ghost Dev ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-primary" />Le Pulse
              <span className="ml-auto flex items-center gap-1 text-[10px] font-normal text-green-600">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />Live
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <ScrollArea className="h-48">
              <div className="space-y-3">
                {MOCK_PULSE.map(e => (
                  <div key={e.id} className="flex items-start gap-2.5">
                    <div className="mt-0.5 shrink-0">{SOURCE_ICON[e.source]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug">{e.message}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(e.timestamp, { addSuffix: true, locale: fr })}</span>
                        {e.confidenceScore !== undefined && <ConfidenceBadge score={e.confidenceScore} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4 text-blue-500" />Ghost Dev Monitor
              <Badge variant="outline" className="ml-auto text-[10px] font-normal">Ticket #42</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-4">
            <GhostDevMonitor />
            <div className="border-t pt-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium">
                <Brain className="h-3.5 w-3.5 text-violet-500" />Knowledge Growth
                <Badge variant="secondary" className="ml-auto text-[10px]">+3 ce jour</Badge>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-0.5 pl-5">
                <p>└── Déploiement Railway avec migration Drizzle</p>
                <p>└── Composant tableau comptable multi-devise</p>
                <p>└── Workflow Temporal avec retry exponentiel</p>
              </div>
              <div className="flex items-center gap-1.5 pl-5 pt-0.5">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="text-[11px] text-muted-foreground">Base totale : <span className="font-semibold text-foreground">47</span> patterns</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

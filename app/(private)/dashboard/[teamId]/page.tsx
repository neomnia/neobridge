'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Loader2, ExternalLink, Server, CheckCircle2, XCircle, Clock, AlertCircle,
  TrendingUp, DollarSign, Cpu, Database, Activity, ChevronRight,
  GitBranch, GitCommit, Rocket,
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
interface Deployment     { id: string; name: string; source: 'vercel' | 'railway'; url: string | null; state: string; target: string; branch: string | null; commit: string | null; commitSha: string | null; creator: string | null; service?: string | null; createdAt: string | null }

// ─── Status helpers ─────────────────────────────────────────────────────────────

const STATE_CFG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  READY:    { label: 'Ready',    icon: <CheckCircle2 className="h-3 w-3 text-green-500" />,  cls: 'text-green-700 bg-green-50 border-green-200' },
  BUILDING: { label: 'Building', icon: <Loader2 className="h-3 w-3 text-yellow-500 animate-spin" />, cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  ERROR:    { label: 'Error',    icon: <XCircle className="h-3 w-3 text-red-500" />,         cls: 'text-red-700 bg-red-50 border-red-200' },
  CANCELED: { label: 'Canceled', icon: <AlertCircle className="h-3 w-3 text-gray-400" />,   cls: 'text-gray-600 bg-gray-50 border-gray-200' },
  QUEUED:   { label: 'Queued',   icon: <Clock className="h-3 w-3 text-blue-400" />,         cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  RUNNING:  { label: 'Running',  icon: <CheckCircle2 className="h-3 w-3 text-green-500" />, cls: 'text-green-700 bg-green-50 border-green-200' },
  SUCCESS:  { label: 'Success',  icon: <CheckCircle2 className="h-3 w-3 text-green-500" />, cls: 'text-green-700 bg-green-50 border-green-200' },
  FAILED:   { label: 'Failed',   icon: <XCircle className="h-3 w-3 text-red-500" />,        cls: 'text-red-700 bg-red-50 border-red-200' },
  CRASHED:  { label: 'Crashed',  icon: <XCircle className="h-3 w-3 text-red-500" />,        cls: 'text-red-700 bg-red-50 border-red-200' },
}
function StateChip({ state }: { state: string }) {
  const s = STATE_CFG[state] ?? { label: state, icon: <Clock className="h-3 w-3" />, cls: 'text-gray-600 bg-gray-50 border-gray-200' }
  return <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${s.cls}`}>{s.icon}{s.label}</span>
}
function SourceBadge({ source }: { source: 'vercel' | 'railway' }) {
  return source === 'vercel'
    ? <Badge variant="outline" className="text-[10px] gap-1 px-1.5 font-normal"><svg className="h-2.5 w-2.5" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg>Vercel</Badge>
    : <Badge variant="outline" className="text-[10px] gap-1 px-1.5 font-normal"><Server className="h-2.5 w-2.5" />Railway</Badge>
}
function StatusDot({ ok }: { ok: boolean | null }) {
  if (ok === null) return <span className="h-2 w-2 rounded-full bg-muted-foreground/30 inline-block" />
  return ok ? <span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> : <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
}

// ─── Skeleton ───────────────────────────────────────────────────────────────────

function SpendingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><Skeleton className="h-4 w-4 rounded-full" /><Skeleton className="h-4 w-36" /></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <Card key={i} className="px-4 py-3"><Skeleton className="h-3 w-14 mb-2" /><Skeleton className="h-7 w-20" /></Card>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="px-4 py-3"><Skeleton className="h-[100px] w-full" /></Card>
        <Card className="px-4 py-3"><Skeleton className="h-[100px] w-full" /></Card>
      </div>
    </div>
  )
}
function ProjectsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {[0,1,2,3,4,5].map(i => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-start justify-between"><Skeleton className="h-4 w-32" /><Skeleton className="h-5 w-14 rounded" /></div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-40" />
        </Card>
      ))}
    </div>
  )
}

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function PanoptiquePage() {
  const { teamId } = useParams<{ teamId: string }>()

  const [spending,         setSpending]         = useState<SpendingData | null>(null)
  const [loadingSpending,  setLoadingSpending]  = useState(true)
  const [vercelProjects,   setVP]               = useState<VercelProject[]>([])
  const [railwayProjects,  setRP]               = useState<RailwayProject[]>([])
  const [loadingProjects,  setLoadingProjects]  = useState(true)
  const [deployments,      setDeployments]      = useState<Deployment[]>([])
  const [loadingDeps,      setLoadingDeps]      = useState(true)

  const loadSpending = useCallback(async () => {
    try { const r = await fetch('/api/dashboard/spending'); if (r.ok) setSpending(await r.json()) }
    catch {} finally { setLoadingSpending(false) }
  }, [])

  const loadProjects = useCallback(async () => {
    try { const r = await fetch('/api/dashboard/projects'); if (r.ok) { const d = await r.json(); setVP(d.vercel ?? []); setRP(d.railway ?? []) } }
    catch {} finally { setLoadingProjects(false) }
  }, [])

  const loadDeployments = useCallback(async () => {
    try { const r = await fetch('/api/dashboard/deployments'); if (r.ok) { const d = await r.json(); setDeployments(d.deployments ?? []) } }
    catch {} finally { setLoadingDeps(false) }
  }, [])

  useEffect(() => {
    loadSpending()
    loadProjects()
    loadDeployments()
    const i = setInterval(loadProjects, 30000)
    return () => clearInterval(i)
  }, [loadSpending, loadProjects, loadDeployments])

  const allProjects = [...vercelProjects, ...railwayProjects]
  const apiHealth = {
    vercel:    spending ? spending.vercel    !== null : null,
    railway:   spending ? spending.railway   !== null : null,
    neon:      spending ? spending.neon      !== null : null,
    anthropic: spending ? spending.anthropic !== null : null,
    openai:    spending ? spending.openai    !== null : null,
  }
  const recentDeps = deployments.slice(0, 8)

  return (
    <div className="space-y-8">

      {/* ── 1. Dépenses ──────────────────────────────────────────────── */}
      {loadingSpending ? <SpendingSkeleton /> : (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <DollarSign className="h-4 w-4 text-muted-foreground" />Dépenses du mois
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { label: 'Vercel',    val: spending?.vercel?.current,    period: spending?.vercel?.period,    icon: <svg className="h-3 w-3" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg> },
              { label: 'Railway',   val: spending?.railway?.current,   period: spending?.railway?.period,   icon: <Server className="h-3 w-3" /> },
              { label: 'Neon',      val: null,                          period: spending?.neon?.period,      icon: <Database className="h-3 w-3" />, extra: spending?.neon?.computeHours != null ? `${spending.neon.computeHours.toFixed(1)}h compute` : null },
              { label: 'Anthropic', val: spending?.anthropic?.current, period: spending?.anthropic?.period, icon: <TrendingUp className="h-3 w-3" /> },
            ] as const).map(c => (
              <Card key={c.label} className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">{c.icon}{c.label}</div>
                <p className="text-lg font-bold">
                  {c.extra ? c.extra : c.val != null ? `$${(c.val as number).toFixed(2)}` : <span className="text-muted-foreground text-sm">—</span>}
                </p>
                {c.period && <p className="text-[10px] text-muted-foreground mt-0.5">{c.period}</p>}
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" />Anthropic — tokens / jour</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                {spending?.anthropic?.daily?.length ? (
                  <ResponsiveContainer width="100%" height={90}>
                    <AreaChart data={spending.anthropic.daily} margin={{ top:4, right:0, left:0, bottom:0 }}>
                      <defs>
                        <linearGradient id="gIn"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                      </defs>
                      <XAxis dataKey="date" tick={{ fontSize:9 }} tickFormatter={v => v.slice(5)} />
                      <Tooltip contentStyle={{ fontSize:11 }} formatter={(v:number,n:string) => [v.toLocaleString(), n==='inputTokens'?'Input':'Output']} />
                      <Area type="monotone" dataKey="inputTokens"  stroke="#8b5cf6" fill="url(#gIn)"  strokeWidth={1.5} dot={false} />
                      <Area type="monotone" dataKey="outputTokens" stroke="#06b6d4" fill="url(#gOut)" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-[90px] flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-1 pt-3 px-4"><CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Cpu className="h-3.5 w-3.5" />OpenAI tokens · Neon compute</CardTitle></CardHeader>
              <CardContent className="px-4 pb-3">
                {spending?.openai?.daily?.length ? (
                  <ResponsiveContainer width="100%" height={90}>
                    <BarChart data={spending.openai.daily} margin={{ top:4, right:0, left:0, bottom:0 }}>
                      <XAxis dataKey="date" tick={{ fontSize:9 }} tickFormatter={v => v.slice(5)} />
                      <Tooltip contentStyle={{ fontSize:11 }} formatter={(v:number) => [v.toLocaleString(),'Tokens']} />
                      <Bar dataKey="tokens" fill="#10b981" radius={[2,2,0,0]} maxBarSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : spending?.neon?.daily?.length ? (
                  <ResponsiveContainer width="100%" height={90}>
                    <AreaChart data={spending.neon.daily} margin={{ top:4, right:0, left:0, bottom:0 }}>
                      <defs><linearGradient id="gNeon" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                      <XAxis dataKey="date" tick={{ fontSize:9 }} tickFormatter={v => v.slice(5)} />
                      <Tooltip contentStyle={{ fontSize:11 }} formatter={(v:number) => [`${v.toFixed(2)}h`,'Compute']} />
                      <Area type="monotone" dataKey="computeHours" stroke="#10b981" fill="url(#gNeon)" strokeWidth={1.5} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : <div className="h-[90px] flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>}
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* ── 2. Cockpit d'infrastructure ───────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Activity className="h-4 w-4 text-muted-foreground" />Cockpit d'infrastructure
            {(loadingSpending || loadingProjects) && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </h2>
          <Link href="/admin/api" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Gérer les clés <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">

          {/* Vercel */}
          {(() => {
            const ok = apiHealth.vercel
            const lastDep = deployments.find(d => d.source === 'vercel')
            const vpCount = vercelProjects.length
            return (
              <Card className={`px-4 py-3 border-l-4 ${ok ? 'border-l-green-500' : ok === false ? 'border-l-red-400' : 'border-l-muted'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg>
                    <span className="text-sm font-semibold">Vercel</span>
                  </div>
                  <StatusDot ok={ok} />
                </div>
                {ok ? (
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Rocket className="h-3 w-3" />
                      <span className="text-foreground font-medium">{vpCount} projet{vpCount > 1 ? 's' : ''}</span>
                      {vercelProjects.filter(p => p.status === 'READY').length > 0 && (
                        <span className="text-green-600">· {vercelProjects.filter(p => p.status === 'READY').length} ready</span>
                      )}
                    </p>
                    {lastDep && (
                      <p className="flex items-center gap-1.5 truncate">
                        <GitCommit className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lastDep.name}</span>
                        <StateChip state={lastDep.state} />
                      </p>
                    )}
                    {lastDep?.commitSha && (
                      <p className="flex items-center gap-1.5 font-mono text-[10px]">
                        <GitBranch className="h-3 w-3 shrink-0" />
                        {lastDep.branch && <span>{lastDep.branch}</span>}
                        <span className="opacity-60">#{lastDep.commitSha}</span>
                      </p>
                    )}
                    {spending?.vercel?.current != null && (
                      <p className="flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-foreground font-medium">${spending.vercel.current.toFixed(2)}</span>
                        <span>{spending.vercel.period}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Non configuré — <Link href="/admin/api" className="text-primary hover:underline">Ajouter le token</Link></p>
                )}
              </Card>
            )
          })()}

          {/* Railway */}
          {(() => {
            const ok = apiHealth.railway
            const lastDep = deployments.find(d => d.source === 'railway')
            const totalServices = railwayProjects.reduce((acc, p) => acc + p.services.length, 0)
            const allEnvs = [...new Set(railwayProjects.flatMap(p => p.environments))]
            return (
              <Card className={`px-4 py-3 border-l-4 ${ok ? 'border-l-green-500' : ok === false ? 'border-l-red-400' : 'border-l-muted'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    <span className="text-sm font-semibold">Railway</span>
                  </div>
                  <StatusDot ok={ok} />
                </div>
                {ok ? (
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Rocket className="h-3 w-3" />
                      <span className="text-foreground font-medium">{railwayProjects.length} projet{railwayProjects.length > 1 ? 's' : ''}</span>
                      {totalServices > 0 && <span>· {totalServices} service{totalServices > 1 ? 's' : ''}</span>}
                    </p>
                    {allEnvs.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        {allEnvs.slice(0, 4).map(e => <Badge key={e} variant="secondary" className="text-[10px] font-normal">{e}</Badge>)}
                      </div>
                    )}
                    {lastDep && (
                      <p className="flex items-center gap-1.5 truncate">
                        <GitCommit className="h-3 w-3 shrink-0" />
                        <span className="truncate">{lastDep.name}</span>
                        {lastDep.service && <span className="opacity-60">/{lastDep.service}</span>}
                        <StateChip state={lastDep.state} />
                      </p>
                    )}
                    {spending?.railway?.current != null && (
                      <p className="flex items-center gap-1.5">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-foreground font-medium">${spending.railway.current.toFixed(2)}</span>
                        <span>{spending.railway.period}</span>
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Non configuré — <Link href="/admin/api" className="text-primary hover:underline">Ajouter le token</Link></p>
                )}
              </Card>
            )
          })()}

          {/* Neon */}
          {(() => {
            const ok = apiHealth.neon
            const computeH = spending?.neon?.computeHours
            return (
              <Card className={`px-4 py-3 border-l-4 ${ok ? 'border-l-green-500' : ok === false ? 'border-l-red-400' : 'border-l-muted'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    <span className="text-sm font-semibold">Neon DB</span>
                  </div>
                  <StatusDot ok={ok} />
                </div>
                {ok ? (
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <Cpu className="h-3 w-3" />
                      <span className="text-foreground font-medium">{computeH != null ? `${computeH.toFixed(2)}h compute` : '—'}</span>
                      {spending?.neon?.period && <span>{spending.neon.period}</span>}
                    </p>
                    {spending?.neon?.daily?.length ? (
                      <ResponsiveContainer width="100%" height={40}>
                        <AreaChart data={spending.neon.daily.slice(-7)} margin={{ top:2, right:0, left:0, bottom:0 }}>
                          <defs><linearGradient id="gNeonC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                          <Tooltip contentStyle={{ fontSize:10 }} formatter={(v:number) => [`${v.toFixed(2)}h`,'Compute']} />
                          <Area type="monotone" dataKey="computeHours" stroke="#10b981" fill="url(#gNeonC)" strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Non configuré — <Link href="/admin/api" className="text-primary hover:underline">Ajouter le token</Link></p>
                )}
              </Card>
            )
          })()}

          {/* Anthropic */}
          {(() => {
            const ok = apiHealth.anthropic
            const a = spending?.anthropic
            return (
              <Card className={`px-4 py-3 border-l-4 ${ok ? 'border-l-purple-500' : ok === false ? 'border-l-red-400' : 'border-l-muted'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">Anthropic</span>
                  </div>
                  <StatusDot ok={ok} />
                </div>
                {ok && a ? (
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-foreground font-medium">{a.current != null ? `$${a.current.toFixed(2)}` : '—'}</span>
                      <span>{a.period}</span>
                    </p>
                    <p className="flex items-center gap-3">
                      <span>↑ {(a.inputTokens / 1000).toFixed(1)}k in</span>
                      <span>↓ {(a.outputTokens / 1000).toFixed(1)}k out</span>
                    </p>
                    {a.daily?.length ? (
                      <ResponsiveContainer width="100%" height={40}>
                        <AreaChart data={a.daily.slice(-7)} margin={{ top:2, right:0, left:0, bottom:0 }}>
                          <defs><linearGradient id="gAnthC" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient></defs>
                          <Tooltip contentStyle={{ fontSize:10 }} formatter={(v:number) => [v.toLocaleString(),'tokens']} />
                          <Area type="monotone" dataKey="outputTokens" stroke="#8b5cf6" fill="url(#gAnthC)" strokeWidth={1.5} dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                ) : ok === false ? (
                  <p className="text-xs text-muted-foreground mt-1">Non configuré — <Link href="/admin/api" className="text-primary hover:underline">Ajouter la clé</Link></p>
                ) : <p className="text-xs text-muted-foreground mt-1">Chargement…</p>}
              </Card>
            )
          })()}

          {/* OpenAI */}
          {(() => {
            const ok = apiHealth.openai
            const o = spending?.openai
            return (
              <Card className={`px-4 py-3 border-l-4 ${ok ? 'border-l-green-500' : ok === false ? 'border-l-red-400' : 'border-l-muted'}`}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    <span className="text-sm font-semibold">OpenAI</span>
                  </div>
                  <StatusDot ok={ok} />
                </div>
                {ok && o ? (
                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3" />
                      <span className="text-foreground font-medium">{(o.tokens / 1000).toFixed(1)}k tokens</span>
                      <span>{o.period}</span>
                    </p>
                    {o.daily?.length ? (
                      <ResponsiveContainer width="100%" height={40}>
                        <BarChart data={o.daily.slice(-7)} margin={{ top:2, right:0, left:0, bottom:0 }}>
                          <Tooltip contentStyle={{ fontSize:10 }} formatter={(v:number) => [v.toLocaleString(),'tokens']} />
                          <Bar dataKey="tokens" fill="#10b981" radius={[2,2,0,0]} maxBarSize={10} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : null}
                  </div>
                ) : ok === false ? (
                  <p className="text-xs text-muted-foreground mt-1">Non configuré — <Link href="/admin/api" className="text-primary hover:underline">Ajouter la clé</Link></p>
                ) : <p className="text-xs text-muted-foreground mt-1">Chargement…</p>}
              </Card>
            )
          })()}

        </div>
      </section>

      {/* ── 3. Modules d'environnement ────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Rocket className="h-4 w-4 text-muted-foreground" />
            Environnements
            {!loadingProjects && <span className="text-xs font-normal text-muted-foreground ml-1">({allProjects.length})</span>}
          </h2>
          <Link href={`/dashboard/${teamId}/projects`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Déploiements &amp; Logs <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {loadingProjects ? <ProjectsSkeleton /> : allProjects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center py-10 text-center">
              <p className="text-sm text-muted-foreground font-medium">Aucun environnement trouvé</p>
              <p className="text-xs text-muted-foreground mt-1">Configurez Vercel et Railway dans <Link href="/admin/api" className="text-primary hover:underline">Admin → API Management</Link></p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {allProjects.map(p => {
              const slug = `${p.source}-${p.id}`
              const externalUrl = p.source === 'vercel' ? (p as VercelProject).url : ((p as RailwayProject).url ?? null)
              return (
                <Card key={`${p.source}-${p.id}`} className="hover:border-primary/40 hover:shadow-sm transition-all group flex flex-col">
                  <CardContent className="px-4 pt-4 pb-3 flex flex-col gap-2 flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.name}</h3>
                        {'framework' in p && (p as VercelProject).framework && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">{(p as VercelProject).framework}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <SourceBadge source={p.source} />
                        <StateChip state={p.status} />
                      </div>
                    </div>

                    {/* Railway services */}
                    {'services' in p && (p as RailwayProject).services.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(p as RailwayProject).services.slice(0, 4).map(s => (
                          <Badge key={s} variant="secondary" className="text-[10px] font-normal">{s}</Badge>
                        ))}
                        {(p as RailwayProject).services.length > 4 && (
                          <Badge variant="outline" className="text-[10px] font-normal">+{(p as RailwayProject).services.length - 4}</Badge>
                        )}
                      </div>
                    )}

                    {/* Railway environments */}
                    {'environments' in p && (p as RailwayProject).environments.length > 0 && (
                      <div className="flex gap-1">
                        {(p as RailwayProject).environments.map(e => (
                          <Badge key={e} variant="outline" className="text-[10px] font-normal">{e}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-auto pt-2 border-t">
                      {p.updatedAt && (
                        <span className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: fr })}
                        </span>
                      )}
                      <div className="flex items-center gap-2 ml-auto">
                        {externalUrl && (
                          <a href={externalUrl} target="_blank" rel="noopener noreferrer"
                            className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                            onClick={e => e.stopPropagation()}>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                        <Link href={`/dashboard/${teamId}/projects/${slug}`}
                          className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors">
                          Détails <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>

      {/* ── 4. Derniers déploiements ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <GitCommit className="h-4 w-4 text-muted-foreground" />Derniers déploiements
            {loadingDeps && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </h2>
          <Link href={`/dashboard/${teamId}/projects`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
            Voir tout <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {!loadingDeps && recentDeps.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">Aucun déploiement — configurez Vercel et Railway</p>
        ) : loadingDeps ? (
          <div className="border rounded-lg divide-y">
            {[0,1,2,3].map(i => <div key={i} className="flex items-center gap-4 px-4 py-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-32 ml-2" /><Skeleton className="h-4 w-16 ml-auto" /></div>)}
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden divide-y">
            {recentDeps.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors text-sm">
                <SourceBadge source={d.source} />
                <span className="font-medium truncate max-w-[140px]">{d.name}</span>
                {d.service && <span className="text-xs text-muted-foreground truncate max-w-[80px]">/ {d.service}</span>}
                <StateChip state={d.state} />
                <Badge variant="outline" className={`text-[10px] hidden sm:inline-flex ${d.target === 'production' ? 'border-purple-200 text-purple-700' : 'text-muted-foreground'}`}>{d.target}</Badge>
                <div className="flex items-center gap-2 ml-auto shrink-0 text-[11px] text-muted-foreground">
                  {d.branch && <span className="hidden md:flex items-center gap-1"><GitBranch className="h-3 w-3" />{d.branch}</span>}
                  {d.commitSha && <span className="hidden lg:flex items-center gap-1"><GitCommit className="h-3 w-3" />{d.commitSha}</span>}
                  {d.createdAt && <span>{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true, locale: fr })}</span>}
                  {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Loader2, ExternalLink, Server, CheckCircle2, XCircle, Clock, AlertCircle,
  GitBranch, GitCommit, User, ChevronRight, LayoutGrid, Rocket, ScrollText,
  TrendingUp, DollarSign, Cpu, Database, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AreaChart, Area, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'deployments' | 'logs' | 'costs'

interface VercelProject  { id: string; name: string; source: 'vercel';   url: string;  status: string; updatedAt: string | null; framework: string | null }
interface RailwayProject { id: string; name: string; source: 'railway';  url: string | null; status: string; updatedAt: string | null; services: string[]; environments: string[] }
type AnyProject = VercelProject | RailwayProject

interface Deployment { id: string; name: string; source: 'vercel' | 'railway'; url: string | null; state: string; target: string; branch: string | null; commit: string | null; commitSha: string | null; creator: string | null; service?: string | null; createdAt: string | null }
interface LogEntry    { id: string; source: 'vercel'; project: string; deploymentId: string; text: string; level: 'info' | 'warn' | 'error'; createdAt: string }
interface SpendingData {
  vercel:    { current: number | null; period: string } | null
  neon:      { computeHours: number; period: string; daily?: { date: string; computeHours: number }[] } | null
  railway:   { current: number | null; period: string; cpu?: number | null; memory?: number | null } | null
  anthropic: { current: number | null; inputTokens: number; outputTokens: number; period: string; daily?: { date: string; inputTokens: number; outputTokens: number }[] } | null
  openai:    { tokens: number; period: string; daily?: { date: string; tokens: number }[] } | null
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

const STATE_CFG: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  READY:    { label: 'Ready',    icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,  cls: 'text-green-700 bg-green-50 border-green-200' },
  BUILDING: { label: 'Building', icon: <Loader2 className="h-3.5 w-3.5 text-yellow-500 animate-spin" />, cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  ERROR:    { label: 'Error',    icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,         cls: 'text-red-700 bg-red-50 border-red-200' },
  CANCELED: { label: 'Canceled', icon: <AlertCircle className="h-3.5 w-3.5 text-gray-400" />,   cls: 'text-gray-600 bg-gray-50 border-gray-200' },
  QUEUED:   { label: 'Queued',   icon: <Clock className="h-3.5 w-3.5 text-blue-400" />,         cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  RUNNING:  { label: 'Running',  icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />, cls: 'text-green-700 bg-green-50 border-green-200' },
  SUCCESS:  { label: 'Success',  icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />, cls: 'text-green-700 bg-green-50 border-green-200' },
  FAILED:   { label: 'Failed',   icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,        cls: 'text-red-700 bg-red-50 border-red-200' },
  CRASHED:  { label: 'Crashed',  icon: <XCircle className="h-3.5 w-3.5 text-red-500" />,        cls: 'text-red-700 bg-red-50 border-red-200' },
}
function StateChip({ state }: { state: string }) {
  const s = STATE_CFG[state] ?? { label: state, icon: <Clock className="h-3.5 w-3.5" />, cls: 'text-gray-600 bg-gray-50 border-gray-200' }
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${s.cls}`}>{s.icon}{s.label}</span>
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { teamId, slug } = useParams<{ teamId: string; slug: string }>()

  // Parse slug: "vercel-prj_xxx" or "railway-uuid"
  const dashIdx = slug.indexOf('-')
  const source  = slug.slice(0, dashIdx) as 'vercel' | 'railway'
  const projId  = slug.slice(dashIdx + 1)

  const [tab,           setTab]           = useState<Tab>('overview')
  const [project,       setProject]       = useState<AnyProject | null>(null)
  const [deployments,   setDeployments]   = useState<Deployment[]>([])
  const [logs,          setLogs]          = useState<LogEntry[]>([])
  const [spending,      setSpending]      = useState<SpendingData | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [loadingDeps,   setLoadingDeps]   = useState(false)
  const [loadingLogs,   setLoadingLogs]   = useState(false)
  const [loadingCosts,  setLoadingCosts]  = useState(false)

  // Load project info
  const loadProject = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/projects')
      if (!r.ok) return
      const d = await r.json()
      const all: AnyProject[] = [...(d.vercel ?? []), ...(d.railway ?? [])]
      const found = all.find(p => p.id === projId && p.source === source)
      if (found) setProject(found)
    } catch {} finally { setLoading(false) }
  }, [projId, source])

  // Load deployments for this project
  const loadDeployments = useCallback(async () => {
    if (deployments.length) return
    setLoadingDeps(true)
    try {
      const r = await fetch('/api/dashboard/deployments')
      if (!r.ok) return
      const d = await r.json()
      const filtered = (d.deployments ?? []).filter((dep: Deployment) =>
        dep.source === source && dep.name === project?.name
      )
      setDeployments(filtered)
    } catch {} finally { setLoadingDeps(false) }
  }, [deployments.length, project?.name, source])

  // Load logs
  const loadLogs = useCallback(async () => {
    if (logs.length) return
    setLoadingLogs(true)
    try {
      const r = await fetch('/api/dashboard/logs')
      if (!r.ok) return
      const d = await r.json()
      setLogs((d.logs ?? []).filter((l: LogEntry) => l.project === project?.name))
    } catch {} finally { setLoadingLogs(false) }
  }, [logs.length, project?.name])

  // Load costs
  const loadCosts = useCallback(async () => {
    setLoadingCosts(true)
    try {
      const r = await fetch('/api/dashboard/spending')
      if (r.ok) setSpending(await r.json())
    } catch {} finally { setLoadingCosts(false) }
  }, [])

  useEffect(() => { loadProject() }, [loadProject])
  useEffect(() => { if (tab === 'deployments' && project) loadDeployments() }, [tab, project, loadDeployments])
  useEffect(() => { if (tab === 'logs' && project) loadLogs() }, [tab, project, loadLogs])
  useEffect(() => { if (tab === 'costs') loadCosts() }, [tab, loadCosts])

  const isVercel  = source === 'vercel'
  const externalUrl = project && isVercel ? (project as VercelProject).url : null

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview',     label: 'Overview',     icon: <LayoutGrid  className="h-4 w-4" /> },
    { id: 'deployments',  label: 'Deployments',  icon: <Rocket      className="h-4 w-4" /> },
    { id: 'logs',         label: 'Logs',         icon: <ScrollText  className="h-4 w-4" /> },
    { id: 'costs',        label: 'Coûts',        icon: <DollarSign  className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-0">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-5">
        <Link href={`/dashboard/${teamId}`} className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={`/dashboard/${teamId}/projects`} className="hover:text-foreground transition-colors">Projets</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">{loading ? '…' : (project?.name ?? projId)}</span>
      </nav>

      {/* Project header */}
      {loading ? (
        <div className="border-b pb-5 mb-5 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
      ) : (
        <div className="border-b pb-5 mb-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold">{project?.name ?? projId}</h1>
                {isVercel
                  ? <Badge variant="outline" className="gap-1"><svg className="h-2.5 w-2.5" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg>Vercel</Badge>
                  : <Badge variant="outline" className="gap-1"><Server className="h-3 w-3" />Railway</Badge>}
                {project && <StateChip state={project.status} />}
              </div>
              {isVercel && (project as VercelProject)?.framework && (
                <p className="text-sm text-muted-foreground">{(project as VercelProject).framework}</p>
              )}
              {!isVercel && (project as RailwayProject)?.services?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {(project as RailwayProject).services.map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {externalUrl && (
                <Button asChild variant="outline" size="sm">
                  <a href={externalUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Ouvrir
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-5 flex-wrap">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  tab === t.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}>
                {t.icon}{t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Overview ──────────────────────────────────────────────────── */}
      {tab === 'overview' && project && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Informations</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Source</span><span className="font-medium capitalize">{project.source}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Statut</span><StateChip state={project.status} /></div>
              {isVercel && (project as VercelProject).framework && (
                <div className="flex justify-between"><span className="text-muted-foreground">Framework</span><span className="font-medium">{(project as VercelProject).framework}</span></div>
              )}
              {project.updatedAt && (
                <div className="flex justify-between"><span className="text-muted-foreground">Dernière activité</span><span className="font-medium">{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true, locale: fr })}</span></div>
              )}
              {isVercel && externalUrl && (
                <div className="flex justify-between items-center"><span className="text-muted-foreground">URL</span>
                  <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs flex items-center gap-1 truncate max-w-[200px]">
                    {externalUrl.replace('https://','')} <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
            </CardContent>
          </Card>

          {!isVercel && (project as RailwayProject).environments?.length > 0 && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Environnements</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="flex flex-wrap gap-2">
                  {(project as RailwayProject).environments.map(e => (
                    <Badge key={e} variant="outline">{e}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {isVercel && (
            <Card>
              <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Accès rapide</CardTitle></CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                <button onClick={() => setTab('deployments')} className="w-full text-left text-sm flex items-center justify-between py-1.5 hover:text-primary transition-colors">
                  Voir les déploiements <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={() => setTab('logs')} className="w-full text-left text-sm flex items-center justify-between py-1.5 hover:text-primary transition-colors border-t">
                  Voir les logs <ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={() => setTab('costs')} className="w-full text-left text-sm flex items-center justify-between py-1.5 hover:text-primary transition-colors border-t">
                  Voir les coûts <ChevronRight className="h-4 w-4" />
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Deployments ───────────────────────────────────────────────── */}
      {tab === 'deployments' && (
        loadingDeps ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        : deployments.length === 0 ? (
          <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12 text-center">
            <p className="text-muted-foreground text-sm font-medium">Aucun déploiement trouvé</p>
            <p className="text-xs text-muted-foreground mt-1">Les déploiements apparaissent après la première mise en production</p>
          </CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-hidden divide-y">
            {deployments.map(d => (
              <div key={d.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.service && <span className="text-xs text-muted-foreground">/ {d.service}</span>}
                    <StateChip state={d.state} />
                    <Badge variant="outline" className={`text-[10px] ${d.target === 'production' ? 'border-purple-200 text-purple-700' : 'text-muted-foreground'}`}>{d.target}</Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground flex-wrap">
                    {d.branch    && <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{d.branch}</span>}
                    {d.commitSha && <span className="flex items-center gap-1"><GitCommit className="h-3 w-3" />{d.commitSha}</span>}
                    {d.commit    && <span className="truncate max-w-[240px]">{d.commit}</span>}
                    {d.creator   && <span className="flex items-center gap-1"><User className="h-3 w-3" />{d.creator}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {d.createdAt && <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true, locale: fr })}</span>}
                  {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary"><ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Logs ──────────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        loadingLogs ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        : logs.length === 0 ? (
          <Card className="border-dashed"><CardContent className="flex flex-col items-center py-12 text-center">
            <p className="text-muted-foreground text-sm font-medium">Aucun log disponible</p>
            <p className="text-xs text-muted-foreground mt-1">Les logs Vercel s'affichent après un déploiement</p>
          </CardContent></Card>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-[#0d0d0d] font-mono">
            <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 text-xs text-white/50">
              <span>{project?.name}</span><span className="ml-auto">{logs.length} lignes</span>
            </div>
            <ScrollArea className="h-[500px]">
              <div className="p-4 space-y-0.5">
                {logs.map(l => (
                  <div key={l.id} className="flex gap-3 text-[11px] leading-5">
                    <span className="text-white/30 shrink-0 tabular-nums w-20">{new Date(l.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                    <span className={`shrink-0 w-10 ${l.level==='error'?'text-red-400':l.level==='warn'?'text-yellow-400':'text-white/30'}`}>{l.level.toUpperCase()}</span>
                    <span className={`flex-1 ${l.level==='error'?'text-red-300':l.level==='warn'?'text-yellow-200':'text-white/80'}`}>{l.text}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )
      )}

      {/* ── Coûts ─────────────────────────────────────────────────────── */}
      {tab === 'costs' && (
        loadingCosts ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{[0,1,2,3].map(i=><Card key={i} className="px-4 py-3"><Skeleton className="h-3 w-14 mb-2"/><Skeleton className="h-7 w-20"/></Card>)}</div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <DollarSign className="h-4 w-4 text-muted-foreground" />Coûts — {spending?.vercel?.period ?? spending?.railway?.period ?? new Date().toISOString().slice(0,7)}
              </h2>
              <Button variant="ghost" size="sm" onClick={loadCosts} className="h-7 gap-1.5 text-xs">
                <RefreshCw className="h-3 w-3" />Rafraîchir
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1"><svg className="h-3 w-3" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg>Vercel</div>
                <p className="text-lg font-bold">{spending?.vercel?.current!=null?`$${spending.vercel.current.toFixed(2)}`:<span className="text-muted-foreground text-sm">—</span>}</p>
              </Card>
              <Card className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1"><Server className="h-3 w-3"/>Railway</div>
                <p className="text-lg font-bold">{spending?.railway?.current!=null?`$${spending.railway.current.toFixed(2)}`:<span className="text-muted-foreground text-sm">—</span>}</p>
                {(spending?.railway?.cpu!=null||spending?.railway?.memory!=null)&&<p className="text-[10px] text-muted-foreground mt-0.5">{spending?.railway?.cpu!=null&&`CPU ${spending.railway.cpu.toFixed(1)}%`}{spending?.railway?.memory!=null&&` · ${spending.railway.memory}MB`}</p>}
              </Card>
              <Card className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1"><Database className="h-3 w-3"/>Neon</div>
                <p className="text-lg font-bold">{spending?.neon?.computeHours!=null?`${spending.neon.computeHours.toFixed(1)}h`:<span className="text-muted-foreground text-sm">—</span>}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">compute</p>
              </Card>
              <Card className="px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1"><TrendingUp className="h-3 w-3"/>Anthropic</div>
                <p className="text-lg font-bold">{spending?.anthropic?.current!=null?`$${spending.anthropic.current.toFixed(2)}`:<span className="text-muted-foreground text-sm">—</span>}</p>
                {spending?.anthropic&&<p className="text-[10px] text-muted-foreground mt-0.5">{((spending.anthropic.inputTokens+spending.anthropic.outputTokens)/1000).toFixed(0)}k tokens</p>}
              </Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><TrendingUp className="h-3.5 w-3.5"/>Anthropic tokens / jour</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4">
                  {spending?.anthropic?.daily?.length ? (
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={spending.anthropic.daily} margin={{top:4,right:0,left:0,bottom:0}}>
                        <defs>
                          <linearGradient id="pcIn"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient>
                          <linearGradient id="pcOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{fontSize:9}} tickFormatter={v=>v.slice(5)}/>
                        <Tooltip contentStyle={{fontSize:11}} formatter={(v:number,n:string)=>[v.toLocaleString(),n==='inputTokens'?'Input':'Output']}/>
                        <Area type="monotone" dataKey="inputTokens"  stroke="#8b5cf6" fill="url(#pcIn)"  strokeWidth={1.5} dot={false}/>
                        <Area type="monotone" dataKey="outputTokens" stroke="#06b6d4" fill="url(#pcOut)" strokeWidth={1.5} dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-1 pt-4 px-4"><CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Cpu className="h-3.5 w-3.5"/>OpenAI tokens · Neon compute</CardTitle></CardHeader>
                <CardContent className="px-4 pb-4">
                  {spending?.openai?.daily?.length ? (
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart data={spending.openai.daily} margin={{top:4,right:0,left:0,bottom:0}}>
                        <XAxis dataKey="date" tick={{fontSize:9}} tickFormatter={v=>v.slice(5)}/>
                        <Tooltip contentStyle={{fontSize:11}} formatter={(v:number)=>[v.toLocaleString(),'Tokens']}/>
                        <Bar dataKey="tokens" fill="#10b981" radius={[2,2,0,0]} maxBarSize={12}/>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : spending?.neon?.daily?.length ? (
                    <ResponsiveContainer width="100%" height={120}>
                      <AreaChart data={spending.neon.daily} margin={{top:4,right:0,left:0,bottom:0}}>
                        <defs><linearGradient id="pcNeon" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient></defs>
                        <XAxis dataKey="date" tick={{fontSize:9}} tickFormatter={v=>v.slice(5)}/>
                        <Tooltip contentStyle={{fontSize:11}} formatter={(v:number)=>[`${v.toFixed(2)}h`,'Compute']}/>
                        <Area type="monotone" dataKey="computeHours" stroke="#10b981" fill="url(#pcNeon)" strokeWidth={1.5} dot={false}/>
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>}
                </CardContent>
              </Card>
            </div>
          </div>
        )
      )}

    </div>
  )
}

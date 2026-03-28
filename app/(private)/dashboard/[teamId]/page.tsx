'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search, Plus, Loader2, ExternalLink, Server,
  LayoutGrid, Rocket, ScrollText,
  CheckCircle2, XCircle, Clock, AlertCircle,
  GitBranch, GitCommit, User,
  ChevronRight, Brain, Activity, Zap,
  GitCommit as GitCommitIcon, FileText, Target, Bot,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'projects' | 'deployments' | 'logs'

interface VercelProject  { id: string; name: string; source: 'vercel';   url: string;  status: string; updatedAt: string | null; framework: string | null }
interface RailwayProject { id: string; name: string; source: 'railway';  url: string | null; status: string; updatedAt: string | null; services: string[]; environments: string[] }
interface Deployment {
  id: string; name: string; source: 'vercel' | 'railway'
  url: string | null; state: string; target: string
  branch: string | null; commit: string | null; commitSha: string | null
  creator: string | null; service?: string | null; createdAt: string | null
}
interface LogEntry {
  id: string; source: 'vercel'; project: string; deploymentId: string
  text: string; level: 'info' | 'warn' | 'error'; createdAt: string
}
interface PulseEvent { id: string; timestamp: Date; source: string; message: string; confidenceScore?: number }

// ─── Status helpers ─────────────────────────────────────────────────────────────

const VERCEL_STATE: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  READY:    { label: 'Ready',    icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500"  />, cls: 'text-green-700 bg-green-50 border-green-200' },
  BUILDING: { label: 'Building', icon: <Loader2      className="h-3.5 w-3.5 text-yellow-500 animate-spin" />, cls: 'text-yellow-700 bg-yellow-50 border-yellow-200' },
  ERROR:    { label: 'Error',    icon: <XCircle      className="h-3.5 w-3.5 text-red-500"    />, cls: 'text-red-700 bg-red-50 border-red-200' },
  CANCELED: { label: 'Canceled', icon: <AlertCircle  className="h-3.5 w-3.5 text-gray-400"  />, cls: 'text-gray-600 bg-gray-50 border-gray-200' },
  QUEUED:   { label: 'Queued',   icon: <Clock        className="h-3.5 w-3.5 text-blue-400"  />, cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  RUNNING:  { label: 'Running',  icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />, cls: 'text-green-700 bg-green-50 border-green-200' },
  SUCCESS:  { label: 'Success',  icon: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />, cls: 'text-green-700 bg-green-50 border-green-200' },
  FAILED:   { label: 'Failed',   icon: <XCircle      className="h-3.5 w-3.5 text-red-500"   />, cls: 'text-red-700 bg-red-50 border-red-200' },
  CRASHED:  { label: 'Crashed',  icon: <XCircle      className="h-3.5 w-3.5 text-red-500"   />, cls: 'text-red-700 bg-red-50 border-red-200' },
}
function StateChip({ state }: { state: string }) {
  const s = VERCEL_STATE[state] ?? { label: state, icon: <Clock className="h-3.5 w-3.5" />, cls: 'text-gray-600 bg-gray-50 border-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  )
}

function SourceBadge({ source }: { source: 'vercel' | 'railway' }) {
  return source === 'vercel'
    ? <Badge variant="outline" className="text-[10px] gap-1 px-1.5"><svg className="h-2.5 w-2.5" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg>Vercel</Badge>
    : <Badge variant="outline" className="text-[10px] gap-1 px-1.5"><Server className="h-2.5 w-2.5" />Railway</Badge>
}

// ─── Mock pulse ─────────────────────────────────────────────────────────────────

const SOURCE_ICON: Record<string, React.ReactNode> = {
  zoho:     <Target       className="h-3.5 w-3.5 text-orange-500" />,
  github:   <GitCommitIcon className="h-3.5 w-3.5 text-gray-500" />,
  temporal: <Clock        className="h-3.5 w-3.5 text-purple-500" />,
  notion:   <FileText     className="h-3.5 w-3.5 text-gray-600" />,
  agent:    <Bot          className="h-3.5 w-3.5 text-blue-500" />,
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

// ─── Main ───────────────────────────────────────────────────────────────────────

export default function PanoptiqueePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [tab, setTab]                 = useState<Tab>('projects')
  const [search, setSearch]           = useState('')
  const [loading, setLoading]         = useState(true)
  const [vercelProjects, setVP]       = useState<VercelProject[]>([])
  const [railwayProjects, setRP]      = useState<RailwayProject[]>([])
  const [deployments, setDeployments] = useState<Deployment[]>([])
  const [logs, setLogs]               = useState<LogEntry[]>([])
  const [loadingDep, setLoadingDep]   = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load projects
  const loadProjects = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/projects')
      if (r.ok) { const d = await r.json(); setVP(d.vercel ?? []); setRP(d.railway ?? []) }
    } catch {} finally { setLoading(false) }
  }, [])

  // Load deployments lazily
  const loadDeployments = useCallback(async () => {
    if (deployments.length) return
    setLoadingDep(true)
    try {
      const r = await fetch('/api/dashboard/deployments')
      if (r.ok) { const d = await r.json(); setDeployments(d.deployments ?? []) }
    } catch {} finally { setLoadingDep(false) }
  }, [deployments.length])

  // Load logs lazily
  const loadLogs = useCallback(async () => {
    if (logs.length) return
    setLoadingLogs(true)
    try {
      const r = await fetch('/api/dashboard/logs')
      if (r.ok) { const d = await r.json(); setLogs(d.logs ?? []) }
    } catch {} finally { setLoadingLogs(false) }
  }, [logs.length])

  useEffect(() => { loadProjects(); const i = setInterval(loadProjects, 30000); return () => clearInterval(i) }, [loadProjects])
  useEffect(() => { if (tab === 'deployments') loadDeployments() }, [tab, loadDeployments])
  useEffect(() => { if (tab === 'logs') loadLogs() }, [tab, loadLogs])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus() } }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [])

  const q = search.toLowerCase().trim()

  // Filtered projects (unified list)
  const allProjects: (VercelProject | RailwayProject)[] = [...vercelProjects, ...railwayProjects]
  const filteredProjects = q ? allProjects.filter(p => p.name.toLowerCase().includes(q) || (p.source === 'railway' && (p as RailwayProject).services.some(s => s.toLowerCase().includes(q)))) : allProjects

  // Filtered deployments
  const filteredDeps = q ? deployments.filter(d => d.name.toLowerCase().includes(q) || d.commit?.toLowerCase().includes(q) || d.branch?.toLowerCase().includes(q)) : deployments

  // Filtered logs
  const filteredLogs = q ? logs.filter(l => l.text.toLowerCase().includes(q) || l.project.toLowerCase().includes(q)) : logs

  const count = tab === 'projects' ? filteredProjects.length : tab === 'deployments' ? filteredDeps.length : filteredLogs.length

  const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'projects',    label: 'Projects',    icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'deployments', label: 'Deployments', icon: <Rocket     className="h-4 w-4" /> },
    { id: 'logs',        label: 'Logs',        icon: <ScrollText className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-0">

      {/* ── Top bar : Find + nav ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-4">
        {/* Search */}
        <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-background flex-1 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Find…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button type="button" onClick={() => setSearch('')} className="text-xs text-muted-foreground hover:text-foreground">✕</button>
          )}
          {!loading && <span className="text-[11px] text-muted-foreground shrink-0">{count}</span>}
        </div>
        {/* Nav tabs */}
        <div className="flex items-center border rounded-lg overflow-hidden bg-muted/30 shrink-0">
          {NAV.map(n => (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${
                tab === n.id
                  ? 'bg-background text-foreground font-medium shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              }`}
            >
              {n.icon}
              <span className="hidden sm:inline">{n.label}</span>
            </button>
          ))}
        </div>
        {tab === 'projects' && (
          <Button asChild size="sm" variant="outline" className="shrink-0">
            <Link href={`/dashboard/${teamId}/new`}><Plus className="h-3.5 w-3.5 mr-1.5" />Nouveau</Link>
          </Button>
        )}
      </div>

      {/* ── Projects ─────────────────────────────────────────────────── */}
      {tab === 'projects' && (
        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredProjects.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                {q ? <p className="text-muted-foreground text-sm">Aucun projet correspondant à «&nbsp;{search}&nbsp;»</p> : (
                  <>
                    <p className="text-muted-foreground text-sm font-medium">Aucun projet disponible</p>
                    <p className="text-xs text-muted-foreground mt-1">Configurez vos tokens dans <Link href="/admin/api" className="text-primary hover:underline">Admin → API Management</Link></p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProjects.map(p => (
                <Card key={`${p.source}-${p.id}`} className="hover:border-primary/40 hover:shadow-sm transition-all group">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.name}</h3>
                        {'framework' in p && p.framework && <p className="text-[11px] text-muted-foreground mt-0.5">{p.framework}</p>}
                        {'services' in p && p.services.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">{p.services.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <SourceBadge source={p.source} />
                        <StateChip state={p.status} />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 space-y-2">
                    {'url' in p && p.url && (
                      <a href={p.source === 'vercel' ? (p as VercelProject).url : '#'} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors truncate">
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {p.source === 'vercel' ? (p as VercelProject).url.replace('https://','') : ''}
                      </a>
                    )}
                    {'environments' in p && p.environments.length > 0 && (
                      <div className="flex gap-1">{(p as RailwayProject).environments.map(e => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}</div>
                    )}
                    <div className="flex items-center justify-between pt-0.5">
                      {p.updatedAt && <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: fr })}</span>}
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 ml-auto" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pulse + Ghost Dev */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
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
      )}

      {/* ── Deployments ───────────────────────────────────────────────── */}
      {tab === 'deployments' && (
        <div>
          {loadingDep ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredDeps.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                {q ? <p className="text-muted-foreground text-sm">Aucun déploiement correspondant à «&nbsp;{search}&nbsp;»</p> : (
                  <>
                    <p className="text-muted-foreground text-sm font-medium">Aucun déploiement</p>
                    <p className="text-xs text-muted-foreground mt-1">Configurez Vercel et Railway dans <Link href="/admin/api" className="text-primary hover:underline">API Management</Link></p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden divide-y">
              {filteredDeps.map(d => (
                <div key={d.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
                  <SourceBadge source={d.source} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{d.name}</span>
                      {d.service && <span className="text-xs text-muted-foreground">/ {d.service}</span>}
                      <StateChip state={d.state} />
                      <Badge variant="outline" className={`text-[10px] ${d.target === 'production' ? 'border-purple-200 text-purple-700' : 'text-muted-foreground'}`}>
                        {d.target}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                      {d.branch    && <span className="flex items-center gap-1"><GitBranch className="h-3 w-3" />{d.branch}</span>}
                      {d.commitSha && <span className="flex items-center gap-1"><GitCommit className="h-3 w-3" />{d.commitSha}</span>}
                      {d.commit    && <span className="truncate max-w-[200px]">{d.commit}</span>}
                      {d.creator   && <span className="flex items-center gap-1"><User className="h-3 w-3" />{d.creator}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.createdAt && <span className="text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(d.createdAt), { addSuffix: true, locale: fr })}</span>}
                    {d.url && (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Logs ──────────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        <div>
          {loadingLogs ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredLogs.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center py-12 text-center">
                {q ? <p className="text-muted-foreground text-sm">Aucun log correspondant à «&nbsp;{search}&nbsp;»</p> : (
                  <>
                    <p className="text-muted-foreground text-sm font-medium">Aucun log disponible</p>
                    <p className="text-xs text-muted-foreground mt-1">Les logs Vercel apparaissent ici après un déploiement</p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-[#0d0d0d] font-mono">
              <div className="flex items-center gap-3 px-4 py-2 border-b border-white/10 text-xs text-white/50">
                <span>{filteredLogs[0]?.project}</span>
                <span className="ml-auto">{filteredLogs.length} lignes</span>
              </div>
              <ScrollArea className="h-[480px]">
                <div className="p-4 space-y-0.5">
                  {filteredLogs.map(l => (
                    <div key={l.id} className="flex gap-3 text-[11px] leading-5">
                      <span className="text-white/30 shrink-0 tabular-nums w-20 truncate">
                        {new Date(l.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                      <span className={`shrink-0 w-10 ${l.level === 'error' ? 'text-red-400' : l.level === 'warn' ? 'text-yellow-400' : 'text-white/30'}`}>
                        {l.level.toUpperCase()}
                      </span>
                      <span className={`flex-1 ${l.level === 'error' ? 'text-red-300' : l.level === 'warn' ? 'text-yellow-200' : 'text-white/80'}`}>
                        {l.text}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

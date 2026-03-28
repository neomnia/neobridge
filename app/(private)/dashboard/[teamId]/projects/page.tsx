'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Search, Plus, Loader2, ExternalLink, Server,
  LayoutGrid, Rocket, ScrollText,
  CheckCircle2, XCircle, Clock, AlertCircle,
  GitBranch, GitCommit, User, ChevronRight,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ─── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'projects' | 'deployments' | 'logs'

interface VercelProject  { id: string; name: string; source: 'vercel';  url: string;  status: string; updatedAt: string | null; framework: string | null }
interface RailwayProject { id: string; name: string; source: 'railway'; url: string | null; status: string; updatedAt: string | null; services: string[]; environments: string[] }
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

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
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

  const loadProjects = useCallback(async () => {
    try {
      const r = await fetch('/api/dashboard/projects')
      if (r.ok) { const d = await r.json(); setVP(d.vercel ?? []); setRP(d.railway ?? []) }
    } catch {} finally { setLoading(false) }
  }, [])

  const loadDeployments = useCallback(async () => {
    if (deployments.length) return
    setLoadingDep(true)
    try {
      const r = await fetch('/api/dashboard/deployments')
      if (r.ok) { const d = await r.json(); setDeployments(d.deployments ?? []) }
    } catch {} finally { setLoadingDep(false) }
  }, [deployments.length])

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
  const allProjects: (VercelProject | RailwayProject)[] = [...vercelProjects, ...railwayProjects]
  const filteredProjects = q ? allProjects.filter(p => p.name.toLowerCase().includes(q) || (p.source === 'railway' && (p as RailwayProject).services.some(s => s.toLowerCase().includes(q)))) : allProjects
  const filteredDeps     = q ? deployments.filter(d => d.name.toLowerCase().includes(q) || d.commit?.toLowerCase().includes(q) || d.branch?.toLowerCase().includes(q)) : deployments
  const filteredLogs     = q ? logs.filter(l => l.text.toLowerCase().includes(q) || l.project.toLowerCase().includes(q)) : logs
  const count = tab === 'projects' ? filteredProjects.length : tab === 'deployments' ? filteredDeps.length : filteredLogs.length

  const NAV: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'projects',    label: 'Projects',    icon: <LayoutGrid className="h-4 w-4" /> },
    { id: 'deployments', label: 'Deployments', icon: <Rocket     className="h-4 w-4" /> },
    { id: 'logs',        label: 'Logs',        icon: <ScrollText className="h-4 w-4" /> },
  ]

  return (
    <div className="space-y-0">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <Link href={`/dashboard/${teamId}`} className="hover:text-foreground transition-colors">Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Projets</span>
      </nav>

      {/* Top bar: search + nav */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 pb-4">
        <div className="flex items-center gap-2 px-3 py-2 border rounded-lg bg-background flex-1 focus-within:ring-2 focus-within:ring-primary/30 transition-all">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Rechercher un projet Vercel ou Railway…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && <button type="button" onClick={() => setSearch('')} className="text-xs text-muted-foreground hover:text-foreground">✕</button>}
          {!loading && <span className="text-[11px] text-muted-foreground shrink-0">{count}</span>}
        </div>
        <div className="flex items-center border rounded-lg overflow-hidden bg-muted/30 shrink-0">
          {NAV.map(n => (
            <button key={n.id} onClick={() => setTab(n.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${tab === n.id ? 'bg-background text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}`}
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

      {/* Projects */}
      {tab === 'projects' && (
        loading ? (
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
            {filteredProjects.map(p => {
              const externalUrl = p.source === 'vercel'
                ? (p as VercelProject).url
                : ((p as RailwayProject).url ?? '#')
              return (
                <Card key={`${p.source}-${p.id}`} className="hover:border-primary/40 hover:shadow-sm transition-all group">
                  <CardContent className="px-4 pt-4 pb-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{p.name}</h3>
                        {'framework' in p && p.framework && <p className="text-[11px] text-muted-foreground mt-0.5">{p.framework}</p>}
                        {'services' in p && (p as RailwayProject).services.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">{(p as RailwayProject).services.map(s => <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>)}</div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <SourceBadge source={p.source} />
                        <StateChip state={p.status} />
                      </div>
                    </div>
                    {'environments' in p && (p as RailwayProject).environments.length > 0 && (
                      <div className="flex gap-1">{(p as RailwayProject).environments.map(e => <Badge key={e} variant="outline" className="text-[10px]">{e}</Badge>)}</div>
                    )}
                    <div className="flex items-center justify-between pt-0.5">
                      {p.updatedAt && <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true, locale: fr })}</span>}
                      <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary transition-colors ml-auto">
                        <ExternalLink className="h-3 w-3" />Ouvrir
                      </a>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* Deployments */}
      {tab === 'deployments' && (
        loadingDep ? (
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
                    <Badge variant="outline" className={`text-[10px] ${d.target === 'production' ? 'border-purple-200 text-purple-700' : 'text-muted-foreground'}`}>{d.target}</Badge>
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
                  {d.url && <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-primary transition-colors"><ExternalLink className="h-3.5 w-3.5" /></a>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Logs */}
      {tab === 'logs' && (
        loadingLogs ? (
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
        )
      )}
    </div>
  )
}

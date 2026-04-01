"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search, Link2, Link2Off, ExternalLink, CheckCircle2,
  Clock, AlertCircle, FolderKanban, Rocket, Bug, Milestone, ListTodo
} from "lucide-react"
import type { ZohoProject } from "@/lib/zoho"
import type { VercelProject } from "@/lib/connectors/vercel"
import type { ZohoProjectLink } from "@/lib/types/zoho"

// ── helpers ───────────────────────────────────────────────────────────────────

function zohoStatusBadge(status: string) {
  switch (status?.toLowerCase()) {
    case "active":    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Actif</Badge>
    case "completed": return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs">Terminé</Badge>
    case "onhold":
    case "on hold":   return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">En pause</Badge>
    default:          return <Badge variant="secondary" className="text-xs">{status}</Badge>
  }
}

function projectAvatar(name: string) {
  const colors = [
    "bg-violet-500", "bg-blue-500", "bg-green-500", "bg-amber-500",
    "bg-rose-500", "bg-teal-500", "bg-indigo-500", "bg-pink-500",
  ]
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div className={`h-9 w-9 rounded-lg ${colors[idx]} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  )
}

function relativeTime(iso?: string) {
  if (!iso) return ""
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return "il y a < 1h"
  if (h < 24) return `il y a ${h}h`
  const d = Math.floor(h / 24)
  return `il y a ${d}j`
}

// ── types ─────────────────────────────────────────────────────────────────────

interface VercelProjectWithTeam extends VercelProject {
  teamId: string
  teamName: string
}

interface Props {
  zohoProjects: ZohoProject[]
  vercelProjects: VercelProjectWithTeam[]
  initialLinks: Record<string, ZohoProjectLink>
  /** e.g. "https://projects.zoho.com/portal/neomniadotnet" */
  zohoPortalBaseUrl: string
  /** true when showing placeholder mock data (no real Zoho connection) */
  isMockData?: boolean
}

// ── component ─────────────────────────────────────────────────────────────────

export function ZohoPmClient({ zohoProjects, vercelProjects, initialLinks, zohoPortalBaseUrl, isMockData }: Props) {
  const [search, setSearch]           = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [linkFilter, setLinkFilter]   = useState("all")   // "all" | "linked" | "unlinked"
  const [links, setLinks]             = useState(initialLinks)
  const [linking, setLinking]         = useState<ZohoProject | null>(null)
  const [vercelSearch, setVercelSearch] = useState("")
  const [saving, setSaving]           = useState(false)

  const filtered = useMemo(() => {
    return zohoProjects.filter(p => {
      const matchSearch = !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.owner_name?.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === "all" || p.status?.toLowerCase() === statusFilter
      const isLinked = !!links[p.id]
      const matchLink =
        linkFilter === "all" ? true :
        linkFilter === "linked" ? isLinked :
        !isLinked
      return matchSearch && matchStatus && matchLink
    })
  }, [zohoProjects, search, statusFilter, linkFilter, links])

  const filteredVercel = useMemo(() => {
    if (!vercelSearch) return vercelProjects
    return vercelProjects.filter(p =>
      p.name.toLowerCase().includes(vercelSearch.toLowerCase()) ||
      p.teamName.toLowerCase().includes(vercelSearch.toLowerCase())
    )
  }, [vercelProjects, vercelSearch])

  const linkedCount  = Object.keys(links).length
  const activeCount  = zohoProjects.filter(p => p.status?.toLowerCase() === "active").length

  async function linkProject(zohoProject: ZohoProject, vercelProject: VercelProjectWithTeam) {
    setSaving(true)
    try {
      await fetch("/api/zoho/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zohoProjectId:   zohoProject.id,
          zohoProjectName: zohoProject.name,
          teamId:          vercelProject.teamId,
          projectId:       vercelProject.name,
          projectName:     vercelProject.name,
        }),
      })
      setLinks(prev => ({
        ...prev,
        [zohoProject.id]: {
          zohoProjectId:   zohoProject.id,
          zohoProjectName: zohoProject.name,
          teamId:          vercelProject.teamId,
          projectId:       vercelProject.name,
          projectName:     vercelProject.name,
          linkedAt:        new Date().toISOString(),
        },
      }))
      setLinking(null)
    } finally {
      setSaving(false)
    }
  }

  async function unlinkProject(zohoProjectId: string) {
    await fetch("/api/zoho/links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zohoProjectId }),
    })
    setLinks(prev => {
      const next = { ...prev }
      delete next[zohoProjectId]
      return next
    })
  }

  return (
    <>
      {/* ── Stats bar ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total projets Zoho", value: zohoProjects.length,               icon: FolderKanban, color: "text-violet-500" },
          { label: "Actifs",             value: activeCount,                         icon: CheckCircle2, color: "text-green-500" },
          { label: "Liés à NeoBridge",   value: linkedCount,                         icon: Link2,        color: "text-blue-500" },
          { label: "Non liés",           value: zohoProjects.length - linkedCount,   icon: AlertCircle,  color: "text-amber-500" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border bg-card p-4 flex items-center gap-3">
            <Icon className={`h-8 w-8 ${color} flex-shrink-0`} />
            <div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un projet Zoho…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="active">Actif</SelectItem>
            <SelectItem value="completed">Terminé</SelectItem>
            <SelectItem value="on hold">En pause</SelectItem>
          </SelectContent>
        </Select>
        <Select value={linkFilter} onValueChange={setLinkFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Liaison" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes liaisons</SelectItem>
            <SelectItem value="linked">Liés</SelectItem>
            <SelectItem value="unlinked">Non liés</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Project grid ──────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">Aucun projet trouvé</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(project => {
            const link = links[project.id]
            const hasStats = project.open_task_count !== undefined ||
                             project.bug_count !== undefined ||
                             project.milestone_count !== undefined
            return (
              <div key={project.id}
                className="rounded-xl border bg-card p-5 flex flex-col gap-4 hover:border-brand/50 transition-colors">

                {/* Header */}
                <div className="flex items-start gap-3">
                  {projectAvatar(project.name)}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{project.name}</div>
                    {project.owner_name && (
                      <div className="text-xs text-muted-foreground mt-0.5">{project.owner_name}</div>
                    )}
                  </div>
                  {zohoStatusBadge(project.status ?? "active")}
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                )}

                {/* Mini-stats — tasks / bugs / milestones */}
                {hasStats && (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {project.open_task_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <ListTodo className="h-3 w-3 text-violet-400" />
                        {project.open_task_count} tâche{project.open_task_count !== 1 ? "s" : ""}
                      </span>
                    )}
                    {project.bug_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <Bug className="h-3 w-3 text-red-400" />
                        {project.bug_count} bug{project.bug_count !== 1 ? "s" : ""}
                      </span>
                    )}
                    {project.milestone_count !== undefined && (
                      <span className="flex items-center gap-1">
                        <Milestone className="h-3 w-3 text-blue-400" />
                        {project.milestone_count} jalon{project.milestone_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}

                {/* Meta — last modified */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {relativeTime(project.last_modified_time)}
                </div>

                {/* Link status */}
                {link ? (
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Rocket className="h-3.5 w-3.5 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700 dark:text-blue-400">
                          {link.teamId} / {link.projectName}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-red-600"
                        onClick={() => unlinkProject(project.id)}
                        title="Délier"
                      >
                        <Link2Off className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Lié le {new Date(link.linkedAt).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed p-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>Non lié à NeoBridge</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5"
                      onClick={() => { setLinking(project); setVercelSearch("") }}
                    >
                      <Link2 className="h-3 w-3" />
                      Lier
                    </Button>
                  </div>
                )}

                {/* Footer links */}
                <div className="flex items-center gap-2 pt-1 border-t">
                  {!isMockData && (
                    <a
                      href={`${zohoPortalBaseUrl}/projects/${project.id}/`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Ouvrir dans Zoho
                    </a>
                  )}
                  {link && (
                    <a
                      href={`/dashboard/${link.teamId}/${link.projectId}/zoho`}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto"
                    >
                      <FolderKanban className="h-3 w-3" />
                      Kanban
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Link modal ────────────────────────────────────────────────── */}
      <Dialog open={!!linking} onOpenChange={open => { if (!open) setLinking(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-brand" />
              Lier à un projet NeoBridge
            </DialogTitle>
            <DialogDescription>
              Choisissez le projet Vercel correspondant à{" "}
              <strong>{linking?.name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un projet Vercel…"
              className="pl-9"
              value={vercelSearch}
              onChange={e => setVercelSearch(e.target.value)}
              autoFocus
            />
          </div>

          <ScrollArea className="max-h-72 -mx-1 px-1">
            {filteredVercel.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun projet trouvé</p>
            ) : (
              <div className="space-y-1">
                {filteredVercel.map(vp => (
                  <button
                    key={`${vp.teamId}/${vp.name}`}
                    disabled={saving}
                    onClick={() => linking && linkProject(linking, vp)}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted transition-colors disabled:opacity-50"
                  >
                    <div className="h-8 w-8 rounded bg-brand/10 flex items-center justify-center flex-shrink-0">
                      <Rocket className="h-4 w-4 text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{vp.name}</div>
                      <div className="text-xs text-muted-foreground">{vp.teamName}</div>
                    </div>
                    {vp.framework && (
                      <Badge variant="secondary" className="text-xs">{vp.framework}</Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  )
}

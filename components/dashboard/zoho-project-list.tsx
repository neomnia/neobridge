"use client"

import { useState, useMemo, useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search, Link2, Link2Off, ExternalLink, Rocket,
  FolderKanban, CheckCircle2, Circle, Plus, Loader2
} from "lucide-react"
import type { ZohoProject } from "@/lib/zoho"
import type { VercelProject } from "@/lib/connectors/vercel"
import type { ZohoProjectLink } from "@/app/api/zoho/links/route"

interface VercelProjectWithTeam extends VercelProject {
  teamId: string
  teamName: string
}

interface Props {
  zohoProjects: ZohoProject[]
  vercelProjects: VercelProjectWithTeam[]
  initialLinks: Record<string, ZohoProjectLink>
  zohoPortalBaseUrl: string
}

type Modal =
  | { type: "link"; project: ZohoProject }
  | { type: "create_zoho" }
  | null

function statusBadge(status: string) {
  const s = status?.toLowerCase()
  if (s === "active")    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-0 text-xs">Actif</Badge>
  if (s === "completed") return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-xs">Terminé</Badge>
  if (s === "onhold" || s === "on hold") return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-0 text-xs">En pause</Badge>
  return <Badge variant="secondary" className="text-xs">{status}</Badge>
}

function avatar(name: string) {
  const palette = ["bg-violet-500","bg-blue-500","bg-green-500","bg-amber-500","bg-rose-500","bg-teal-500","bg-indigo-500","bg-pink-500"]
  return (
    <div className={`h-9 w-9 rounded-lg ${palette[name.charCodeAt(0) % palette.length]} flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  )
}

export function ZohoProjectList({ zohoProjects, vercelProjects, initialLinks, zohoPortalBaseUrl }: Props) {
  const [links, setLinks] = useState(initialLinks)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "connected" | "unconnected">("all")
  const [modal, setModal] = useState<Modal>(null)
  const [vercelSearch, setVercelSearch] = useState("")
  const [isPending, startTransition] = useTransition()

  // Create Zoho project form state
  const [newProjectName, setNewProjectName] = useState("")
  const [newProjectDesc, setNewProjectDesc] = useState("")
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const filtered = useMemo(() => zohoProjects.filter(p => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.owner_name?.toLowerCase().includes(search.toLowerCase())
    const linked = !!links[p.id]
    const matchFilter = filter === "all" ? true : filter === "connected" ? linked : !linked
    return matchSearch && matchFilter
  }), [zohoProjects, search, filter, links])

  const filteredVercel = useMemo(() => !vercelSearch
    ? vercelProjects
    : vercelProjects.filter(p =>
        p.name.toLowerCase().includes(vercelSearch.toLowerCase()) ||
        p.teamName?.toLowerCase().includes(vercelSearch.toLowerCase())
      ), [vercelProjects, vercelSearch])

  const connectedCount = Object.keys(links).length

  async function linkProject(zoho: ZohoProject, vercel: VercelProjectWithTeam) {
    startTransition(async () => {
      await fetch("/api/zoho/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zohoProjectId: zoho.id,
          zohoProjectName: zoho.name,
          teamId: vercel.teamId,
          projectId: vercel.name,
          projectName: vercel.name,
        }),
      })
      setLinks(prev => ({
        ...prev,
        [zoho.id]: {
          zohoProjectId: zoho.id, zohoProjectName: zoho.name,
          teamId: vercel.teamId, projectId: vercel.name,
          projectName: vercel.name, linkedAt: new Date().toISOString(),
        },
      }))
      setModal(null)
    })
  }

  async function unlinkProject(zohoProjectId: string) {
    await fetch("/api/zoho/links", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ zohoProjectId }),
    })
    setLinks(prev => { const next = { ...prev }; delete next[zohoProjectId]; return next })
  }

  async function createZohoProject() {
    if (!newProjectName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch("/api/zoho?action=createProject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim(), description: newProjectDesc.trim() || undefined }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `Erreur HTTP ${res.status}`)
      }
      // Reload the page to show the new project
      window.location.reload()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["all", "connected", "unconnected"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === f ? "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
              {f === "all" ? `Tous (${zohoProjects.length})` : f === "connected" ? `Connectés (${connectedCount})` : `Non connectés (${zohoProjects.length - connectedCount})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Rechercher…" className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Button size="sm" className="h-8 gap-1.5 shrink-0" onClick={() => { setModal({ type: "create_zoho" }); setNewProjectName(""); setNewProjectDesc(""); setCreateError(null) }}>
            <Plus className="h-3.5 w-3.5" />
            Nouveau projet
          </Button>
        </div>
      </div>

      {/* Project list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <FolderKanban className="h-10 w-10 mb-3 opacity-20" />
          <p className="text-sm">{zohoProjects.length === 0 ? "Aucun projet dans votre portail Zoho" : "Aucun projet correspond à la recherche"}</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Projet Zoho</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs hidden sm:table-cell">Statut</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground text-xs">Connexion NeoBridge</th>
                <th className="px-4 py-2.5 text-xs w-32" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(p => {
                const link = links[p.id]
                return (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {avatar(p.name)}
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          {p.owner_name && <div className="text-xs text-muted-foreground">{p.owner_name}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {statusBadge(p.status ?? "active")}
                    </td>
                    <td className="px-4 py-3">
                      {link ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                          <span className="text-xs font-medium truncate max-w-[160px]">{link.projectName}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Circle className="h-3.5 w-3.5 shrink-0" />
                          <span className="text-xs">Non connecté</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {link ? (
                          <>
                            <a href={`/dashboard/${link.teamId}/${link.projectId}`}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ouvrir dans NeoBridge">
                              <Rocket className="h-3.5 w-3.5" />
                            </a>
                            <button onClick={() => unlinkProject(p.id)}
                              className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-red-500 transition-colors" title="Déconnecter">
                              <Link2Off className="h-3.5 w-3.5" />
                            </button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                            onClick={() => { setModal({ type: "link", project: p }); setVercelSearch("") }}>
                            <Link2 className="h-3 w-3" />
                            Connecter
                          </Button>
                        )}
                        <a href={`${zohoPortalBaseUrl}/projects/${p.id}/`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Ouvrir dans Zoho">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal: connect to NeoBridge project ── */}
      <Dialog open={modal?.type === "link"} onOpenChange={open => { if (!open) setModal(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-violet-500" />
              Connecter à NeoBridge
            </DialogTitle>
            <DialogDescription>
              Choisissez le projet de production correspondant à{" "}
              <strong>{modal?.type === "link" ? modal.project.name : ""}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un projet Vercel…" className="pl-9"
              value={vercelSearch} onChange={e => setVercelSearch(e.target.value)} autoFocus />
          </div>
          <ScrollArea className="max-h-64 -mx-1 px-1">
            {vercelProjects.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8 space-y-2">
                <p>Aucun projet Vercel disponible.</p>
                <a href="/admin/api" className="underline underline-offset-2 text-xs">Configurer le token Vercel</a>
              </div>
            ) : filteredVercel.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun projet trouvé</p>
            ) : (
              <div className="space-y-1">
                {filteredVercel.map(vp => (
                  <button key={`${vp.teamId}/${vp.name}`} disabled={isPending}
                    onClick={() => modal?.type === "link" && linkProject(modal.project, vp)}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted transition-colors disabled:opacity-50">
                    <div className="h-8 w-8 rounded bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center shrink-0">
                      <Rocket className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{vp.name}</div>
                      <div className="text-xs text-muted-foreground">{vp.teamName}</div>
                    </div>
                    {vp.framework && <Badge variant="secondary" className="text-xs">{vp.framework}</Badge>}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Modal: create Zoho project ── */}
      <Dialog open={modal?.type === "create_zoho"} onOpenChange={open => { if (!open) setModal(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-violet-500" />
              Créer un projet Zoho
            </DialogTitle>
            <DialogDescription>
              Le projet sera créé directement dans votre portail Zoho Projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nom du projet <span className="text-red-500">*</span></label>
              <Input placeholder="ex: NeoBridge v2" value={newProjectName}
                onChange={e => setNewProjectName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Description <span className="text-muted-foreground text-xs font-normal">(optionnel)</span></label>
              <Input placeholder="Courte description du projet" value={newProjectDesc}
                onChange={e => setNewProjectDesc(e.target.value)} />
            </div>
            {createError && (
              <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">{createError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)} disabled={creating}>Annuler</Button>
            <Button onClick={createZohoProject} disabled={creating || !newProjectName.trim()} className="gap-2">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

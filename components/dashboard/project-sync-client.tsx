"use client"

import { useState, useMemo } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Search, Link2, Link2Off, ExternalLink, Rocket,
  FolderKanban, CheckCircle2, Circle
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
  zohoConfigured: boolean
}

function avatar(name: string, colors = ["bg-violet-500","bg-blue-500","bg-green-500","bg-amber-500","bg-rose-500","bg-teal-500"]) {
  return (
    <div className={`h-8 w-8 rounded-lg ${colors[name.charCodeAt(0) % colors.length]} flex items-center justify-center text-white font-semibold text-xs flex-shrink-0`}>
      {name.substring(0, 2).toUpperCase()}
    </div>
  )
}

export function ProjectSyncClient({ zohoProjects, vercelProjects, initialLinks, zohoPortalBaseUrl, zohoConfigured }: Props) {
  const [links, setLinks] = useState(initialLinks)
  const [search, setSearch] = useState("")
  const [linking, setLinking] = useState<ZohoProject | null>(null)
  const [vercelSearch, setVercelSearch] = useState("")
  const [saving, setSaving] = useState(false)

  // Build reverse index: vercelProjectId → zohoProject
  const vercelLinked = useMemo(() => {
    const map: Record<string, string> = {}
    Object.values(links).forEach(l => { map[l.projectId] = l.zohoProjectName })
    return map
  }, [links])

  const filteredZoho = useMemo(() =>
    zohoProjects.filter(p =>
      !search || p.name.toLowerCase().includes(search.toLowerCase())
    ), [zohoProjects, search])

  const filteredVercel = useMemo(() =>
    vercelProjects.filter(p =>
      !vercelSearch ||
      p.name.toLowerCase().includes(vercelSearch.toLowerCase()) ||
      p.teamName?.toLowerCase().includes(vercelSearch.toLowerCase())
    ), [vercelProjects, vercelSearch])

  async function linkProject(zoho: ZohoProject, vercel: VercelProjectWithTeam) {
    setSaving(true)
    try {
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
          zohoProjectId: zoho.id,
          zohoProjectName: zoho.name,
          teamId: vercel.teamId,
          projectId: vercel.name,
          projectName: vercel.name,
          linkedAt: new Date().toISOString(),
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Colonne Zoho ────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <FolderKanban className="h-4 w-4 text-violet-500" />
              Projets Zoho
              <Badge variant="secondary">{zohoProjects.length}</Badge>
            </h2>
          </div>

          {zohoConfigured ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Rechercher…" className="pl-8 h-8 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
              </div>

              {filteredZoho.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">Aucun projet trouvé</p>
              ) : (
                <div className="space-y-2">
                  {filteredZoho.map(p => {
                    const link = links[p.id]
                    return (
                      <div key={p.id} className="rounded-lg border bg-card p-3 flex items-center gap-3">
                        {avatar(p.name)}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          {link ? (
                            <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 mt-0.5">
                              <CheckCircle2 className="h-3 w-3" />
                              {link.projectName}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Circle className="h-3 w-3" />
                              Non lié
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {!link ? (
                            <Button variant="outline" size="sm" className="h-7 text-xs gap-1"
                              onClick={() => { setLinking(p); setVercelSearch("") }}>
                              <Link2 className="h-3 w-3" /> Lier
                            </Button>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-red-500"
                              onClick={() => unlinkProject(p.id)} title="Délier">
                              <Link2Off className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <a href={`${zohoPortalBaseUrl}/projects/${p.id}/`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-muted transition-colors text-muted-foreground">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Configurez Zoho pour voir vos projets PM ici.
            </div>
          )}
        </div>

        {/* ── Colonne Vercel ──────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <Rocket className="h-4 w-4 text-blue-500" />
              Projets de production
              <Badge variant="secondary">{vercelProjects.length}</Badge>
            </h2>
          </div>

          {vercelProjects.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              Aucun projet Vercel trouvé.
              <br />
              <a href="/admin/api" className="underline underline-offset-2 mt-1 inline-block">
                Configurer le token Vercel
              </a>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Rechercher…" className="pl-8 h-8 text-sm" value={vercelSearch} onChange={e => setVercelSearch(e.target.value)} />
              </div>
              <div className="space-y-2">
                {filteredVercel.map(p => {
                  const linkedZoho = vercelLinked[p.name]
                  return (
                    <div key={`${p.teamId}/${p.name}`} className="rounded-lg border bg-card p-3 flex items-center gap-3">
                      {avatar(p.name, ["bg-blue-500","bg-indigo-500","bg-sky-500","bg-cyan-500"])}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.teamName}</div>
                      </div>
                      {linkedZoho ? (
                        <div className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 shrink-0">
                          <CheckCircle2 className="h-3 w-3" />
                          {linkedZoho}
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">Non lié</Badge>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal de liaison ────────────────────────────── */}
      <Dialog open={!!linking} onOpenChange={open => { if (!open) setLinking(null) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-violet-500" />
              Lier à un projet Vercel
            </DialogTitle>
            <DialogDescription>
              Choisissez le projet de production correspondant à <strong>{linking?.name}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher…" className="pl-9" value={vercelSearch}
              onChange={e => setVercelSearch(e.target.value)} autoFocus />
          </div>
          <ScrollArea className="max-h-64">
            {filteredVercel.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Aucun projet trouvé</p>
            ) : (
              <div className="space-y-1 pr-1">
                {filteredVercel.map(vp => (
                  <button key={`${vp.teamId}/${vp.name}`} disabled={saving}
                    onClick={() => linking && linkProject(linking, vp)}
                    className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-muted transition-colors disabled:opacity-50">
                    <Rocket className="h-4 w-4 text-blue-500 shrink-0" />
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
    </>
  )
}

"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  GitBranch,
  Star,
  GitFork,
  Lock,
  Globe,
  Search,
  Link2,
  Link2Off,
  ExternalLink,
  CircleDot,
  Archive,
  Filter,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import type { GitHubRepo, GitHubUser } from "@/lib/connectors/github"

interface LinkedInfo {
  connectorId: string
  projectId: string
  projectName: string
}

interface AnnotatedRepo extends GitHubRepo {
  linked: LinkedInfo | null
}

interface Project {
  id: string
  name: string
}

interface Props {
  repos: AnnotatedRepo[]
  user: GitHubUser | null
  projects: Project[]
}

const LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Go", "Rust",
  "Java", "PHP", "Ruby", "C#", "C++", "Shell",
]

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "—"
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return "aujourd'hui"
  if (days === 1) return "hier"
  if (days < 30) return `il y a ${days}j`
  const months = Math.floor(days / 30)
  if (months < 12) return `il y a ${months}mo`
  return `il y a ${Math.floor(months / 12)}an`
}

export function GitHubReposClient({ repos, user, projects }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Filters
  const [search, setSearch] = useState("")
  const [filterVisibility, setFilterVisibility] = useState<"all" | "public" | "private">("all")
  const [filterLanguage, setFilterLanguage] = useState<string>("all")
  const [filterLinked, setFilterLinked] = useState<"all" | "linked" | "unlinked">("all")

  // Link dialog
  const [linkTarget, setLinkTarget] = useState<AnnotatedRepo | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [isLinking, setIsLinking] = useState(false)

  // Unlink confirm
  const [unlinkTarget, setUnlinkTarget] = useState<AnnotatedRepo | null>(null)
  const [isUnlinking, setIsUnlinking] = useState(false)

  const filtered = useMemo(() => {
    return repos.filter((r) => {
      if (filterVisibility === "public" && r.private) return false
      if (filterVisibility === "private" && !r.private) return false
      if (filterLanguage !== "all" && r.language !== filterLanguage) return false
      if (filterLinked === "linked" && !r.linked) return false
      if (filterLinked === "unlinked" && r.linked) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          r.name.toLowerCase().includes(q) ||
          r.full_name.toLowerCase().includes(q) ||
          (r.description ?? "").toLowerCase().includes(q) ||
          (r.language ?? "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [repos, search, filterVisibility, filterLanguage, filterLinked])

  const linkedCount = useMemo(() => repos.filter((r) => r.linked).length, [repos])

  const detectedLanguages = useMemo(() => {
    const langs = new Set(repos.map((r) => r.language).filter(Boolean) as string[])
    return LANGUAGES.filter((l) => langs.has(l))
  }, [repos])

  async function handleLink() {
    if (!linkTarget || !selectedProjectId) return
    setIsLinking(true)
    try {
      const res = await fetch("/api/github/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          repoFullName: linkTarget.full_name,
          repoUrl: linkTarget.html_url,
          repoName: linkTarget.name,
          cloneUrl: linkTarget.clone_url,
          sshUrl: linkTarget.ssh_url,
          defaultBranch: linkTarget.default_branch,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      const project = projects.find((p) => p.id === selectedProjectId)
      toast.success(`${linkTarget.name} lié à ${project?.name ?? selectedProjectId}`)
      setLinkTarget(null)
      setSelectedProjectId("")
      startTransition(() => router.refresh())
    } catch (err: any) {
      toast.error("Erreur lors du lien : " + (err.message ?? ""))
    } finally {
      setIsLinking(false)
    }
  }

  async function handleUnlink() {
    if (!unlinkTarget?.linked) return
    setIsUnlinking(true)
    try {
      const res = await fetch("/api/github/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectorId: unlinkTarget.linked.connectorId }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(`${unlinkTarget.name} délié`)
      setUnlinkTarget(null)
      startTransition(() => router.refresh())
    } catch (err: any) {
      toast.error("Erreur lors du délien : " + (err.message ?? ""))
    } finally {
      setIsUnlinking(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">GitHub Repositories</h1>
          {user && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
              <img
                src={user.avatar_url}
                alt={user.login}
                className="h-5 w-5 rounded-full"
              />
              <span>{user.name ?? user.login}</span>
              <span className="text-muted-foreground/60">·</span>
              <span>{repos.length} repos</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-brand">{linkedCount} liés</span>
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un repo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={filterVisibility} onValueChange={(v) => setFilterVisibility(v as typeof filterVisibility)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            <SelectItem value="public">Public</SelectItem>
            <SelectItem value="private">Privé</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterLanguage} onValueChange={setFilterLanguage}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Langage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les langages</SelectItem>
            {detectedLanguages.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterLinked} onValueChange={(v) => setFilterLinked(v as typeof filterLinked)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="linked">Liés</SelectItem>
            <SelectItem value="unlinked">Non liés</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-sm text-muted-foreground ml-auto">
          {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Repos grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <GitBranch className="h-10 w-10 opacity-30" />
          <p>Aucun repository trouvé</p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((repo) => (
            <RepoCard
              key={repo.id}
              repo={repo}
              onLink={() => {
                setLinkTarget(repo)
                setSelectedProjectId(repo.linked?.projectId ?? "")
              }}
              onUnlink={() => setUnlinkTarget(repo)}
            />
          ))}
        </div>
      )}

      {/* Link dialog */}
      <Dialog open={!!linkTarget} onOpenChange={(open) => !open && setLinkTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lier à un projet Neobridge</DialogTitle>
            <DialogDescription>
              Sélectionnez le projet auquel rattacher{" "}
              <span className="font-mono text-foreground">{linkTarget?.full_name}</span>.
            </DialogDescription>
          </DialogHeader>

          {linkTarget?.linked && (
            <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
              Ce repo est déjà lié à <strong>{linkTarget.linked.projectName}</strong>.
              En confirmant, le lien existant sera remplacé.
            </div>
          )}

          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un projet…" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkTarget(null)}>
              Annuler
            </Button>
            <Button
              onClick={handleLink}
              disabled={!selectedProjectId || isLinking}
            >
              {isLinking ? "Liaison…" : "Lier le repo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink confirm dialog */}
      <Dialog open={!!unlinkTarget} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le lien</DialogTitle>
            <DialogDescription>
              Délier{" "}
              <span className="font-mono text-foreground">{unlinkTarget?.full_name}</span>
              {" "}du projet <strong>{unlinkTarget?.linked?.projectName}</strong> ?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlinkTarget(null)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleUnlink}
              disabled={isUnlinking}
            >
              {isUnlinking ? "Suppression…" : "Supprimer le lien"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// RepoCard
// ---------------------------------------------------------------------------

interface RepoCardProps {
  repo: AnnotatedRepo
  onLink: () => void
  onUnlink: () => void
}

function RepoCard({ repo, onLink, onUnlink }: RepoCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-xl border bg-card p-4 transition-shadow hover:shadow-md",
        repo.linked && "border-brand/40 bg-brand/5",
        repo.archived && "opacity-60",
      )}
    >
      {/* Top row */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm truncate">{repo.name}</span>
            {repo.private ? (
              <Badge variant="outline" className="text-xs py-0 gap-1">
                <Lock className="h-3 w-3" /> Privé
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs py-0 gap-1">
                <Globe className="h-3 w-3" /> Public
              </Badge>
            )}
            {repo.archived && (
              <Badge variant="outline" className="text-xs py-0 gap-1 text-muted-foreground">
                <Archive className="h-3 w-3" /> Archivé
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">{repo.owner.login}</p>
        </div>

        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          title="Ouvrir sur GitHub"
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Description */}
      {repo.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{repo.description}</p>
      )}

      {/* Meta row */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        {repo.language && (
          <span className="flex items-center gap-1">
            <CircleDot className="h-3 w-3" />
            {repo.language}
          </span>
        )}
        {repo.stargazers_count > 0 && (
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3" />
            {repo.stargazers_count}
          </span>
        )}
        {repo.forks_count > 0 && (
          <span className="flex items-center gap-1">
            <GitFork className="h-3 w-3" />
            {repo.forks_count}
          </span>
        )}
        <span className="flex items-center gap-1 ml-auto">
          <GitBranch className="h-3 w-3" />
          {repo.default_branch}
        </span>
        <span>{timeAgo(repo.pushed_at)}</span>
      </div>

      {/* Linked badge or action */}
      <div className="flex items-center justify-between mt-auto pt-2 border-t">
        {repo.linked ? (
          <>
            <span className="flex items-center gap-1.5 text-xs font-medium text-brand">
              <Link2 className="h-3.5 w-3.5" />
              {repo.linked.projectName}
            </span>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={onLink}
                title="Changer de projet"
              >
                Changer
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive hover:text-destructive"
                onClick={onUnlink}
                title="Supprimer le lien"
              >
                <Link2Off className="h-3.5 w-3.5" />
              </Button>
            </div>
          </>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 ml-auto"
            onClick={onLink}
          >
            <Link2 className="h-3.5 w-3.5" />
            Lier à un projet
          </Button>
        )}
      </div>
    </div>
  )
}

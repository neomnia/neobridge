"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Trash2, ExternalLink, Server, Database, Bot, Globe, Cpu } from "lucide-react"
import type { ProjectResource } from "@/db/schema"

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

const PROVIDER_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  vercel:   "default",
  railway:  "secondary",
  scaleway: "outline",
  neon:     "secondary",
  none:     "outline",
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  active:    "default",
  inactive:  "outline",
  error:     "secondary",
  deploying: "secondary",
}

const STATUS_LABEL: Record<string, string> = {
  active:    "Actif",
  inactive:  "Inactif",
  error:     "Erreur",
  deploying: "En déploiement",
}

const RESOURCE_TYPE_ICON: Record<string, React.ElementType> = {
  frontend: Globe,
  backend:  Server,
  worker:   Cpu,
  script:   Cpu,
  database: Database,
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ResourceCardProps {
  resource: ProjectResource
  projectId: string
  onDeleted: (id: string) => void
}

export function ResourceCard({ resource, projectId, onDeleted }: ResourceCardProps) {
  const [deleteOnVercel, setDeleteOnVercel] = useState(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const TypeIcon = RESOURCE_TYPE_ICON[resource.resourceType] ?? Server

  const handleDelete = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/projects/${projectId}/resources`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resourceId: resource.id,
          deleteOnVercel: resource.provider === "vercel" ? deleteOnVercel : false,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
      }

      onDeleted(resource.id)
      setOpen(false)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <TypeIcon className="h-4 w-4 text-muted-foreground shrink-0" />
            <h3 className="font-semibold text-base truncate">{resource.name}</h3>
          </div>
          <Badge variant={STATUS_VARIANT[resource.status] ?? "outline"} className="shrink-0">
            {STATUS_LABEL[resource.status] ?? resource.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={PROVIDER_VARIANT[resource.provider] ?? "outline"}>
            {resource.provider}
          </Badge>
          <span className="text-xs text-muted-foreground capitalize">
            {resource.resourceType}
          </span>
          <span className="text-xs text-muted-foreground">
            via {resource.credentialSource}
          </span>
        </div>

        {resource.url && (
          <a
            href={resource.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-brand hover:underline truncate"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            {resource.url}
          </a>
        )}

        {resource.branch && (
          <p className="text-xs text-muted-foreground">
            Branche : <span className="font-mono">{resource.branch}</span>
          </p>
        )}

        {/* Delete action */}
        <div className="pt-1">
          <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 w-full justify-start gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer la ressource ?</AlertDialogTitle>
                <AlertDialogDescription>
                  La ressource <strong>{resource.name}</strong> sera retirée de NeoBridge.
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>

              {/* Vercel option — visible uniquement si provider = vercel */}
              {resource.provider === "vercel" && (
                <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 my-2">
                  <Checkbox
                    id="delete-vercel"
                    checked={deleteOnVercel}
                    onCheckedChange={(v) => setDeleteOnVercel(Boolean(v))}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="delete-vercel" className="text-sm font-medium cursor-pointer">
                      Supprimer aussi sur Vercel
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Supprime définitivement le projet Vercel{" "}
                      {resource.externalResourceId
                        ? `(${resource.externalResourceId})`
                        : "associé"}{" "}
                      via l'API Admin. Non récupérable.
                    </p>
                  </div>
                </div>
              )}

              {error && (
                <p className="text-sm text-destructive rounded-md bg-destructive/10 px-3 py-2">
                  {error}
                </p>
              )}

              <AlertDialogFooter>
                <AlertDialogCancel disabled={loading}>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault()
                    handleDelete()
                  }}
                  disabled={loading}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {loading ? "Suppression…" : deleteOnVercel ? "Supprimer de NeoBridge + Vercel" : "Supprimer de NeoBridge"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  )
}

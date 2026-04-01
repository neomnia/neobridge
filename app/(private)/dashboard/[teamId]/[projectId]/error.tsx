"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function ProjectError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[ProjectLayout] Error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-20">
      <AlertTriangle className="h-12 w-12 text-destructive/60" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Erreur de chargement du projet</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          {error.message || "Impossible de charger ce projet. L'intégration Vercel ou la base de données est peut-être indisponible."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">{error.digest}</p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={reset} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/projects">Retour aux projets</Link>
        </Button>
      </div>
    </div>
  )
}

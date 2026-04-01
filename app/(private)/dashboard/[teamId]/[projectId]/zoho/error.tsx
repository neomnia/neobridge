"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ZohoError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[ZohoPage] Error:", error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center py-20">
      <AlertTriangle className="h-12 w-12 text-destructive/60" />
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Erreur lors du chargement Zoho</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          {error.message || "Une erreur inattendue s'est produite. Vérifiez les credentials Zoho dans Admin → API Management."}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">{error.digest}</p>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={reset} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Réessayer
      </Button>
    </div>
  )
}

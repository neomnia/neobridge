'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard] Error:', error)
  }, [error])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Cockpit global NeoBridge</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Une erreur est survenue lors du chargement du cockpit.
        </p>
      </div>

      <Card className="border-destructive/50">
        <CardContent className="p-8 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <div>
            <p className="font-medium">Impossible de charger le tableau de bord</p>
            <p className="text-sm text-muted-foreground mt-1">
              La connexion aux services a échoué. Cela peut être temporaire.
            </p>
          </div>
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

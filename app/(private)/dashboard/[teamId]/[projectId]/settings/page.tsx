'use client'

import { Settings, ArrowRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">Paramètres</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Configuration du projet
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 text-sm text-muted-foreground">
            <div className="flex-1">
              <p className="font-medium text-foreground mb-1">Clés API & Connecteurs</p>
              <p>
                La gestion des clés API (Vercel, Railway, Anthropic, Zoho…) est centralisée dans{' '}
                <Link href="/admin/api" className="text-primary underline-offset-4 hover:underline inline-flex items-center gap-1">
                  Admin → API Management
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Shield } from 'lucide-react'

interface AutomationRule {
  key: string
  label: string
  description: string
  value: boolean
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    key:         'blockOnDestructiveChange',
    label:       'Bloquer les changements destructifs',
    description: "Empêche le déploiement si des migrations destructives sont détectées",
    value:       true,
  },
  {
    key:         'crossPlatformSync',
    label:       'Synchronisation cross-platform',
    description: "Synchronise automatiquement les changements entre Vercel, Railway et Scaleway",
    value:       false,
  },
  {
    key:         'requireHumanValidation',
    label:       'Validation humaine requise',
    description: "Exige une approbation manuelle avant tout déploiement en production",
    value:       true,
  },
  {
    key:         'syncZohoOnlyAfterFullSuccess',
    label:       'Sync Zoho après succès complet',
    description: "Ne met à jour les tâches Zoho qu'une fois tous les déploiements réussis",
    value:       true,
  },
]

export default function GovernancePage() {
  const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_RULES)

  const toggle = (key: string) => {
    setRules((prev) =>
      prev.map((r) => (r.key === key ? { ...r, value: !r.value } : r)),
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-muted-foreground" />
        <div>
          <h2 className="text-xl font-semibold">Gouvernance</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Règles de déploiement et d&apos;automatisation du projet
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Règles d&apos;automatisation</CardTitle>
          <CardDescription>
            Configurez les comportements automatiques lors des déploiements
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {rules.map((rule) => (
            <div key={rule.key} className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Label
                  htmlFor={rule.key}
                  className="text-sm font-medium cursor-pointer"
                >
                  {rule.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
              </div>
              <Switch
                id={rule.key}
                checked={rule.value}
                onCheckedChange={() => toggle(rule.key)}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

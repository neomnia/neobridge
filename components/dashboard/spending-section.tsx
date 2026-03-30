"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, Zap, Database, Bot, Train, RefreshCw } from 'lucide-react'
import { AnthropicTokenChart, NeonComputeChart } from './spending-charts'
import type { SpendingData } from '@/app/api/dashboard/spending/route'

const SERVICE_ICONS: Record<string, React.ReactNode> = {
  vercel:    <Zap className="h-4 w-4" />,
  railway:   <Train className="h-4 w-4" />,
  neon:      <Database className="h-4 w-4" />,
  anthropic: <Bot className="h-4 w-4" />,
}

export function SpendingSection() {
  const [data, setData] = useState<SpendingData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/spending')
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Dépenses du mois</h2>
          <Badge variant="outline" className="text-[10px] font-mono">mars 2026</Badge>
        </div>
        <button
          onClick={fetchData}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Cost cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(data?.services ?? PLACEHOLDER_SERVICES).map((svc) => (
          <Card key={svc.name} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {SERVICE_ICONS[svc.name] ?? <DollarSign className="h-4 w-4" />}
                </div>
                <span
                  className={`h-2 w-2 rounded-full mt-1 ${
                    svc.status === 'ok'           ? 'bg-green-500'
                    : svc.status === 'error'      ? 'bg-red-500'
                    : 'bg-muted-foreground/40'
                  }`}
                  title={svc.status}
                />
              </div>
              <div className="mt-3">
                <p className="text-xs text-muted-foreground">{svc.label}</p>
                <p className="text-xl font-bold mt-0.5">
                  {loading ? (
                    <span className="inline-block h-5 w-12 rounded bg-muted animate-pulse" />
                  ) : svc.amount != null ? (
                    `${svc.unit}${svc.amount.toFixed(2)}`
                  ) : (
                    <span className="text-muted-foreground text-base">—</span>
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5" /> Anthropic — tokens / jour
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data ? (
              <AnthropicTokenChart data={data.anthropicTokensDaily} />
            ) : (
              <div className="h-[120px] rounded bg-muted animate-pulse" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3.5 w-3.5" /> Neon — compute / jour (h)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data ? (
              <NeonComputeChart data={data.neonComputeDaily} />
            ) : (
              <div className="h-[120px] rounded bg-muted animate-pulse" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

const PLACEHOLDER_SERVICES = [
  { name: 'vercel',    label: 'Vercel',    amount: null, unit: '$', status: 'unconfigured' as const, currency: 'USD', configured: false },
  { name: 'railway',   label: 'Railway',   amount: null, unit: '$', status: 'unconfigured' as const, currency: 'USD', configured: false },
  { name: 'neon',      label: 'Neon DB',   amount: null, unit: 'h', status: 'unconfigured' as const, currency: 'USD', configured: false },
  { name: 'anthropic', label: 'Anthropic', amount: null, unit: '$', status: 'unconfigured' as const, currency: 'USD', configured: false },
]

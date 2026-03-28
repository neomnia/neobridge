'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Server, Database, TrendingUp, Cpu, DollarSign, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AreaChart, Area, BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts'

interface SpendingData {
  vercel:    { current: number | null; period: string } | null
  neon:      { computeHours: number; period: string; daily?: { date: string; computeHours: number }[] } | null
  railway:   { current: number | null; period: string; cpu?: number | null; memory?: number | null } | null
  anthropic: { current: number | null; inputTokens: number; outputTokens: number; period: string; daily?: { date: string; inputTokens: number; outputTokens: number }[] } | null
  openai:    { tokens: number; period: string; daily?: { date: string; tokens: number }[] } | null
}

export default function ProjectCostsPage() {
  const [data, setData]       = useState<SpendingData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/dashboard/spending')
      if (r.ok) setData(await r.json())
    } catch {} finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalMonthly =
    (data?.vercel?.current   ?? 0) +
    (data?.railway?.current  ?? 0) +
    (data?.anthropic?.current ?? 0)

  if (loading) return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[0,1,2,3].map(i => <Card key={i} className="px-4 py-3"><Skeleton className="h-3 w-14 mb-2" /><Skeleton className="h-7 w-20" /></Card>)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card className="px-4 py-3"><Skeleton className="h-[120px] w-full" /></Card>
        <Card className="px-4 py-3"><Skeleton className="h-[120px] w-full" /></Card>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Coûts — {data?.vercel?.period ?? data?.railway?.period ?? new Date().toISOString().slice(0,7)}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={load} className="h-7 gap-1.5 text-xs">
          <RefreshCw className="h-3 w-3" />Rafraîchir
        </Button>
      </div>

      {/* Total + cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card className="col-span-2 sm:col-span-1 px-4 py-3 border-primary/30 bg-primary/5">
          <div className="text-[11px] text-muted-foreground mb-1">Total estimé</div>
          <p className="text-xl font-bold">${totalMonthly.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">ce mois</p>
        </Card>
        <Card className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <svg className="h-3 w-3" viewBox="0 0 32 32" fill="currentColor"><path d="M16 4L28 24H4L16 4Z"/></svg>Vercel
          </div>
          <p className="text-lg font-bold">
            {data?.vercel?.current != null ? `$${data.vercel.current.toFixed(2)}` : <span className="text-muted-foreground text-sm">—</span>}
          </p>
        </Card>
        <Card className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <Server className="h-3 w-3" />Railway
          </div>
          <p className="text-lg font-bold">
            {data?.railway?.current != null ? `$${data.railway.current.toFixed(2)}` : <span className="text-muted-foreground text-sm">—</span>}
          </p>
          {(data?.railway?.cpu != null || data?.railway?.memory != null) && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {data?.railway?.cpu != null && `CPU ${data.railway.cpu.toFixed(1)}%`}
              {data?.railway?.memory != null && ` · ${data.railway.memory}MB`}
            </p>
          )}
        </Card>
        <Card className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <Database className="h-3 w-3" />Neon
          </div>
          <p className="text-lg font-bold">
            {data?.neon?.computeHours != null ? `${data.neon.computeHours.toFixed(1)}h` : <span className="text-muted-foreground text-sm">—</span>}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">compute</p>
        </Card>
        <Card className="px-4 py-3">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <TrendingUp className="h-3 w-3" />LLM
          </div>
          <p className="text-lg font-bold">
            {data?.anthropic?.current != null ? `$${data.anthropic.current.toFixed(2)}` : <span className="text-muted-foreground text-sm">—</span>}
          </p>
          {data?.anthropic && <p className="text-[10px] text-muted-foreground mt-0.5">{((data.anthropic.inputTokens + data.anthropic.outputTokens) / 1000).toFixed(0)}k tokens</p>}
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" />Anthropic — tokens / jour
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data?.anthropic?.daily && data.anthropic.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={data.anthropic.daily} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="cOut" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(val: number, name: string) => [val.toLocaleString(), name === 'inputTokens' ? 'Input' : 'Output']} />
                  <Area type="monotone" dataKey="inputTokens"  stroke="#8b5cf6" fill="url(#cIn)"  strokeWidth={1.5} dot={false} />
                  <Area type="monotone" dataKey="outputTokens" stroke="#06b6d4" fill="url(#cOut)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Cpu className="h-3.5 w-3.5" />OpenAI tokens · Neon compute
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {data?.openai?.daily && data.openai.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data.openai.daily} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(val: number) => [val.toLocaleString(), 'Tokens']} />
                  <Bar dataKey="tokens" fill="#10b981" radius={[2, 2, 0, 0]} maxBarSize={12} />
                </BarChart>
              </ResponsiveContainer>
            ) : data?.neon?.daily && data.neon.daily.length > 0 ? (
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={data.neon.daily} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="cNeon" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(val: number) => [`${val.toFixed(2)}h`, 'Compute']} />
                  <Area type="monotone" dataKey="computeHours" stroke="#10b981" fill="url(#cNeon)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <div className="h-[120px] flex items-center justify-center text-xs text-muted-foreground">Pas de données</div>}
          </CardContent>
        </Card>
      </div>

    </div>
  )
}

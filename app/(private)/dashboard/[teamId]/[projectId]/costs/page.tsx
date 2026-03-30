"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DollarSign, Zap, Database, Bot, GitBranch, RefreshCw, TrendingUp } from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ---------------------------------------------------------------------------
// Mock data helpers (billing APIs to be wired)
// ---------------------------------------------------------------------------

function makeSpendingHistory(days = 30) {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    return {
      date: d.toISOString().slice(0, 10),
      vercel: parseFloat((Math.random() * 0.5 + 0.1).toFixed(3)),
      neon:   parseFloat((Math.random() * 0.3 + 0.05).toFixed(3)),
    }
  })
}

const SERVICES = [
  {
    id: 'vercel',
    label: 'Vercel',
    icon: Zap,
    plan: 'Pro',
    region: 'IAD1 (Washington)',
    monthlyEstimate: null as number | null,
    status: 'active',
  },
  {
    id: 'neon',
    label: 'Neon DB',
    icon: Database,
    plan: 'Free tier',
    region: 'AWS us-east-1',
    monthlyEstimate: null as number | null,
    status: 'active',
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Chat)',
    icon: Bot,
    plan: 'Pay-per-use',
    region: 'Global',
    monthlyEstimate: null as number | null,
    status: 'active',
  },
  {
    id: 'github',
    label: 'GitHub Actions',
    icon: GitBranch,
    plan: 'Free',
    region: 'Global',
    monthlyEstimate: 0,
    status: 'active',
  },
]

function shortDate(iso: string) {
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CostsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [history] = useState(() => makeSpendingHistory(30))
  const [lastRefresh] = useState(() => new Date())
  const [spinning, setSpinning] = useState(false)

  const handleRefresh = () => {
    setSpinning(true)
    setTimeout(() => setSpinning(false), 1000)
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-muted-foreground" />
          <div>
            <h2 className="text-xl font-semibold">Coûts & Facturation</h2>
            <p className="text-muted-foreground text-sm mt-0.5">
              Projet <span className="font-mono text-foreground">{projectId}</span> · Mars 2026
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Actualisé {formatDistanceToNow(lastRefresh, { addSuffix: true, locale: fr })}
          </span>
          <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleRefresh}>
            <RefreshCw className={`h-3.5 w-3.5 ${spinning ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {SERVICES.map(({ id, label, icon: Icon, monthlyEstimate }) => (
          <Card key={id}>
            <CardContent className="p-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-muted-foreground mb-3">
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-xl font-bold mt-0.5">
                {monthlyEstimate != null
                  ? `$${monthlyEstimate.toFixed(2)}`
                  : <span className="text-muted-foreground text-base">—</span>}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Spend chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Évolution des coûts — 30 derniers jours
            <Badge variant="outline" className="ml-auto text-[10px]">Données estimées</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={history} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="vercelGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#000000" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#000000" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="neonGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00e5bf" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#00e5bf" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                tickFormatter={shortDate}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                interval={6}
              />
              <YAxis
                tickFormatter={(v) => `$${v}`}
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 11,
                }}
                formatter={(v: number, name: string) => [`$${v.toFixed(3)}`, name]}
                labelFormatter={shortDate}
              />
              <Area type="monotone" dataKey="vercel" name="Vercel" stroke="#000" strokeWidth={1.5} fill="url(#vercelGrad)" dot={false} />
              <Area type="monotone" dataKey="neon"   name="Neon"   stroke="#00e5bf" strokeWidth={1.5} fill="url(#neonGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Services table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Détail des services</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead className="hidden sm:table-cell">Région</TableHead>
                <TableHead className="text-right">Estimation mois</TableHead>
                <TableHead className="text-right">Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {SERVICES.map(({ id, label, icon: Icon, plan, region, monthlyEstimate, status }) => (
                <TableRow key={id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{label}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{plan}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{region}</TableCell>
                  <TableCell className="text-right text-sm font-mono">
                    {monthlyEstimate != null ? `$${monthlyEstimate.toFixed(2)}` : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={status === 'active' ? 'default' : 'outline'}
                      className={`text-xs ${
                        status === 'active'
                          ? 'bg-green-500/15 text-green-700 hover:bg-green-500/15 border-transparent'
                          : ''
                      }`}
                    >
                      {status === 'active' ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Les montants exacts seront disponibles une fois les APIs de facturation (Vercel Billing, Neon Usage) connectées.
      </p>
    </div>
  )
}

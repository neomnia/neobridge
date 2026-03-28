import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { serviceApiRepository } from '@/lib/services/repository'

// ─── Vercel ────────────────────────────────────────────────────────────────────
// GET /v2/billing → monthly spend + usage metrics
async function fetchVercelSpending(token: string) {
  try {
    const r = await fetch('https://api.vercel.com/v2/billing', {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 300 },
    })
    if (!r.ok) return null
    const d = await r.json()
    // d.period, d.charges (array), d.total
    const total = d.invoice?.total ?? d.charges?.reduce((s: number, c: any) => s + (c.total ?? 0), 0) ?? 0
    const period = d.period ?? d.invoice?.period
    return {
      service: 'vercel',
      label: 'Vercel',
      currency: 'USD',
      current: total / 100,          // cents → dollars
      period: period?.start ? period.start.slice(0, 7) : new Date().toISOString().slice(0, 7),
      breakdown: (d.charges ?? []).map((c: any) => ({ name: c.type ?? c.name ?? 'Usage', value: (c.total ?? 0) / 100 })),
    }
  } catch { return null }
}

// ─── Neon ──────────────────────────────────────────────────────────────────────
// GET /v2/consumption_history/account → compute + storage + data transfer
async function fetchNeonSpending(token: string) {
  try {
    const now    = new Date()
    const from   = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const to     = now.toISOString()
    const r = await fetch(
      `https://console.neon.tech/api/v2/consumption_history/account?from=${from}&to=${to}&granularity=daily`,
      { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }, next: { revalidate: 300 } }
    )
    if (!r.ok) return null
    const d = await r.json()
    // d.periods[].consumption: { active_time_seconds, compute_time_seconds, written_data_bytes, ... }
    const periods: any[] = d.periods ?? []
    // Build daily series for chart
    const daily = periods.map((p: any) => ({
      date: p.period_start?.slice(0, 10) ?? '',
      computeHours: Math.round((p.consumption?.compute_time_seconds ?? 0) / 3600 * 100) / 100,
      writtenGB: Math.round((p.consumption?.written_data_bytes ?? 0) / 1e9 * 1000) / 1000,
    }))
    const totalCompute = daily.reduce((s, d) => s + d.computeHours, 0)
    return {
      service: 'neon',
      label: 'Neon',
      currency: 'USD',
      current: null, // Neon doesn't expose $ via this endpoint
      computeHours: Math.round(totalCompute * 100) / 100,
      period: now.toISOString().slice(0, 7),
      daily,
    }
  } catch { return null }
}

// ─── Railway ───────────────────────────────────────────────────────────────────
async function fetchRailwaySpending(token: string) {
  try {
    const r = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          me {
            usage {
              estimated { dollars }
              current { cpuPercent memoryMegabytes networkMegabytes }
            }
          }
        }`,
      }),
      next: { revalidate: 300 },
    })
    if (!r.ok) return null
    const d = await r.json()
    const usage = d.data?.me?.usage
    if (!usage) return null
    return {
      service: 'railway',
      label: 'Railway',
      currency: 'USD',
      current: usage.estimated?.dollars ?? null,
      period: new Date().toISOString().slice(0, 7),
      cpu: usage.current?.cpuPercent ?? null,
      memory: usage.current?.memoryMegabytes ?? null,
      network: usage.current?.networkMegabytes ?? null,
    }
  } catch { return null }
}

// ─── Anthropic ─────────────────────────────────────────────────────────────────
// GET /v1/usage — returns token usage per model per day
async function fetchAnthropicUsage(apiKey: string) {
  try {
    const now  = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const r = await fetch(
      `https://api.anthropic.com/v1/usage?start_date=${from}&end_date=${now.toISOString().slice(0, 10)}&granularity=day`,
      { headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }, next: { revalidate: 300 } }
    )
    if (!r.ok) return null
    const d = await r.json()
    const daily = (d.data ?? []).map((e: any) => ({
      date: e.date,
      inputTokens: e.input_tokens ?? 0,
      outputTokens: e.output_tokens ?? 0,
      cost: e.cost_usd ?? null,
    }))
    const totalInput  = daily.reduce((s: number, d: any) => s + d.inputTokens, 0)
    const totalOutput = daily.reduce((s: number, d: any) => s + d.outputTokens, 0)
    const totalCost   = daily.reduce((s: number, d: any) => s + (d.cost ?? 0), 0)
    return { service: 'anthropic', label: 'Anthropic', currency: 'USD', current: totalCost || null, inputTokens: totalInput, outputTokens: totalOutput, period: from.slice(0, 7), daily }
  } catch { return null }
}

// ─── OpenAI ────────────────────────────────────────────────────────────────────
async function fetchOpenAIUsage(apiKey: string) {
  try {
    const now  = new Date()
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    // OpenAI usage endpoint: GET /v1/usage?date=YYYY-MM-DD (one day at a time, so we use billing)
    const r = await fetch(
      `https://api.openai.com/v1/usage?start_time=${Math.floor(from.getTime()/1000)}&end_time=${Math.floor(now.getTime()/1000)}`,
      { headers: { Authorization: `Bearer ${apiKey}` }, next: { revalidate: 300 } }
    )
    if (!r.ok) return null
    const d = await r.json()
    const daily = Object.entries(
      (d.data ?? []).reduce((acc: Record<string, any>, e: any) => {
        const date = new Date(e.aggregation_timestamp * 1000).toISOString().slice(0, 10)
        if (!acc[date]) acc[date] = { date, tokens: 0 }
        acc[date].tokens += (e.n_context_tokens_total ?? 0) + (e.n_generated_tokens_total ?? 0)
        return acc
      }, {})
    ).map(([, v]) => v)
    const totalTokens = daily.reduce((s: number, d: any) => s + d.tokens, 0)
    return { service: 'openai', label: 'OpenAI', currency: 'USD', current: null, tokens: totalTokens, period: from.toISOString().slice(0, 7), daily }
  } catch { return null }
}

// ─── Handler ───────────────────────────────────────────────────────────────────
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [vercelCfg, neonCfg, railwayCfg, anthropicCfg, openaiCfg] = await Promise.all([
    serviceApiRepository.getConfig('vercel'    as any, 'production') as Promise<any>,
    serviceApiRepository.getConfig('neon'      as any, 'production') as Promise<any>,
    serviceApiRepository.getConfig('railway'   as any, 'production') as Promise<any>,
    serviceApiRepository.getConfig('anthropic' as any, 'production') as Promise<any>,
    serviceApiRepository.getConfig('openai'    as any, 'production') as Promise<any>,
  ])

  const [vercel, neon, railway, anthropic, openai] = await Promise.all([
    vercelCfg?.config?.apiToken    ? fetchVercelSpending(vercelCfg.config.apiToken)      : null,
    neonCfg?.config?.apiKey        ? fetchNeonSpending(neonCfg.config.apiKey)             : null,
    railwayCfg?.config?.apiKey     ? fetchRailwaySpending(railwayCfg.config.apiKey)       : null,
    anthropicCfg?.config?.apiKey   ? fetchAnthropicUsage(anthropicCfg.config.apiKey)      : null,
    openaiCfg?.config?.apiKey      ? fetchOpenAIUsage(openaiCfg.config.apiKey)            : null,
  ])

  return NextResponse.json({ vercel, neon, railway, anthropic, openai })
}

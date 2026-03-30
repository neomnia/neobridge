/**
 * GET /api/dashboard/spending
 * Returns aggregated monthly spending per service.
 * Billing APIs not yet wired — returns null amounts with service availability.
 */

import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { serviceApiRepository } from '@/lib/services'

export interface SpendingService {
  name: string
  label: string
  amount: number | null   // null = not yet fetched
  currency: string
  unit: string            // '$', 'h', 'tokens'
  configured: boolean
  status: 'ok' | 'error' | 'unconfigured'
}

export interface SpendingData {
  services: SpendingService[]
  anthropicTokensDaily: { date: string; tokens: number }[]
  neonComputeDaily: { date: string; hours: number }[]
  fetchedAt: string
}

const SERVICE_NAMES = ['vercel', 'neon', 'anthropic', 'github'] as const

export async function GET() {
  try {
    await requireAuth()

    // Check which services are configured
    const configs = await Promise.all(
      SERVICE_NAMES.map(async (name) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const cfg = await serviceApiRepository.getConfig(name as any, 'production')
        return { name, configured: !!cfg && cfg.isActive }
      }),
    )

    const services: SpendingService[] = [
      {
        name: 'vercel',
        label: 'Vercel',
        amount: null,
        currency: 'USD',
        unit: '$',
        configured: configs.find((c) => c.name === 'vercel')?.configured ?? false,
        status: configs.find((c) => c.name === 'vercel')?.configured ? 'ok' : 'unconfigured',
      },
      {
        name: 'railway',
        label: 'Railway',
        amount: null,
        currency: 'USD',
        unit: '$',
        configured: false,
        status: 'unconfigured',
      },
      {
        name: 'neon',
        label: 'Neon DB',
        amount: null,
        currency: 'USD',
        unit: 'h',
        configured: configs.find((c) => c.name === 'neon')?.configured ?? false,
        status: configs.find((c) => c.name === 'neon')?.configured ? 'ok' : 'unconfigured',
      },
      {
        name: 'anthropic',
        label: 'Anthropic',
        amount: null,
        currency: 'USD',
        unit: '$',
        configured: configs.find((c) => c.name === 'anthropic')?.configured ?? false,
        status: configs.find((c) => c.name === 'anthropic')?.configured ? 'ok' : 'unconfigured',
      },
    ]

    // Mock time-series until billing APIs are wired
    const today = new Date()
    const anthropicTokensDaily = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (13 - i))
      return {
        date: d.toISOString().slice(0, 10),
        tokens: Math.floor(Math.random() * 80000 + 20000),
      }
    })

    const neonComputeDaily = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() - (13 - i))
      return {
        date: d.toISOString().slice(0, 10),
        hours: parseFloat((Math.random() * 3 + 0.5).toFixed(2)),
      }
    })

    const data: SpendingData = {
      services,
      anthropicTokensDaily,
      neonComputeDaily,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

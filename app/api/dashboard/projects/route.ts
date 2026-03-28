import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { serviceApiRepository } from '@/lib/services/repository'

// ─── Vercel projects ──────────────────────────────────────────────────────────

async function fetchVercelProjects(token: string) {
  try {
    const r = await fetch('https://api.vercel.com/v9/projects?limit=20', {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 30 },
    })
    if (!r.ok) return []
    const data = await r.json()
    const projects = data.projects ?? []

    return projects.map((p: any) => {
      const latest = p.latestDeployments?.[0]
      return {
        id: p.id,
        name: p.name,
        source: 'vercel' as const,
        url: `https://${p.alias?.[0]?.domain ?? p.name + '.vercel.app'}`,
        status: latest?.readyState ?? 'UNKNOWN',  // READY | BUILDING | ERROR | CANCELED
        updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : null,
        framework: p.framework ?? null,
      }
    })
  } catch {
    return []
  }
}

// ─── Railway projects ─────────────────────────────────────────────────────────

async function fetchRailwayProjects(token: string) {
  try {
    const r = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `{
          projects {
            edges {
              node {
                id name description createdAt updatedAt
                environments { edges { node { id name } } }
                services { edges { node { id name } } }
              }
            }
          }
        }`,
      }),
      next: { revalidate: 30 },
    })
    if (!r.ok) return []
    const data = await r.json()
    const edges = data.data?.projects?.edges ?? []

    return edges.map(({ node: p }: any) => ({
      id: p.id,
      name: p.name,
      source: 'railway' as const,
      url: null,
      status: 'RUNNING' as const,
      updatedAt: p.updatedAt ?? null,
      services: p.services?.edges?.map((e: any) => e.node.name) ?? [],
      environments: p.environments?.edges?.map((e: any) => e.node.name) ?? [],
    }))
  } catch {
    return []
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [vercelCfg, railwayCfg] = await Promise.all([
    serviceApiRepository.getConfig('vercel' as any, 'production') as Promise<any>,
    serviceApiRepository.getConfig('railway' as any, 'production') as Promise<any>,
  ])

  const [vercel, railway] = await Promise.all([
    vercelCfg?.config?.apiToken ? fetchVercelProjects(vercelCfg.config.apiToken) : [],
    railwayCfg?.config?.apiKey  ? fetchRailwayProjects(railwayCfg.config.apiKey)  : [],
  ])

  return NextResponse.json({ vercel, railway })
}

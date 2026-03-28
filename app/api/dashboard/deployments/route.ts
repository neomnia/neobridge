import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import { serviceApiRepository } from '@/lib/services/repository'

async function fetchVercelDeployments(token: string) {
  try {
    const r = await fetch('https://api.vercel.com/v6/deployments?limit=30', {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: 30 },
    })
    if (!r.ok) return []
    const data = await r.json()
    return (data.deployments ?? []).map((d: any) => ({
      id: d.uid,
      name: d.name,
      source: 'vercel' as const,
      url: d.url ? `https://${d.url}` : null,
      state: d.readyState,         // READY | BUILDING | ERROR | CANCELED | QUEUED
      target: d.target ?? 'preview', // production | preview
      branch: d.meta?.githubCommitRef ?? null,
      commit: d.meta?.githubCommitMessage ?? null,
      commitSha: d.meta?.githubCommitSha?.slice(0, 7) ?? null,
      creator: d.creator?.username ?? null,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
    }))
  } catch { return [] }
}

async function fetchRailwayDeployments(token: string) {
  try {
    const r = await fetch('https://backboard.railway.app/graphql/v2', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{
          me {
            projects {
              edges {
                node {
                  id name
                  deployments(first: 10) {
                    edges {
                      node {
                        id status createdAt
                        service { name }
                        environment { name }
                      }
                    }
                  }
                }
              }
            }
          }
        }`,
      }),
      next: { revalidate: 30 },
    })
    if (!r.ok) return []
    const data = await r.json()
    const projects = data.data?.me?.projects?.edges ?? []
    const result: any[] = []
    for (const { node: project } of projects) {
      for (const { node: d } of project.deployments?.edges ?? []) {
        result.push({
          id: d.id,
          name: project.name,
          source: 'railway' as const,
          url: null,
          state: d.status,   // SUCCESS | FAILED | DEPLOYING | CRASHED | REMOVED
          target: d.environment?.name ?? 'production',
          branch: null,
          commit: null,
          commitSha: null,
          creator: null,
          service: d.service?.name ?? null,
          createdAt: d.createdAt ?? null,
        })
      }
    }
    return result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime())
  } catch { return [] }
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [vercelCfg, railwayCfg] = await Promise.all([
    serviceApiRepository.getConfig('vercel' as any, 'production') as Promise<any>,
    serviceApiRepository.getConfig('railway' as any, 'production') as Promise<any>,
  ])

  const [vercel, railway] = await Promise.all([
    vercelCfg?.config?.apiToken  ? fetchVercelDeployments(vercelCfg.config.apiToken)   : [],
    railwayCfg?.config?.apiKey   ? fetchRailwayDeployments(railwayCfg.config.apiKey)   : [],
  ])

  // Merge and sort by date
  const all = [...vercel, ...railway].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  )

  return NextResponse.json({ deployments: all })
}

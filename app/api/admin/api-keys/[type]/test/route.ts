/**
 * POST /api/admin/api-keys/[type]/test — Teste la connectivité d'un service
 *
 * Requiert : super_admin
 * Effectue un appel léger à l'API du service pour vérifier les credentials
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth/server'
import { resolveCredential, type ApiType } from '@/lib/api-management'

type Params = { params: Promise<{ type: string }> }

// ── Service testers ──────────────────────────────────────────────────────────

async function testService(type: string, teamId?: string): Promise<{ ok: boolean; detail: string }> {
  switch (type) {
    case 'anthropic': {
      const creds = await resolveCredential('anthropic', teamId)
      if (!creds?.apiKey) return { ok: false, detail: 'API key not configured' }
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': creds.apiKey,
          'anthropic-version': '2023-06-01',
        },
      })
      if (res.ok) return { ok: true, detail: 'Anthropic API accessible' }
      return { ok: false, detail: `Anthropic returned ${res.status}` }
    }

    case 'mistral': {
      const creds = await resolveCredential('mistral', teamId)
      if (!creds?.apiKey) return { ok: false, detail: 'API key not configured' }
      const res = await fetch('https://api.mistral.ai/v1/models', {
        headers: { Authorization: `Bearer ${creds.apiKey}` },
      })
      if (res.ok) return { ok: true, detail: 'Mistral API accessible' }
      return { ok: false, detail: `Mistral returned ${res.status}` }
    }

    case 'gemini': {
      const creds = await resolveCredential('gemini' as ApiType, teamId)
      if (!creds?.apiKey) return { ok: false, detail: 'API key not configured' }
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${creds.apiKey}`,
      )
      if (res.ok) return { ok: true, detail: 'Gemini API accessible' }
      return { ok: false, detail: `Gemini returned ${res.status}` }
    }

    case 'perplexity': {
      const creds = await resolveCredential('perplexity' as ApiType, teamId)
      if (!creds?.apiKey) return { ok: false, detail: 'API key not configured' }
      const res = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${creds.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
      })
      // 200 = valid key, 422 might mean valid key but bad request — both prove connectivity
      if (res.ok || res.status === 422) return { ok: true, detail: 'Perplexity API accessible' }
      return { ok: false, detail: `Perplexity returned ${res.status}` }
    }

    case 'github_token':
    case 'github_app': {
      const creds = await resolveCredential(type as ApiType, teamId)
      const token = creds?.token || creds?.personalAccessToken
      if (!token) return { ok: false, detail: 'GitHub token not configured' }
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
      if (res.ok) {
        const data = await res.json()
        return { ok: true, detail: `Authenticated as ${data.login}` }
      }
      return { ok: false, detail: `GitHub returned ${res.status}` }
    }

    case 'neon': {
      const { testNeonConnection } = await import('@/lib/services/neon')
      const result = await testNeonConnection(teamId)
      return { ok: true, detail: `Neon accessible — ${result.projectCount} project(s)` }
    }

    case 'notion': {
      const { testNotionConnection } = await import('@/lib/services/notion')
      const result = await testNotionConnection(teamId)
      return { ok: true, detail: `Notion accessible — Bot: ${result.user}` }
    }

    case 'vercel': {
      const creds = await resolveCredential('vercel', teamId)
      if (!creds?.token) return { ok: false, detail: 'Vercel token not configured' }
      const res = await fetch('https://api.vercel.com/v2/user', {
        headers: { Authorization: `Bearer ${creds.token}` },
      })
      if (res.ok) return { ok: true, detail: 'Vercel API accessible' }
      return { ok: false, detail: `Vercel returned ${res.status}` }
    }

    case 'railway': {
      const creds = await resolveCredential('railway', teamId)
      const token = creds?.token || creds?.accessToken
      if (!token) return { ok: false, detail: 'Railway token not configured' }
      const res = await fetch('https://backboard.railway.com/graphql/v2', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: '{ me { name } }' }),
      })
      if (res.ok) return { ok: true, detail: 'Railway API accessible' }
      return { ok: false, detail: `Railway returned ${res.status}` }
    }

    case 'scaleway': {
      const creds = await resolveCredential('scaleway', teamId)
      if (!creds?.secretKey) return { ok: false, detail: 'Scaleway secret key not configured' }
      const res = await fetch('https://api.scaleway.com/account/v3/projects?page_size=1', {
        headers: { 'X-Auth-Token': creds.secretKey },
      })
      if (res.ok) return { ok: true, detail: 'Scaleway API accessible' }
      return { ok: false, detail: `Scaleway returned ${res.status}` }
    }

    case 'zoho': {
      const creds = await resolveCredential('zoho', teamId)
      if (!creds?.refreshToken && !creds?.accessToken) {
        return { ok: false, detail: 'Zoho credentials not configured' }
      }
      return { ok: true, detail: 'Zoho credentials present (OAuth)' }
    }

    case 'temporal': {
      const creds = await resolveCredential('temporal', teamId)
      if (!creds?.address) return { ok: false, detail: 'Temporal address not configured' }
      return { ok: true, detail: `Temporal configured → ${creds.address}` }
    }

    default:
      return { ok: false, detail: `Unknown service type: ${type}` }
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    await requireSuperAdmin()
    const { type } = await params

    const started = Date.now()
    try {
      const result = await testService(type)
      const duration = Date.now() - started

      return NextResponse.json({
        success: true,
        data: {
          type,
          ...result,
          durationMs: duration,
          testedAt: new Date().toISOString(),
        },
      })
    } catch (err) {
      const duration = Date.now() - started
      const message = err instanceof Error ? err.message : String(err)

      return NextResponse.json({
        success: true,
        data: {
          type,
          ok: false,
          detail: message,
          durationMs: duration,
          testedAt: new Date().toISOString(),
        },
      })
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'Super admin access required' },
      { status: 403 },
    )
  }
}

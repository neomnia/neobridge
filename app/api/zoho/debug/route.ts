/**
 * GET /api/zoho/debug
 * Step-by-step diagnostic for Zoho API connectivity.
 * Tests: creds → token → portals → projects URL construction.
 * Admin-only. Remove or gate this route in production if sensitive.
 */
import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { serviceApiRepository } from '@/lib/services'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const steps: Record<string, unknown> = {}

  // ── Step 1: Read raw config from DB ─────────────────────────────────────────
  let rawConfig: Record<string, unknown> = {}
  try {
    const cfg = await serviceApiRepository.getConfig('zoho', 'production')
    const c = cfg?.config as Record<string, unknown> | undefined
    rawConfig = {
      hasClientId:     !!c?.clientId,
      hasClientSecret: !!c?.clientSecret,
      hasRefreshToken: !!c?.refreshToken,
      portalId_raw:    JSON.stringify(c?.portalId),   // shows invisible chars as \uXXXX
      portalId_length: typeof c?.portalId === 'string' ? c.portalId.length : null,
      portalId_trimmed_length: typeof c?.portalId === 'string' ? c.portalId.trim().length : null,
      domain_raw:      c?.domain,
    }
    steps.step1_db_config = { ok: true, ...rawConfig }
  } catch (err) {
    steps.step1_db_config = { ok: false, error: err instanceof Error ? err.message : String(err) }
    return NextResponse.json({ steps }, { status: 500 })
  }

  // ── Step 2: Normalize domain ─────────────────────────────────────────────────
  const cfg2 = await serviceApiRepository.getConfig('zoho', 'production')
  const c2 = cfg2?.config as Record<string, unknown> | undefined
  const rawDomain = String(c2?.domain ?? process.env.ZOHO_DOMAIN ?? 'zoho.com').trim()
  const domain = rawDomain.startsWith('zoho.') ? rawDomain : `zoho.${rawDomain}`
  const portalId = String(c2?.portalId ?? process.env.ZOHO_PORTAL_ID ?? '').trim().replace(/[\u200B-\u200D\uFEFF\u0000-\u001F]/g, '')
  steps.step2_normalized = { domain, portalId, portalId_is_numeric: /^\d+$/.test(portalId) }

  // ── Step 3: Token refresh ─────────────────────────────────────────────────────
  let accessToken = ''
  try {
    const tokenUrl = `https://accounts.${domain}/oauth/v2/token`
    const params = new URLSearchParams({
      refresh_token: String(c2?.refreshToken ?? '').trim(),
      client_id:     String(c2?.clientId ?? '').trim(),
      client_secret: String(c2?.clientSecret ?? '').trim(),
      grant_type:    'refresh_token',
    })
    const res = await fetch(`${tokenUrl}?${params}`, { method: 'POST' })
    const data = await res.json()
    steps.step3_token = {
      url:        tokenUrl,
      http_status: res.status,
      has_token:  !!data.access_token,
      error:      data.error ?? null,
      expires_in: data.expires_in ?? null,
    }
    if (!data.access_token) {
      return NextResponse.json({ steps }, { status: 200 })
    }
    accessToken = data.access_token
  } catch (err) {
    steps.step3_token = { ok: false, error: err instanceof Error ? err.message : String(err) }
    return NextResponse.json({ steps }, { status: 200 })
  }

  // ── Step 4: GET /portals/ ─────────────────────────────────────────────────────
  let numericPortalId = portalId
  try {
    const portalsUrl = `https://projectsapi.${domain}/api/v3/portals/`
    const res = await fetch(portalsUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    })
    const data = await res.json()
    const portals: Array<{ id?: unknown; id_string?: string; name?: string; link?: string }> =
      data.portals ?? data.login_info?.portals ?? []

    const match = portals.find(p =>
      p.id_string === portalId || p.name === portalId || p.link === portalId
    )
    if (match) numericPortalId = String(match.id ?? match.id_string ?? portalId)
    else if (portals.length === 1) numericPortalId = String(portals[0].id ?? portals[0].id_string ?? portalId)

    steps.step4_portals = {
      url:         portalsUrl,
      http_status: res.status,
      portals_found: portals.length,
      portals_ids:   portals.map(p => ({ id: p.id, id_string: p.id_string, name: p.name, link: p.link })),
      matched_id:    numericPortalId,
      error:         (data.code ?? data.error) ?? null,
    }
  } catch (err) {
    steps.step4_portals = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  // ── Step 5: Test /projects/ endpoint ─────────────────────────────────────────
  try {
    const projectsUrl = `https://projectsapi.${domain}/api/v3/portal/${numericPortalId}/projects/`
    const res = await fetch(projectsUrl, {
      headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
    })
    const data = await res.json()
    steps.step5_projects = {
      url:          projectsUrl,
      http_status:  res.status,
      projects_count: (data.projects ?? []).length,
      error:        (data.code ?? data.error) ?? null,
      raw_keys:     Object.keys(data),
    }
  } catch (err) {
    steps.step5_projects = { ok: false, error: err instanceof Error ? err.message : String(err) }
  }

  return NextResponse.json({ steps }, { status: 200 })
}

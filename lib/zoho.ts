/**
 * Zoho Projects API client
 * Handles OAuth token refresh and API calls.
 *
 * Credential resolution order:
 *   1. service_api_configs DB (Admin → API Management → Zoho)
 *   2. Environment variables (ZOHO_CLIENT_ID, etc.) as fallback
 *
 * ZOHO_DOMAIN accepts both short forms ("com", "eu", "in") and full forms
 * ("zoho.com", "zoho.eu") — both are normalized to the full form.
 */

import { serviceApiRepository } from '@/lib/services'

interface ZohoDbConfig {
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  /** Portal slug — visible in https://projects.zoho.com/portal/<portalId> */
  portalId?: string
  /** Zoho datacenter: "com" | "eu" | "in" | "zoho.com" | "zoho.eu" */
  domain?: string
}

let cachedToken: { access_token: string; expires_at: number } | null = null

/**
 * Normalizes domain to full form: "com" → "zoho.com", "eu" → "zoho.eu"
 * "zoho.com" and "zoho.eu" are returned as-is.
 */
function normalizeDomain(raw?: string): string {
  if (!raw) return 'zoho.com'
  const d = raw.trim().toLowerCase()
  if (d.startsWith('zoho.')) return d   // already "zoho.com", "zoho.eu", etc.
  return `zoho.${d}`                    // "com" → "zoho.com"
}

async function getZohoCreds(): Promise<{
  clientId: string
  clientSecret: string
  refreshToken: string
  portalId: string
  domain: string
}> {
  // 1. Try DB config (Admin → API Management → Zoho)
  try {
    const cfg = await serviceApiRepository.getConfig('zoho', 'production')
    const c = cfg?.config as ZohoDbConfig | undefined
    if (c?.clientId && c?.clientSecret && c?.refreshToken) {
      return {
        clientId:     c.clientId,
        clientSecret: c.clientSecret,
        refreshToken: c.refreshToken,
        portalId:     c.portalId ?? process.env.ZOHO_PORTAL_ID ?? '',
        domain:       normalizeDomain(c.domain ?? process.env.ZOHO_DOMAIN),
      }
    }
  } catch { /* fall through to env vars */ }

  // 2. Env vars fallback
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } = process.env
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error(
      'Zoho credentials not configured. Add them in Admin → API Management → Zoho.'
    )
  }
  return {
    clientId:     ZOHO_CLIENT_ID,
    clientSecret: ZOHO_CLIENT_SECRET,
    refreshToken: ZOHO_REFRESH_TOKEN,
    portalId:     process.env.ZOHO_PORTAL_ID ?? '',
    domain:       normalizeDomain(process.env.ZOHO_DOMAIN),
  }
}

export async function getZohoAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 30_000) {
    return cachedToken.access_token
  }

  const creds = await getZohoCreds()
  const tokenUrl = `https://accounts.${creds.domain}/oauth/v2/token`

  const params = new URLSearchParams({
    refresh_token: creds.refreshToken,
    client_id:     creds.clientId,
    client_secret: creds.clientSecret,
    grant_type:    'refresh_token',
  })

  const res = await fetch(`${tokenUrl}?${params}`, { method: 'POST' })
  if (!res.ok) throw new Error(`Zoho token refresh failed (HTTP ${res.status}) — vérifiez vos credentials dans Admin → API Management → Zoho`)

  const data = await res.json()
  if (data.error) {
    throw new Error(`Zoho OAuth error: ${data.error}${data.error_description ? ' — ' + data.error_description : ''}`)
  }

  cachedToken = {
    access_token: data.access_token,
    expires_at:   Date.now() + (data.expires_in ?? 3600) * 1000,
  }

  return cachedToken.access_token
}

export async function zohoFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  // getZohoAccessToken already calls getZohoCreds() internally; call creds
  // separately only to get domain+portalId (token is cached after first call)
  const creds = await getZohoCreds()
  const token = await getZohoAccessToken()
  const apiBase = `https://projectsapi.${creds.domain}/restapi`
  const url = `${apiBase}/portal/${creds.portalId}${path}`

  return fetch(url, {
    ...options,
    headers: {
      Authorization:  `Zoho-oauthtoken ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  })
}

/**
 * Returns true when Zoho credentials are available (DB or env vars).
 * Does NOT verify the token is valid — use the /api/services/zoho/test route for that.
 */
export async function isZohoConfigured(): Promise<boolean> {
  try {
    await getZohoCreds()
    return true
  } catch {
    return false
  }
}

/**
 * Returns the portal base URL for use in external links.
 * e.g. "https://projects.zoho.com/portal/neomniadotnet"
 */
export async function getZohoPortalUrl(): Promise<string> {
  try {
    const creds = await getZohoCreds()
    return `https://projects.${creds.domain}/portal/${creds.portalId}`
  } catch {
    const domain   = process.env.ZOHO_DOMAIN   ?? 'zoho.com'
    const portalId = process.env.ZOHO_PORTAL_ID ?? ''
    return `https://projects.${domain}/portal/${portalId}`
  }
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface ZohoTask {
  id: string
  name: string
  status: { name: string; id: string }
  priority: string
  owner?: { name: string; id: string }[]
  created_time?: string
  last_updated_time?: string
  tags?: { name: string }[]
  milestone_id?: string
  description?: string
}

export interface ZohoMilestone {
  id: string
  name: string
  status: string
  end_date?: string
  task_count?: number
  completed_task_count?: number
}

export interface ZohoProject {
  id: string
  name: string
  status: string
  description?: string
  last_modified_time?: string
  owner_name?: string
  /** Counts returned by Zoho Projects API list endpoint */
  open_task_count?: number
  task_count?: number
  bug_count?: number
  milestone_count?: number
}

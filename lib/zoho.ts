/**
 * Zoho Projects API client
 * Handles OAuth token refresh and API calls.
 */

import { resolveCredential } from '@/lib/api-management'
import { serviceApiRepository } from '@/lib/services'

const ZOHO_TOKEN_URL = "https://accounts.zoho.eu/oauth/v2/token"
const ZOHO_API_BASE = "https://projectsapi.zoho.eu/restapi"

let cachedToken: { access_token: string; expires_at: number } | null = null

async function getZohoRuntimeConfig(): Promise<{
  clientId: string
  clientSecret: string
  refreshToken: string
  portalId?: string | null
}> {
  const envClientId = process.env.ZOHO_CLIENT_ID
  const envClientSecret = process.env.ZOHO_CLIENT_SECRET
  const envRefreshToken = process.env.ZOHO_REFRESH_TOKEN

  if (envClientId && envClientSecret && envRefreshToken) {
    return {
      clientId: envClientId,
      clientSecret: envClientSecret,
      refreshToken: envRefreshToken,
      portalId: process.env.ZOHO_PORTAL_ID ?? null,
    }
  }

  const credential = await resolveCredential('zoho').catch(() => null) as Record<string, unknown> | null
  const storedConfig = credential ?? (await serviceApiRepository.getConfig('zoho' as any, 'production').catch(() => null) as any)?.config ?? null

  const clientId = typeof storedConfig?.clientId === 'string' ? storedConfig.clientId : null
  const clientSecret = typeof storedConfig?.clientSecret === 'string' ? storedConfig.clientSecret : null
  const refreshToken = typeof storedConfig?.refreshToken === 'string' ? storedConfig.refreshToken : null
  const portalId = typeof storedConfig?.portalId === 'string'
    ? storedConfig.portalId
    : typeof storedConfig?.organizationId === 'string'
      ? storedConfig.organizationId
      : null

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Zoho OAuth credentials not configured')
  }

  return { clientId, clientSecret, refreshToken, portalId }
}

export async function getZohoAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 30_000) {
    return cachedToken.access_token
  }

  const { clientId, clientSecret, refreshToken } = await getZohoRuntimeConfig()

  const params = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
  })

  const res = await fetch(`${ZOHO_TOKEN_URL}?${params}`, { method: "POST" })
  if (!res.ok) throw new Error(`Zoho token refresh failed: ${res.status}`)

  const data = await res.json()
  if (data.error) throw new Error(`Zoho token error: ${data.error}`)

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + (data.expires_in ?? 3600) * 1000,
  }

  return cachedToken.access_token
}

interface ZohoFetchConfig {
  portalId?: string | null
}

export async function zohoFetch(
  path: string,
  options: RequestInit = {},
  config: ZohoFetchConfig = {},
): Promise<Response> {
  const token = await getZohoAccessToken()
  const runtimeConfig = await getZohoRuntimeConfig()
  const portalId = config.portalId ?? runtimeConfig.portalId ?? process.env.ZOHO_PORTAL_ID ?? ""

  if (!portalId) {
    throw new Error("Zoho portal ID not configured")
  }

  const url = `${ZOHO_API_BASE}/portal/${portalId}${path}`
  const headers = new Headers(options.headers ?? {})

  headers.set("Authorization", `Zoho-oauthtoken ${token}`)
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const details = await response.text().catch(() => "")
    throw new Error(
      `Zoho request failed (${response.status}) for ${path}${details ? `: ${details.slice(0, 200)}` : ""}`,
    )
  }

  return response
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
}

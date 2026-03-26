/**
 * Zoho Projects API client
 * Handles OAuth token refresh and API calls.
 */

const ZOHO_TOKEN_URL = "https://accounts.zoho.eu/oauth/v2/token"
const ZOHO_API_BASE = "https://projectsapi.zoho.eu/restapi"

let cachedToken: { access_token: string; expires_at: number } | null = null

export async function getZohoAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 30_000) {
    return cachedToken.access_token
  }

  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } = process.env
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error("Zoho OAuth credentials not configured")
  }

  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
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

export async function zohoFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getZohoAccessToken()
  const portalId = process.env.ZOHO_PORTAL_ID ?? ""

  const url = `${ZOHO_API_BASE}/portal/${portalId}${path}`
  return fetch(url, {
    ...options,
    headers: {
      Authorization: `Zoho-oauthtoken ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  })
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
}

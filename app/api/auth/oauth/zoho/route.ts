/**
 * POST /api/auth/oauth/zoho
 *
 * Initiates the Zoho Projects OAuth2 Authorization Code flow.
 * - Stores clientId / clientSecret / portalId / domain in a short-lived httpOnly cookie
 * - Returns { authUrl } — frontend redirects the browser there
 *
 * Required scopes for Zoho Projects full access.
 * Register the callback URL in api-console.zoho.com → Authorized Redirect URIs:
 *   https://neobridge.vercel.app/api/auth/oauth/zoho/callback
 *   http://localhost:3000/api/auth/oauth/zoho/callback
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const ZOHO_SCOPES = [
  'ZohoProjects.portals.READ',
  'ZohoProjects.projects.ALL',
  'ZohoProjects.tasks.ALL',
  'ZohoProjects.bugs.ALL',
  'ZohoProjects.milestones.ALL',
  'ZohoProjects.users.READ',
].join(',')

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { clientId, clientSecret, portalId, domain = 'com' } = body

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'clientId et clientSecret sont requis' }, { status: 400 })
  }

  // Normalize domain: "com" or "zoho.com" both → "com" for Zoho auth URL
  const rawDomain = domain.replace(/^zoho\./, '')   // "zoho.com" → "com"

  // Dynamic callback URL — uses NEXT_PUBLIC_APP_URL (canonical, never a Vercel preview alias).
  // Fallback: localhost:3000 for local dev when env is not set.
  // Both URLs must be registered in api-console.zoho.com → Authorized Redirect URIs.
  const redirectUri = `${(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/api/auth/oauth/zoho/callback`

  const state = crypto.randomUUID()

  // Build Zoho authorization URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: ZOHO_SCOPES,
    redirect_uri: redirectUri,
    access_type: 'offline',   // ensures we get a refresh_token
    state,
  })
  const authUrl = `https://accounts.zoho.${rawDomain}/oauth/v2/auth?${params}`

  // Store pending state in cookie (httpOnly, 10 min TTL)
  const pending = JSON.stringify({ clientId, clientSecret, portalId, domain: rawDomain, redirectUri, state })

  const response = NextResponse.json({ authUrl })
  response.cookies.set('zoho_oauth_pending', pending, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })

  return response
}

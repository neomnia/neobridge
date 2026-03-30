/**
 * GET /api/auth/oauth/zoho/callback
 *
 * Handles the OAuth2 callback from Zoho:
 * 1. Reads the pending state from the cookie
 * 2. Verifies the state param (CSRF protection)
 * 3. Exchanges the authorization code for tokens
 * 4. Saves the full config to DB via serviceApiRepository
 * 5. Redirects to /admin/api?zoho=connected
 */

import { NextRequest, NextResponse } from 'next/server'
import { serviceApiRepository } from '@/lib/services'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  const origin = request.nextUrl.origin

  if (error) {
    console.error('[zoho-callback] Zoho returned error:', error)
    return NextResponse.redirect(`${origin}/admin/api?zoho=error&reason=${encodeURIComponent(error)}`)
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/admin/api?zoho=error&reason=no_code`)
  }

  // Read pending state from cookie
  const pendingRaw = request.cookies.get('zoho_oauth_pending')?.value
  if (!pendingRaw) {
    return NextResponse.redirect(`${origin}/admin/api?zoho=error&reason=session_expired`)
  }

  let pending: {
    clientId: string
    clientSecret: string
    portalId: string
    domain: string
    redirectUri: string
    state: string
  }
  try {
    pending = JSON.parse(pendingRaw)
  } catch {
    return NextResponse.redirect(`${origin}/admin/api?zoho=error&reason=invalid_session`)
  }

  // CSRF check
  if (state && pending.state && state !== pending.state) {
    console.error('[zoho-callback] State mismatch — possible CSRF')
    return NextResponse.redirect(`${origin}/admin/api?zoho=error&reason=state_mismatch`)
  }

  // Exchange code for tokens
  const params = new URLSearchParams({
    grant_type:    'authorization_code',
    client_id:     pending.clientId,
    client_secret: pending.clientSecret,
    redirect_uri:  pending.redirectUri,
    code,
  })

  let tokenData: Record<string, string>
  try {
    const tokenRes = await fetch(`https://accounts.zoho.${pending.domain}/oauth/v2/token`, {
      method: 'POST',
      body: params,
    })
    tokenData = await tokenRes.json()
  } catch (err) {
    console.error('[zoho-callback] Token exchange failed:', err)
    return NextResponse.redirect(`${origin}/admin/api?zoho=error&reason=token_exchange_failed`)
  }

  if (!tokenData.refresh_token) {
    const reason = tokenData.error ?? 'no_refresh_token'
    console.error('[zoho-callback] No refresh token in response:', tokenData)
    return NextResponse.redirect(`${origin}/admin/api?zoho=error&reason=${encodeURIComponent(reason)}`)
  }

  // Save full config to DB
  try {
    await serviceApiRepository.saveConfig('zoho', 'production', {
      clientId:     pending.clientId,
      clientSecret: pending.clientSecret,
      refreshToken: tokenData.refresh_token,
      portalId:     pending.portalId ?? '',
      domain:       `zoho.${pending.domain}`,
    })
  } catch (err) {
    console.error('[zoho-callback] Failed to save config to DB:', err)
    return NextResponse.redirect(`${origin}/admin/api?zoho=error&reason=db_save_failed`)
  }

  // Clear the pending cookie and redirect to success
  const response = NextResponse.redirect(`${origin}/admin/api?zoho=connected`)
  response.cookies.delete('zoho_oauth_pending')
  return response
}

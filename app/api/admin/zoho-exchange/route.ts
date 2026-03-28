import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/server'

/**
 * POST /api/admin/zoho-exchange
 * Exchange a Zoho authorization code for a refresh token.
 * Auth codes expire in ~10 minutes after the OAuth redirect.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { code, clientId, clientSecret, redirectUri } = body

  if (!code || !clientId || !clientSecret) {
    return NextResponse.json({ error: 'code, clientId et clientSecret sont requis' }, { status: 400 })
  }

  // Try COM domain first (most accounts), then EU and IN
  for (const domain of ['com', 'eu', 'in']) {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || 'https://neobridge.vercel.app',
        code,
      })
      const res = await fetch(`https://accounts.zoho.${domain}/oauth/v2/token`, {
        method: 'POST',
        body: params,
      })
      const data = await res.json()
      if (data.refresh_token) {
        return NextResponse.json({
          success: true,
          refreshToken: data.refresh_token,
          accessToken: data.access_token,
          domain,
          expiresIn: data.expires_in,
        })
      }
      // If error is not "invalid_code", it's a real error for this domain
      if (data.error && data.error !== 'invalid_code') {
        return NextResponse.json({ success: false, error: data.error, domain }, { status: 400 })
      }
    } catch { /* try next domain */ }
  }

  return NextResponse.json({
    success: false,
    error: 'Code invalide ou expiré. Relancez le flux OAuth Zoho pour obtenir un nouveau code (valide ~10 min).',
  }, { status: 400 })
}

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

  // Try COM first (most common), then EU and IN
  // Only bail early on invalid_client (wrong credentials) — other errors may be domain mismatches
  for (const domain of ['com', 'eu', 'in']) {
    try {
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri || `${(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '')}/api/auth/oauth/zoho/callback`,
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
      // Bail only on credential errors — never on domain/code mismatch
      if (data.error === 'invalid_client') {
        return NextResponse.json({ success: false, error: data.error, domain }, { status: 400 })
      }
    } catch { /* try next domain */ }
  }

  return NextResponse.json({
    success: false,
    error: 'Code invalide ou expiré. Relancez le flux OAuth Zoho pour obtenir un nouveau code (valide ~10 min).',
  }, { status: 400 })
}

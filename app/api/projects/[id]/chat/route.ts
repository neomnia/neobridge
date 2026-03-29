/**
 * POST /api/projects/[id]/chat
 * Streaming chat with Claude, contextualisé sur le projet NeoBridge.
 * Body: { messages: { role: 'user' | 'assistant', content: string }[], projectName?: string }
 */

import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth/server'
import { serviceApiRepository } from '@/lib/services'

type Params = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { id } = await params
    const body = await req.json()
    const { messages, projectName } = body as {
      messages: { role: 'user' | 'assistant'; content: string }[]
      projectName?: string
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages is required' }), { status: 400 })
    }

    // Get Anthropic token
    const config = await serviceApiRepository.getConfig('anthropic', 'production')
    const apiKey = (config?.config as Record<string, unknown> | undefined)?.apiKey as string | undefined
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Token Anthropic non configuré — rendez-vous dans /admin/api' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      )
    }

    const systemPrompt = `Tu es un assistant DevOps expert intégré à NeoBridge, une plateforme de gestion de projets cloud.
Tu aides l'équipe sur le projet : "${projectName ?? id}".
Tes domaines d'expertise : Vercel, Neon/PostgreSQL, GitHub Actions, Next.js, Drizzle ORM, CI/CD, monitoring, sécurité.
Réponds en français, de manière concise et technique. Propose des commandes et extraits de code quand c'est pertinent.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
        stream: true,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return new Response(JSON.stringify({ error: err }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Stream SSE from Anthropic → client
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const json = JSON.parse(data)
              if (json.type === 'content_block_delta' && json.delta?.type === 'text_delta') {
                controller.enqueue(encoder.encode(json.delta.text))
              }
            } catch { /* ignore malformed */ }
          }
        }
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

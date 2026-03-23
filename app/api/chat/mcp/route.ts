/**
 * MCP Chat API — Fallback LLM endpoint for project dev chat
 * POST /api/chat/mcp
 *
 * Uses configured LLM API key (Anthropic/OpenAI/Mistral) from llm_api_keys table.
 * For production use, configure an external MCP Railway server in the project settings.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { db } from '@/db';
import { llmApiKeys } from '@/db/schema';
import { decrypt } from '@/lib/email/utils/encryption';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages, system, projectId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array required' }, { status: 400 });
    }

    // Find a default LLM key (prefer Anthropic, then OpenAI, then Mistral)
    const allKeys = await db
      .select()
      .from(llmApiKeys)
      .where(eq(llmApiKeys.isActive, true));

    const preferredOrder = ['anthropic', 'openai', 'mistral', 'groq'];
    let selectedKey = allKeys.find(k => k.isDefault);
    if (!selectedKey) {
      for (const provider of preferredOrder) {
        selectedKey = allKeys.find(k => k.provider === provider);
        if (selectedKey) break;
      }
    }

    if (!selectedKey) {
      // Return a helpful message instead of an error
      return NextResponse.json({
        message: `Aucune clé API LLM configurée.\n\nPour activer le chat IA :\n1. Allez dans **Admin → API Management**\n2. Ajoutez une clé API (Anthropic Claude, OpenAI, ou Mistral)\n3. Ou configurez votre serveur **MCP Railway** dans l'onglet "Config MCP" de ce projet.`,
      });
    }

    const decryptedKey = await decrypt(selectedKey.encryptedKey);

    // Route to the appropriate provider
    if (selectedKey.provider === 'anthropic') {
      return handleAnthropic(decryptedKey, messages, system);
    }

    if (selectedKey.provider === 'openai') {
      return handleOpenAI(decryptedKey, messages, system);
    }

    if (selectedKey.provider === 'mistral') {
      return handleMistral(decryptedKey, messages, system);
    }

    return NextResponse.json({ message: `Provider "${selectedKey.provider}" non supporté pour le chat.` });
  } catch (err: any) {
    console.error('[POST /api/chat/mcp]', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}

async function handleAnthropic(apiKey: string, messages: any[], system?: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: system || 'Tu es un assistant expert en développement logiciel.',
      messages: messages.filter((m: any) => m.role !== 'system'),
      stream: true,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Anthropic error ${res.status}`);
  }

  // Stream the response (SSE)
  const stream = new ReadableStream({
    async start(controller) {
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
              continue;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta?.text || '';
                if (delta) {
                  const chunk = JSON.stringify({
                    choices: [{ delta: { content: delta } }],
                  });
                  controller.enqueue(new TextEncoder().encode(`data: ${chunk}\n\n`));
                }
              }
            } catch { /* skip */ }
          }
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

async function handleOpenAI(apiKey: string, messages: any[], system?: string) {
  const systemMsg = system ? [{ role: 'system', content: system }] : [];

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [...systemMsg, ...messages],
      stream: true,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI error ${res.status}`);
  }

  // Proxy the SSE stream directly
  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

async function handleMistral(apiKey: string, messages: any[], system?: string) {
  const systemMsg = system ? [{ role: 'system', content: system }] : [];

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages: [...systemMsg, ...messages],
      stream: true,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Mistral error ${res.status}`);
  }

  return new Response(res.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}

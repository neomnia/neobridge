"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Bot,
  MessageCircle,
  Plus,
  Send,
  Trash2,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: number
}

interface Session {
  id: string
  title: string
  messages: Message[]
  createdAt: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeId() {
  return Math.random().toString(36).slice(2, 10)
}

function sessionTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'Nouvelle session'
  return first.content.slice(0, 48) + (first.content.length > 48 ? '…' : '')
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const { projectId, teamId } = useParams<{ projectId: string; teamId: string }>()

  const [sessions, setSessions] = useState<Session[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Init: create first session
  useEffect(() => {
    const first: Session = { id: makeId(), title: 'Nouvelle session', messages: [], createdAt: Date.now() }
    setSessions([first])
    setActiveId(first.id)
  }, [])

  const activeSession = sessions.find((s) => s.id === activeId) ?? null

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [activeSession?.messages.length, scrollToBottom])

  const newSession = () => {
    const s: Session = { id: makeId(), title: 'Nouvelle session', messages: [], createdAt: Date.now() }
    setSessions((prev) => [s, ...prev])
    setActiveId(s.id)
    setInput('')
    setError(null)
  }

  const deleteSession = (id: string) => {
    setSessions((prev) => {
      const next = prev.filter((s) => s.id !== id)
      if (activeId === id) setActiveId(next[0]?.id ?? null)
      return next
    })
  }

  const updateSession = (id: string, messages: Message[]) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, messages, title: sessionTitle(messages) }
          : s,
      ),
    )
  }

  const send = async () => {
    if (!input.trim() || streaming || !activeId) return
    setError(null)

    const userMsg: Message = { id: makeId(), role: 'user', content: input.trim(), createdAt: Date.now() }
    const assistantMsg: Message = { id: makeId(), role: 'assistant', content: '', createdAt: Date.now() }

    const messages = [...(activeSession?.messages ?? []), userMsg]
    updateSession(activeId, [...messages, assistantMsg])
    setInput('')
    setStreaming(true)

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          projectName: projectId,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erreur inconnue' }))
        setError(err.error ?? 'Erreur serveur')
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeId
              ? { ...s, messages: s.messages.filter((m) => m.id !== assistantMsg.id) }
              : s,
          ),
        )
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        // Update assistant message content in real-time
        setSessions((prev) =>
          prev.map((s) =>
            s.id === activeId
              ? {
                  ...s,
                  messages: s.messages.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: accumulated } : m,
                  ),
                }
              : s,
          ),
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur réseau')
    } finally {
      setStreaming(false)
      textareaRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] gap-0 rounded-xl border overflow-hidden bg-background">

      {/* ── Sidebar sessions ─────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r flex flex-col bg-muted/30">
        <div className="p-3 border-b">
          <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={newSession}>
            <Plus className="h-4 w-4" />
            Nouvelle session
          </Button>
        </div>
        <ScrollArea className="flex-1 p-2">
          <div className="space-y-1">
            {sessions.map((s) => (
              <div
                key={s.id}
                onClick={() => setActiveId(s.id)}
                className={cn(
                  'group flex items-start justify-between gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors text-sm',
                  activeId === s.id
                    ? 'bg-brand text-white'
                    : 'hover:bg-muted text-muted-foreground hover:text-foreground',
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium text-xs leading-tight">{s.title}</p>
                  <p className={cn('text-[10px] mt-0.5', activeId === s.id ? 'text-white/70' : 'text-muted-foreground')}>
                    {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteSession(s.id) }}
                  className={cn(
                    'shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5',
                    activeId === s.id ? 'text-white/70 hover:text-white' : 'text-muted-foreground hover:text-destructive',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
        <div className="p-3 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Bot className="h-3.5 w-3.5" />
            <span>Claude Haiku · NeoBridge</span>
          </div>
        </div>
      </aside>

      {/* ── Chat area ─────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b shrink-0">
          <MessageCircle className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm truncate">{activeSession?.title ?? 'Chat'}</span>
          <Badge variant="outline" className="ml-auto text-[10px] font-mono">{projectId}</Badge>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 px-5 py-4">
          {!activeSession || activeSession.messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-16">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
                <Bot className="h-7 w-7 text-brand" />
              </div>
              <div>
                <p className="font-semibold">Assistant NeoBridge</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                  Posez une question sur le projet <span className="font-mono text-foreground">{projectId}</span> — déploiements, logs, domaines, CI/CD…
                </p>
              </div>
              {[
                'Quel est l\'état du dernier déploiement ?',
                'Comment configurer un domaine personnalisé ?',
                'Optimiser le temps de build Vercel',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); textareaRef.current?.focus() }}
                  className="block w-full max-w-xs mx-auto text-xs text-left border rounded-lg px-3 py-2 hover:bg-muted transition-colors text-muted-foreground mt-2"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-6 max-w-3xl mx-auto">
              {activeSession.messages.map((msg) => (
                <div key={msg.id} className={cn('flex gap-3', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 mt-1">
                      <Bot className="h-4 w-4 text-brand" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-3 text-sm max-w-[75%] leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-brand text-white rounded-tr-sm'
                        : 'bg-muted text-foreground rounded-tl-sm',
                    )}
                  >
                    {msg.content === '' && msg.role === 'assistant' ? (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>

        {/* Error */}
        {error && (
          <div className="px-5 py-2 shrink-0">
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-4 border-t shrink-0">
          <div className="flex items-end gap-3 rounded-xl border bg-background p-3 focus-within:ring-2 focus-within:ring-ring/30 transition-shadow">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Posez une question… (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
              className="border-0 bg-transparent p-0 text-sm resize-none min-h-[40px] max-h-[140px] focus-visible:ring-0 shadow-none"
              rows={1}
            />
            <Button
              size="icon"
              className="shrink-0 h-9 w-9 rounded-lg"
              onClick={send}
              disabled={!input.trim() || streaming}
            >
              {streaming
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />
              }
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
            Claude Haiku · Les réponses peuvent contenir des erreurs. Vérifiez toujours le code critique.
          </p>
        </div>
      </div>
    </div>
  )
}

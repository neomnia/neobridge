"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft, Box, Github, Globe, FileText, CheckCircle, AlertCircle,
  Loader2, Send, Bot, User, Trash2, ExternalLink, RefreshCw,
  Settings, Code2, Terminal, ChevronDown, ChevronUp, Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface DevProject {
  id: string
  name: string
  slug: string
  description: string | null
  status: string
  vercelProjectId: string | null
  vercelProjectName: string | null
  vercelDeploymentUrl: string | null
  githubRepoFullName: string | null
  githubRepoUrl: string | null
  githubDefaultBranch: string | null
  cloudflareDomain: string | null
  cloudflareZoneId: string | null
  domainVerified: boolean
  domainConnectedToVercel: boolean
  notionPageId: string | null
  notionPageUrl: string | null
  setupState: Record<string, any> | null
  metadata: Record<string, any> | null
  createdAt: string
  updatedAt: string
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

const SYSTEM_CONTEXT_TEMPLATE = (project: DevProject) => `
Tu es un assistant expert en développement logiciel, spécialisé dans les architectures Next.js, React, et les écosystèmes Vercel/GitHub.

## Projet en cours : ${project.name}
- **Slug** : ${project.slug}
- **Description** : ${project.description || 'Non définie'}
- **Statut** : ${project.status}
${project.vercelProjectName ? `- **Vercel** : ${project.vercelProjectName} (${project.vercelDeploymentUrl || 'non déployé'})` : ''}
${project.githubRepoFullName ? `- **GitHub** : ${project.githubRepoFullName} (branche: ${project.githubDefaultBranch || 'main'})` : ''}
${project.cloudflareDomain ? `- **Domaine** : ${project.cloudflareDomain} (${project.domainVerified ? 'vérifié' : 'non vérifié'})` : ''}
${project.notionPageUrl ? `- **Notion** : ${project.notionPageUrl}` : ''}

## Tes capacités MCP (Model Context Protocol)
Tu peux interagir avec les services via les outils suivants (décris les actions à effectuer, le système les exécutera) :
- **GitHub MCP** : créer des branches, des issues, des PRs, committer du code
- **Vercel MCP** : déployer, gérer les variables d'env, inspecter les déploiements
- **Notion MCP** : mettre à jour la doc du projet, créer des specs techniques
- **Cloudflare MCP** : inspecter le DNS, vérifier les certificats

Aide à développer ce projet avec précision et pragmatisme.
`.trim()

export default function ProjectDevPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [project, setProject] = useState<DevProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [mcpEndpoint, setMcpEndpoint] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showConfig, setShowConfig] = useState(false)
  const [domainStatus, setDomainStatus] = useState<any>(null)
  const [checkingDomain, setCheckingDomain] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/projects/${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setProject(data.data)
          // Load from localStorage
          const saved = localStorage.getItem(`chat_${data.data.id}`)
          if (saved) {
            try {
              const msgs = JSON.parse(saved)
              setMessages(msgs.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })))
            } catch { /* ignore */ }
          } else {
            // Welcome message
            setMessages([{
              id: 'welcome',
              role: 'assistant',
              content: `Bonjour ! Je suis votre assistant de développement pour le projet **${data.data.name}**.\n\nJe peux vous aider à :\n- Générer du code et des architectures\n- Gérer les intégrations (Vercel, GitHub, Cloudflare, Notion)\n- Débugger et optimiser\n- Rédiger la documentation\n\nQue souhaitez-vous faire ?`,
              timestamp: new Date(),
            }])
          }
          // Load MCP config
          const savedMcp = localStorage.getItem('mcp_endpoint')
          const savedKey = localStorage.getItem('mcp_api_key')
          if (savedMcp) setMcpEndpoint(savedMcp)
          if (savedKey) setApiKey(savedKey)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (project && messages.length > 1) {
      localStorage.setItem(`chat_${project.id}`, JSON.stringify(messages))
    }
  }, [messages, project])

  const saveMcpConfig = () => {
    localStorage.setItem('mcp_endpoint', mcpEndpoint)
    localStorage.setItem('mcp_api_key', apiKey)
    setShowConfig(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || isSending) return

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    const assistantMsg: ChatMessage = {
      id: `assistant_${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    setIsSending(true)

    try {
      // Build messages for API (exclude welcome if needed)
      const contextMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }))

      contextMessages.push({ role: 'user', content: userMsg.content })

      let endpoint = '/api/chat/mcp'
      let headers: Record<string, string> = { 'Content-Type': 'application/json' }
      let body: any = {
        messages: contextMessages,
        system: project ? SYSTEM_CONTEXT_TEMPLATE(project) : undefined,
        projectId: project?.id,
      }

      // If custom MCP endpoint is configured, use it
      if (mcpEndpoint) {
        endpoint = mcpEndpoint
        if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      })

      if (res.body) {
        // Stream response
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let accumulated = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value, { stream: true })
          // Handle SSE format
          const lines = chunk.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content ||
                              parsed.delta?.text ||
                              parsed.content || ''
                accumulated += delta
                setMessages(prev => prev.map(m =>
                  m.id === assistantMsg.id
                    ? { ...m, content: accumulated }
                    : m
                ))
              } catch { /* ignore non-JSON chunks */ }
            }
          }
        }

        // Mark as done
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, isStreaming: false, content: accumulated || '...' }
            : m
        ))
      } else {
        const data = await res.json()
        const content = data.message || data.content || data.choices?.[0]?.message?.content || 'Réponse reçue.'
        setMessages(prev => prev.map(m =>
          m.id === assistantMsg.id
            ? { ...m, isStreaming: false, content }
            : m
        ))
      }
    } catch (err: any) {
      setMessages(prev => prev.map(m =>
        m.id === assistantMsg.id
          ? {
              ...m,
              isStreaming: false,
              content: `❌ Erreur : ${err.message}\n\n*Configurez un endpoint MCP ou une clé API LLM dans la section Configuration.*`,
            }
          : m
      ))
    } finally {
      setIsSending(false)
    }
  }

  const checkDomain = async () => {
    if (!project?.cloudflareDomain) return
    setCheckingDomain(true)
    try {
      const res = await fetch(`/api/integrations/cloudflare?domain=${project.cloudflareDomain}`)
      const data = await res.json()
      setDomainStatus(data.data)
    } catch {
      setDomainStatus({ error: 'Impossible de vérifier' })
    } finally {
      setCheckingDomain(false)
    }
  }

  const clearChat = () => {
    if (!project) return
    localStorage.removeItem(`chat_${project.id}`)
    setMessages([{
      id: 'welcome_new',
      role: 'assistant',
      content: `Conversation réinitialisée pour **${project.name}**. Comment puis-je vous aider ?`,
      timestamp: new Date(),
    }])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Projet introuvable.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/admin/projects">Retour aux projets</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] gap-0">
      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/projects">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-semibold text-sm">{project.name}</h1>
            <p className="text-xs text-muted-foreground font-mono">{project.slug}</p>
          </div>
          <Badge className={`text-xs ${
            project.status === 'active' ? 'bg-green-100 text-green-700' :
            project.status === 'setting_up' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {project.status}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {project.githubRepoUrl && (
            <a href={project.githubRepoUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                <Github className="h-4 w-4" />
              </Button>
            </a>
          )}
          {project.vercelDeploymentUrl && (
            <a href={`https://${project.vercelDeploymentUrl}`} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                <Box className="h-4 w-4" />
              </Button>
            </a>
          )}
          {project.notionPageUrl && (
            <a href={project.notionPageUrl} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm">
                <FileText className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>

      {/* ── Main area ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: project info */}
        <div className="hidden lg:flex flex-col w-64 shrink-0 border-r overflow-y-auto">
          <Tabs defaultValue="overview" className="flex flex-col flex-1">
            <TabsList className="grid grid-cols-2 mx-3 mt-3 h-8">
              <TabsTrigger value="overview" className="text-xs">Infos</TabsTrigger>
              <TabsTrigger value="config" className="text-xs">Config MCP</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="flex-1 p-3 space-y-3 mt-0">
              {/* Vercel */}
              <InfoBlock
                icon={<Box className="h-3.5 w-3.5" />}
                title="Vercel"
                ok={!!project.vercelProjectId}
                items={[
                  project.vercelProjectName && { label: 'Projet', value: project.vercelProjectName },
                  project.vercelDeploymentUrl && {
                    label: 'URL',
                    value: project.vercelDeploymentUrl,
                    href: `https://${project.vercelDeploymentUrl}`,
                  },
                ].filter(Boolean) as any[]}
              />

              {/* GitHub */}
              <InfoBlock
                icon={<Github className="h-3.5 w-3.5" />}
                title="GitHub"
                ok={!!project.githubRepoFullName}
                items={[
                  project.githubRepoFullName && {
                    label: 'Repo',
                    value: project.githubRepoFullName,
                    href: project.githubRepoUrl || undefined,
                  },
                  project.githubDefaultBranch && { label: 'Branche', value: project.githubDefaultBranch },
                ].filter(Boolean) as any[]}
              />

              {/* Domain */}
              <InfoBlock
                icon={<Globe className="h-3.5 w-3.5" />}
                title="Domaine"
                ok={project.domainVerified}
                items={[
                  project.cloudflareDomain && { label: 'Domaine', value: project.cloudflareDomain },
                  { label: 'DNS Vercel', value: project.domainConnectedToVercel ? 'Connecté' : 'Non connecté' },
                ].filter(Boolean) as any[]}
              >
                {project.cloudflareDomain && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 h-7 text-xs"
                    onClick={checkDomain}
                    disabled={checkingDomain}
                  >
                    {checkingDomain ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RefreshCw className="h-3 w-3 mr-1" />}
                    Vérifier DNS
                  </Button>
                )}
                {domainStatus && (
                  <div className="mt-2 text-xs space-y-1">
                    <p className={domainStatus.active ? 'text-green-600' : 'text-orange-600'}>
                      {domainStatus.active ? '✓ Zone active' : '⚠ Zone inactive'}
                    </p>
                    {domainStatus.nameServers?.length > 0 && (
                      <p className="text-muted-foreground">NS: {domainStatus.nameServers[0]}</p>
                    )}
                  </div>
                )}
              </InfoBlock>

              {/* Notion */}
              <InfoBlock
                icon={<FileText className="h-3.5 w-3.5" />}
                title="Notion"
                ok={!!project.notionPageId}
                items={[
                  project.notionPageUrl && { label: 'Page', value: 'Ouvrir', href: project.notionPageUrl },
                ].filter(Boolean) as any[]}
              />

              {/* Setup errors */}
              {project.setupState?.errors && Object.keys(project.setupState.errors).length > 0 && (
                <div className="rounded-md bg-orange-50 border border-orange-200 p-2 text-xs space-y-1">
                  <p className="font-medium text-orange-800">Erreurs setup :</p>
                  {Object.entries(project.setupState.errors).map(([k, v]) => (
                    <p key={k} className="text-orange-700">{k}: {String(v)}</p>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="config" className="p-3 space-y-3 mt-0">
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium mb-1">Endpoint MCP Railway</p>
                  <input
                    type="text"
                    className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs font-mono"
                    placeholder="https://mcp.railway.app/chat"
                    value={mcpEndpoint}
                    onChange={e => setMcpEndpoint(e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">Clé API</p>
                  <input
                    type="password"
                    className="w-full rounded border border-input bg-background px-2 py-1.5 text-xs font-mono"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                  />
                </div>
                <Button size="sm" className="w-full h-7 text-xs" onClick={saveMcpConfig}>
                  Sauvegarder
                </Button>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Configurez ici l'URL de votre serveur MCP Railway avec vos agents métier personnalisés.
                  </p>
                  <div className="text-xs space-y-1 text-muted-foreground">
                    <p className="flex items-center gap-1"><Terminal className="h-3 w-3" /> Railway MCP Server</p>
                    <p className="flex items-center gap-1"><Code2 className="h-3 w-3" /> Agents spécialisés</p>
                    <p className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Process métiers</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Chat area */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Chat header */}
          <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Bot className="h-4 w-4 text-brand" />
              <span>Chat Dev — {project.name}</span>
              {mcpEndpoint && (
                <Badge className="text-xs bg-blue-100 text-blue-700">MCP Railway</Badge>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearChat} title="Effacer la conversation">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="shrink-0 border-t bg-background p-3">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    sendMessage()
                  }
                }}
                placeholder="Décrivez ce que vous souhaitez développer... (Entrée pour envoyer, Shift+Entrée pour nouvelle ligne)"
                className="min-h-[60px] max-h-[200px] resize-none text-sm"
                disabled={isSending}
              />
              <Button
                size="icon"
                className="shrink-0 h-[60px] w-10 bg-brand hover:bg-brand/90"
                onClick={sendMessage}
                disabled={isSending || !input.trim()}
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5 text-center">
              {mcpEndpoint ? `Connecté à MCP : ${new URL(mcpEndpoint).hostname}` : 'Sans MCP configuré — messages traités localement'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
        isUser ? 'bg-brand text-white' : 'bg-muted border'
      }`}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      <div className={`max-w-[80%] rounded-xl px-3.5 py-2.5 text-sm ${
        isUser
          ? 'bg-brand text-white rounded-tr-sm'
          : 'bg-muted rounded-tl-sm'
      }`}>
        {message.isStreaming ? (
          <span className="whitespace-pre-wrap">
            {message.content}
            <span className="inline-block w-1.5 h-4 bg-current ml-0.5 animate-pulse" />
          </span>
        ) : (
          <span className="whitespace-pre-wrap">{message.content}</span>
        )}
      </div>
    </div>
  )
}

function InfoBlock({
  icon, title, ok, items, children
}: {
  icon: React.ReactNode
  title: string
  ok: boolean
  items: { label: string; value: string; href?: string }[]
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <span className="text-muted-foreground">{icon}</span>
        {title}
        {ok ? (
          <CheckCircle className="h-3 w-3 text-green-500 ml-auto" />
        ) : (
          <AlertCircle className="h-3 w-3 text-muted-foreground ml-auto" />
        )}
      </div>
      {items.map(item => (
        <div key={item.label} className="text-xs text-muted-foreground flex items-center justify-between gap-1">
          <span className="shrink-0">{item.label}</span>
          {item.href ? (
            <a
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="font-mono truncate text-right hover:underline flex items-center gap-0.5"
            >
              <span className="truncate max-w-[120px]">{item.value}</span>
              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
            </a>
          ) : (
            <span className="font-mono truncate text-right max-w-[120px]">{item.value}</span>
          )}
        </div>
      ))}
      {children}
    </div>
  )
}

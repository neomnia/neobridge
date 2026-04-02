/**
 * lib/services/notion.ts
 * Client Notion — synchronisation de documentation projet
 * Utilise l'API REST Notion directement (pas de dépendance npm externe)
 */

import { resolveCredential, type ApiType } from '@/lib/api-management'

const NOTION_API_URL = 'https://api.notion.com/v1'
const NOTION_VERSION = '2022-06-28'

export interface NotionPage {
  id: string
  object: 'page'
  created_time: string
  last_edited_time: string
  url: string
  archived: boolean
  properties: Record<string, any>
  parent: { type: string; database_id?: string; page_id?: string; workspace?: boolean }
}

export interface NotionDatabase {
  id: string
  object: 'database'
  title: Array<{ plain_text: string }>
  created_time: string
  last_edited_time: string
  url: string
  archived: boolean
}

export interface NotionBlock {
  id: string
  object: 'block'
  type: string
  created_time: string
  last_edited_time: string
  has_children: boolean
  [key: string]: any
}

export interface NotionSearchResult {
  results: Array<NotionPage | NotionDatabase>
  has_more: boolean
  next_cursor: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getNotionApiKey(teamId?: string): Promise<string> {
  const creds = await resolveCredential('notion' as ApiType, teamId)
  if (creds?.apiKey && !creds.apiKey.startsWith('secret_mock_')) {
    return creds.apiKey
  }
  throw new Error('Notion API key not configured. Add it via Admin > API Management.')
}

async function notionRequest<T>(
  path: string,
  options?: { method?: string; body?: unknown; teamId?: string },
): Promise<T> {
  const apiKey = await getNotionApiKey(options?.teamId)

  const res = await fetch(`${NOTION_API_URL}${path}`, {
    method: options?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })

  const payload = await res.json().catch(() => null)
  if (!res.ok || !payload) {
    const msg = payload && typeof payload === 'object' && 'message' in payload
      ? String((payload as any).message)
      : res.statusText
    throw new Error(`Notion API error (${res.status}): ${msg}`)
  }

  return payload as T
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Recherche des pages et bases dans le workspace Notion
 */
export async function searchNotion(
  query: string,
  opts?: { teamId?: string; filter?: 'page' | 'database'; pageSize?: number },
): Promise<NotionSearchResult> {
  const body: Record<string, any> = {
    query,
    page_size: opts?.pageSize ?? 20,
  }
  if (opts?.filter) {
    body.filter = { value: opts.filter, property: 'object' }
  }

  return notionRequest<NotionSearchResult>('/search', {
    method: 'POST',
    body,
    teamId: opts?.teamId,
  })
}

/**
 * Récupère une page Notion par son ID
 */
export async function getNotionPage(pageId: string, teamId?: string): Promise<NotionPage> {
  return notionRequest<NotionPage>(`/pages/${encodeURIComponent(pageId)}`, { teamId })
}

/**
 * Récupère une base de données Notion par son ID
 */
export async function getNotionDatabase(databaseId: string, teamId?: string): Promise<NotionDatabase> {
  return notionRequest<NotionDatabase>(`/databases/${encodeURIComponent(databaseId)}`, { teamId })
}

/**
 * Récupère les blocs enfants d'un bloc/page
 */
export async function getNotionBlockChildren(
  blockId: string,
  opts?: { teamId?: string; pageSize?: number; startCursor?: string },
): Promise<{ results: NotionBlock[]; has_more: boolean; next_cursor: string | null }> {
  const params = new URLSearchParams()
  if (opts?.pageSize) params.set('page_size', String(opts.pageSize))
  if (opts?.startCursor) params.set('start_cursor', opts.startCursor)

  const qs = params.toString()
  return notionRequest(`/blocks/${encodeURIComponent(blockId)}/children${qs ? `?${qs}` : ''}`, {
    teamId: opts?.teamId,
  })
}

/**
 * Requête sur une base de données Notion (filtre + tri)
 */
export async function queryNotionDatabase(
  databaseId: string,
  opts?: { teamId?: string; filter?: Record<string, any>; sorts?: Array<Record<string, any>>; pageSize?: number },
): Promise<{ results: NotionPage[]; has_more: boolean; next_cursor: string | null }> {
  const body: Record<string, any> = {
    page_size: opts?.pageSize ?? 100,
  }
  if (opts?.filter) body.filter = opts.filter
  if (opts?.sorts) body.sorts = opts.sorts

  return notionRequest(`/databases/${encodeURIComponent(databaseId)}/query`, {
    method: 'POST',
    body,
    teamId: opts?.teamId,
  })
}

/**
 * Crée une page dans une base de données Notion
 */
export async function createNotionPage(
  parentDatabaseId: string,
  properties: Record<string, any>,
  children?: Array<Record<string, any>>,
  teamId?: string,
): Promise<NotionPage> {
  const body: Record<string, any> = {
    parent: { database_id: parentDatabaseId },
    properties,
  }
  if (children?.length) body.children = children

  return notionRequest<NotionPage>('/pages', {
    method: 'POST',
    body,
    teamId,
  })
}

/**
 * Met à jour les propriétés d'une page Notion
 */
export async function updateNotionPage(
  pageId: string,
  properties: Record<string, any>,
  teamId?: string,
): Promise<NotionPage> {
  return notionRequest<NotionPage>(`/pages/${encodeURIComponent(pageId)}`, {
    method: 'PATCH',
    body: { properties },
    teamId,
  })
}

/**
 * Teste la connectivité Notion (appel léger)
 */
export async function testNotionConnection(teamId?: string): Promise<{ ok: boolean; user: string }> {
  const data = await notionRequest<{ bot: { owner: { type: string; user?: { name?: string } } } }>(
    '/users/me',
    { teamId },
  )
  const user = data?.bot?.owner?.user?.name ?? 'Notion Bot'
  return { ok: true, user }
}

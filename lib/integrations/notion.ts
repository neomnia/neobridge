/**
 * Notion API Client
 * Creates and manages project pages in a Notion workspace
 * Credentials loaded from service_api_configs (serviceName: 'notion')
 */

import { serviceApiRepository } from '@/lib/services';

export interface NotionPage {
  id: string;
  url: string;
  title: string;
  createdTime: string;
  lastEditedTime: string;
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
}

export class NotionApiClient {
  private apiKey: string | null = null;
  private defaultDatabaseId: string | null = null;

  async init(): Promise<boolean> {
    try {
      const config = await serviceApiRepository.getConfig('notion', 'production');
      if (!config?.config?.apiKey) {
        console.warn('⚠️ [Notion] No API key configured');
        return false;
      }
      this.apiKey = config.config.apiKey;
      this.defaultDatabaseId = config.config.defaultDatabaseId || null;
      return true;
    } catch (err) {
      console.error('❌ [Notion] Failed to load config:', err);
      return false;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.apiKey) throw new Error('Notion client not initialized');

    const res = await fetch(`https://api.notion.com/v1${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Notion API error ${res.status}`);
    }

    return res.json();
  }

  /** Get current workspace info */
  async getMe(): Promise<{ id: string; name: string; workspaceId: string; workspaceName: string }> {
    const data = await this.request<any>('/users/me');
    return {
      id: data.id,
      name: data.name || '',
      workspaceId: data.bot?.workspace_id || '',
      workspaceName: data.bot?.workspace_name || '',
    };
  }

  /** Search for databases */
  async searchDatabases(): Promise<NotionDatabase[]> {
    const data = await this.request<any>('/search', {
      method: 'POST',
      body: JSON.stringify({
        filter: { value: 'database', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 20,
      }),
    });

    return (data.results || []).map((db: any) => ({
      id: db.id,
      title: db.title?.[0]?.plain_text || 'Untitled',
      url: db.url,
    }));
  }

  /** Create a project page in a database */
  async createProjectPage(params: {
    databaseId?: string;
    parentPageId?: string;
    projectName: string;
    description?: string;
    status?: string;
    githubRepo?: string;
    vercelUrl?: string;
    domain?: string;
  }): Promise<NotionPage> {
    const dbId = params.databaseId || this.defaultDatabaseId;

    let parent: any;
    let properties: any = {};

    if (dbId) {
      // Create as a database entry
      parent = { database_id: dbId };
      properties = {
        Name: {
          title: [{ text: { content: params.projectName } }],
        },
        ...(params.status ? {
          Status: { select: { name: params.status } },
        } : {}),
        ...(params.githubRepo ? {
          'GitHub Repo': { url: params.githubRepo },
        } : {}),
        ...(params.vercelUrl ? {
          'Vercel URL': { url: params.vercelUrl },
        } : {}),
        ...(params.domain ? {
          Domain: { rich_text: [{ text: { content: params.domain } }] },
        } : {}),
      };
    } else if (params.parentPageId) {
      // Create as a sub-page
      parent = { page_id: params.parentPageId };
      properties = {
        title: [{ text: { content: params.projectName } }],
      };
    } else {
      throw new Error('Either databaseId or parentPageId must be provided');
    }

    const children = params.description
      ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: params.description } }],
            },
          },
        ]
      : [];

    const page = await this.request<any>('/pages', {
      method: 'POST',
      body: JSON.stringify({ parent, properties, children }),
    });

    return this.mapPage(page);
  }

  /** Update a project page */
  async updateProjectPage(
    pageId: string,
    updates: Record<string, any>
  ): Promise<NotionPage> {
    const page = await this.request<any>(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({ properties: updates }),
    });
    return this.mapPage(page);
  }

  /** Get a page by ID */
  async getPage(pageId: string): Promise<NotionPage> {
    const page = await this.request<any>(`/pages/${pageId}`);
    return this.mapPage(page);
  }

  private mapPage(p: any): NotionPage {
    const titleProp = p.properties?.Name?.title || p.properties?.title || [];
    const title =
      (Array.isArray(titleProp) ? titleProp[0]?.plain_text : titleProp?.[0]?.plain_text) ||
      'Untitled';
    return {
      id: p.id,
      url: p.url,
      title,
      createdTime: p.created_time,
      lastEditedTime: p.last_edited_time,
    };
  }
}

export const notionClient = new NotionApiClient();

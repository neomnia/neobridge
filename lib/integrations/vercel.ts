/**
 * Vercel API Client
 * Manages Vercel projects, deployments, and domains
 * Credentials loaded from service_api_configs (serviceName: 'vercel')
 */

import { serviceApiRepository } from '@/lib/services';

export interface VercelProject {
  id: string;
  name: string;
  framework: string | null;
  link?: { type: string; repo: string; repoId: number } | null;
  alias?: { domain: string; configuredBy: string | null }[];
  latestDeployments?: { url: string; state: string; createdAt: number }[];
  createdAt: number;
  updatedAt: number;
}

export interface VercelDomainStatus {
  name: string;
  apexName: string;
  projectId: string;
  verified: boolean;
  verification?: { type: string; domain: string; value: string; reason: string }[];
}

export class VercelApiClient {
  private token: string | null = null;
  private teamId: string | null = null;

  async init(): Promise<boolean> {
    try {
      const config = await serviceApiRepository.getConfig('vercel', 'production');
      if (!config?.config?.token) {
        console.warn('⚠️ [Vercel] No token configured');
        return false;
      }
      this.token = config.config.token;
      this.teamId = config.config.teamId || null;
      return true;
    } catch (err) {
      console.error('❌ [Vercel] Failed to load config:', err);
      return false;
    }
  }

  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    if (!this.token) throw new Error('Vercel client not initialized');

    const url = new URL(`https://api.vercel.com${path}`);
    if (this.teamId) url.searchParams.set('teamId', this.teamId);

    const res = await fetch(url.toString(), {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Vercel API error ${res.status}`);
    }

    return res.json();
  }

  /** List all Vercel projects */
  async listProjects(limit = 20): Promise<VercelProject[]> {
    const data = await this.request<{ projects: VercelProject[] }>(
      `/v9/projects?limit=${limit}`
    );
    return data.projects;
  }

  /** Get a project by ID or name */
  async getProject(idOrName: string): Promise<VercelProject> {
    return this.request<VercelProject>(`/v9/projects/${encodeURIComponent(idOrName)}`);
  }

  /** Create a new Vercel project */
  async createProject(params: {
    name: string;
    framework?: string;
    gitRepo?: { type: 'github'; repo: string }; // e.g. "owner/repo"
    rootDirectory?: string;
    buildCommand?: string;
    outputDirectory?: string;
    installCommand?: string;
    environmentVariables?: { key: string; value: string; target: string[] }[];
  }): Promise<VercelProject> {
    const body: Record<string, any> = { name: params.name };
    if (params.framework) body.framework = params.framework;
    if (params.rootDirectory) body.rootDirectory = params.rootDirectory;
    if (params.buildCommand) body.buildCommand = params.buildCommand;
    if (params.outputDirectory) body.outputDirectory = params.outputDirectory;
    if (params.installCommand) body.installCommand = params.installCommand;
    if (params.environmentVariables) body.environmentVariables = params.environmentVariables;
    if (params.gitRepo) {
      body.gitRepository = { type: params.gitRepo.type, repo: params.gitRepo.repo };
    }

    return this.request<VercelProject>('/v10/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  /** Add a domain to a Vercel project */
  async addDomain(projectId: string, domain: string): Promise<VercelDomainStatus> {
    return this.request<VercelDomainStatus>(`/v10/projects/${projectId}/domains`, {
      method: 'POST',
      body: JSON.stringify({ name: domain }),
    });
  }

  /** List domains for a project */
  async listDomains(projectId: string): Promise<VercelDomainStatus[]> {
    const data = await this.request<{ domains: VercelDomainStatus[] }>(
      `/v9/projects/${projectId}/domains`
    );
    return data.domains;
  }

  /** Verify domain configuration */
  async verifyDomain(projectId: string, domain: string): Promise<VercelDomainStatus> {
    return this.request<VercelDomainStatus>(
      `/v9/projects/${projectId}/domains/${encodeURIComponent(domain)}/verify`,
      { method: 'POST' }
    );
  }

  /** Get latest deployment for a project */
  async getLatestDeployment(projectId: string): Promise<{
    uid: string;
    url: string;
    state: string;
    createdAt: number;
  } | null> {
    const data = await this.request<{
      deployments: { uid: string; url: string; state: string; createdAt: number }[];
    }>(`/v6/deployments?projectId=${projectId}&limit=1`);
    return data.deployments[0] || null;
  }

  /** Delete a project */
  async deleteProject(idOrName: string): Promise<void> {
    await this.request(`/v9/projects/${encodeURIComponent(idOrName)}`, {
      method: 'DELETE',
    });
  }
}

export const vercelClient = new VercelApiClient();

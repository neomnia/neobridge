/**
 * GitHub Management Client
 * Creates repositories, manages organizations, and sets up projects
 * Credentials loaded from service_api_configs (serviceName: 'github_management')
 */

import { serviceApiRepository } from '@/lib/services';

export interface GitHubRepo {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  sshUrl: string;
  private: boolean;
  defaultBranch: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GitHubOrg {
  login: string;
  id: number;
  avatarUrl: string;
  description: string | null;
}

export class GitHubManagementClient {
  private token: string | null = null;
  private defaultOrg: string | null = null;

  async init(): Promise<boolean> {
    try {
      const config = await serviceApiRepository.getConfig('github_management', 'production');
      if (!config?.config?.personalAccessToken) {
        console.warn('⚠️ [GitHub Mgmt] No token configured');
        return false;
      }
      this.token = config.config.personalAccessToken;
      this.defaultOrg = config.config.defaultOrg || null;
      return true;
    } catch (err) {
      console.error('❌ [GitHub Mgmt] Failed to load config:', err);
      return false;
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) throw new Error('GitHub management client not initialized');

    const res = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `GitHub API error ${res.status}`);
    }

    // 204 No Content
    if (res.status === 204) return {} as T;

    return res.json();
  }

  /** Get authenticated user info */
  async getAuthenticatedUser(): Promise<{
    login: string;
    name: string;
    email: string;
    avatarUrl: string;
  }> {
    const data = await this.request<any>('/user');
    return {
      login: data.login,
      name: data.name || data.login,
      email: data.email || '',
      avatarUrl: data.avatar_url,
    };
  }

  /** List organizations the token has access to */
  async listOrgs(): Promise<GitHubOrg[]> {
    const orgs = await this.request<any[]>('/user/orgs');
    return orgs.map(o => ({
      login: o.login,
      id: o.id,
      avatarUrl: o.avatar_url,
      description: o.description || null,
    }));
  }

  /** List user repositories */
  async listRepos(page = 1, perPage = 50): Promise<GitHubRepo[]> {
    const repos = await this.request<any[]>(
      `/user/repos?sort=updated&per_page=${perPage}&page=${page}`
    );
    return repos.map(this.mapRepo);
  }

  /** Create a repository under the authenticated user */
  async createUserRepo(params: {
    name: string;
    description?: string;
    private?: boolean;
    autoInit?: boolean;
    gitignoreTemplate?: string;
  }): Promise<GitHubRepo> {
    const repo = await this.request<any>('/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        description: params.description || '',
        private: params.private ?? true,
        auto_init: params.autoInit ?? true,
        gitignore_template: params.gitignoreTemplate,
      }),
    });
    return this.mapRepo(repo);
  }

  /** Create a repository under an organization */
  async createOrgRepo(
    org: string,
    params: {
      name: string;
      description?: string;
      private?: boolean;
      autoInit?: boolean;
      gitignoreTemplate?: string;
    }
  ): Promise<GitHubRepo> {
    const repo = await this.request<any>(`/orgs/${org}/repos`, {
      method: 'POST',
      body: JSON.stringify({
        name: params.name,
        description: params.description || '',
        private: params.private ?? true,
        auto_init: params.autoInit ?? true,
        gitignore_template: params.gitignoreTemplate,
      }),
    });
    return this.mapRepo(repo);
  }

  /** Create repo — uses defaultOrg if set, otherwise user repo */
  async createRepo(params: {
    name: string;
    description?: string;
    private?: boolean;
    autoInit?: boolean;
    org?: string; // Override default org
    gitignoreTemplate?: string;
  }): Promise<GitHubRepo> {
    const org = params.org || this.defaultOrg;
    if (org) {
      return this.createOrgRepo(org, params);
    }
    return this.createUserRepo(params);
  }

  /** Get a repository */
  async getRepo(owner: string, repo: string): Promise<GitHubRepo> {
    const data = await this.request<any>(`/repos/${owner}/${repo}`);
    return this.mapRepo(data);
  }

  /** Check if a repository exists */
  async repoExists(owner: string, repo: string): Promise<boolean> {
    try {
      await this.getRepo(owner, repo);
      return true;
    } catch {
      return false;
    }
  }

  /** Add a collaborator */
  async addCollaborator(
    owner: string,
    repo: string,
    username: string,
    permission: 'pull' | 'push' | 'admin' = 'push'
  ): Promise<void> {
    await this.request(`/repos/${owner}/${repo}/collaborators/${username}`, {
      method: 'PUT',
      body: JSON.stringify({ permission }),
    });
  }

  /** Delete a repository */
  async deleteRepo(owner: string, repo: string): Promise<void> {
    await this.request(`/repos/${owner}/${repo}`, { method: 'DELETE' });
  }

  private mapRepo(r: any): GitHubRepo {
    return {
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      sshUrl: r.ssh_url,
      private: r.private,
      defaultBranch: r.default_branch,
      description: r.description || null,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}

export const githubManagementClient = new GitHubManagementClient();

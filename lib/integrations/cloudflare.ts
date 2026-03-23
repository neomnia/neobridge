/**
 * Cloudflare API Client
 * Manages zones (domains), DNS records, and domain availability
 * Credentials loaded from service_api_configs (serviceName: 'cloudflare')
 */

import { serviceApiRepository } from '@/lib/services';

export interface CloudflareZone {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted' | 'deactivated';
  nameServers: string[];
  originalNameServers: string[];
  paused: boolean;
  type: 'full' | 'partial';
  createdOn: string;
  modifiedOn: string;
}

export interface CloudflareDnsRecord {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied: boolean;
  ttl: number;
  createdOn: string;
  modifiedOn: string;
}

export class CloudflareApiClient {
  private token: string | null = null;
  private accountId: string | null = null;

  async init(): Promise<boolean> {
    try {
      const config = await serviceApiRepository.getConfig('cloudflare', 'production');
      if (!config?.config?.apiToken) {
        console.warn('⚠️ [Cloudflare] No API token configured');
        return false;
      }
      this.token = config.config.apiToken;
      this.accountId = config.config.accountId || null;
      return true;
    } catch (err) {
      console.error('❌ [Cloudflare] Failed to load config:', err);
      return false;
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    if (!this.token) throw new Error('Cloudflare client not initialized');

    const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });

    const data = await res.json();
    if (!data.success) {
      const msg = data.errors?.[0]?.message || `Cloudflare API error ${res.status}`;
      throw new Error(msg);
    }

    return data.result;
  }

  /** List all zones (domains) in the account */
  async listZones(page = 1, perPage = 50): Promise<CloudflareZone[]> {
    const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (this.accountId) params.set('account.id', this.accountId);

    const zones = await this.request<any[]>(`/zones?${params}`);
    return zones.map(this.mapZone);
  }

  /** Get a specific zone by domain name */
  async getZoneByName(domainName: string): Promise<CloudflareZone | null> {
    const params = new URLSearchParams({ name: domainName });
    if (this.accountId) params.set('account.id', this.accountId);

    const zones = await this.request<any[]>(`/zones?${params}`);
    if (!zones.length) return null;
    return this.mapZone(zones[0]);
  }

  /** Check domain status — is it in our Cloudflare account and active? */
  async checkDomainStatus(domain: string): Promise<{
    found: boolean;
    active: boolean;
    zone: CloudflareZone | null;
    nameServers: string[];
  }> {
    const zone = await this.getZoneByName(domain).catch(() => null);
    if (!zone) {
      return { found: false, active: false, zone: null, nameServers: [] };
    }
    return {
      found: true,
      active: zone.status === 'active',
      zone,
      nameServers: zone.nameServers,
    };
  }

  /** List DNS records for a zone */
  async listDnsRecords(zoneId: string, type?: string): Promise<CloudflareDnsRecord[]> {
    const params = new URLSearchParams({ per_page: '100' });
    if (type) params.set('type', type);

    const records = await this.request<any[]>(`/zones/${zoneId}/dns_records?${params}`);
    return records.map(this.mapDnsRecord);
  }

  /** Create a DNS record */
  async createDnsRecord(
    zoneId: string,
    record: {
      type: 'A' | 'AAAA' | 'CNAME' | 'TXT' | 'MX';
      name: string;
      content: string;
      proxied?: boolean;
      ttl?: number;
    }
  ): Promise<CloudflareDnsRecord> {
    const result = await this.request<any>(`/zones/${zoneId}/dns_records`, {
      method: 'POST',
      body: JSON.stringify({
        type: record.type,
        name: record.name,
        content: record.content,
        proxied: record.proxied ?? false,
        ttl: record.ttl ?? 1,
      }),
    });
    return this.mapDnsRecord(result);
  }

  /** Add Vercel CNAME record to point domain to Vercel */
  async addVercelCname(zoneId: string, domain: string): Promise<CloudflareDnsRecord> {
    // Vercel uses cname.vercel-dns.com for custom domains
    return this.createDnsRecord(zoneId, {
      type: 'CNAME',
      name: domain.startsWith('www.') ? domain : `www.${domain}`,
      content: 'cname.vercel-dns.com',
      proxied: false,
      ttl: 1,
    });
  }

  /** Add Vercel A record for apex domain */
  async addVercelARecord(zoneId: string, domain: string): Promise<CloudflareDnsRecord> {
    // Vercel's IP for apex domains
    return this.createDnsRecord(zoneId, {
      type: 'A',
      name: '@',
      content: '76.76.21.21',
      proxied: false,
      ttl: 1,
    });
  }

  /** Delete a DNS record */
  async deleteDnsRecord(zoneId: string, recordId: string): Promise<void> {
    await this.request(`/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
    });
  }

  /** Verify if domain DNS is correctly pointing to Vercel */
  async verifyVercelDnsSetup(zoneId: string, domain: string): Promise<{
    apexOk: boolean;
    wwwOk: boolean;
    records: CloudflareDnsRecord[];
  }> {
    const records = await this.listDnsRecords(zoneId);
    const aRecords = records.filter(r => r.type === 'A' && r.name === domain);
    const cnameRecords = records.filter(
      r => r.type === 'CNAME' && (r.name === `www.${domain}` || r.name === domain)
    );

    const apexOk = aRecords.some(r => r.content === '76.76.21.21');
    const wwwOk = cnameRecords.some(r => r.content === 'cname.vercel-dns.com');

    return { apexOk, wwwOk, records };
  }

  private mapZone(z: any): CloudflareZone {
    return {
      id: z.id,
      name: z.name,
      status: z.status,
      nameServers: z.name_servers || [],
      originalNameServers: z.original_name_servers || [],
      paused: z.paused,
      type: z.type,
      createdOn: z.created_on,
      modifiedOn: z.modified_on,
    };
  }

  private mapDnsRecord(r: any): CloudflareDnsRecord {
    return {
      id: r.id,
      type: r.type,
      name: r.name,
      content: r.content,
      proxied: r.proxied,
      ttl: r.ttl,
      createdOn: r.created_on,
      modifiedOn: r.modified_on,
    };
  }
}

export const cloudflareClient = new CloudflareApiClient();

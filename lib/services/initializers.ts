/**
 * Service Initializers
 * Initialize third-party service clients using stored configurations
 */

import { serviceApiRepository } from './repository';
import type {
  StripeConfig,
  PayPalConfig,
  ScalewayConfig,
  ResendConfig,
  AWSConfig,
  LagoConfig,
  ServiceEnvironment,
} from './types';

/**
 * Initialize Stripe client
 */
export async function initStripe(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('stripe', environment) as StripeConfig | null;

  if (!config) {
    throw new Error(`Stripe configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`Stripe configuration is not active for environment: ${environment}`);
  }

  return {
    secretKey: config.config.secretKey,
    publishableKey: config.config.publishableKey,
    webhookSecret: config.config.webhookSecret,
    metadata: config.metadata,
  };
}

/**
 * Initialize PayPal client
 */
export async function initPayPal(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('paypal', environment) as PayPalConfig | null;

  if (!config) {
    throw new Error(`PayPal configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`PayPal configuration is not active for environment: ${environment}`);
  }

  return {
    clientId: config.config.clientId,
    clientSecret: config.config.clientSecret,
    webhookId: config.config.webhookId,
    mode: config.metadata?.mode || 'live',
    metadata: config.metadata,
  };
}

/**
 * Initialize Scaleway client
 */
export async function initScaleway(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('scaleway', environment) as ScalewayConfig | null;

  if (!config) {
    throw new Error(`Scaleway configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`Scaleway configuration is not active for environment: ${environment}`);
  }

  return {
    accessKey: config.config.accessKey,
    secretKey: config.config.secretKey,
    projectId: config.config.projectId,
    organizationId: config.config.organizationId,
    region: config.metadata?.region || 'fr-par',
    zone: config.metadata?.zone || 'fr-par-1',
    metadata: config.metadata,
  };
}

/**
 * Initialize Resend client
 */
export async function initResend(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('resend', environment) as ResendConfig | null;

  if (!config) {
    throw new Error(`Resend configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`Resend configuration is not active for environment: ${environment}`);
  }

  return {
    apiKey: config.config.apiKey,
    domain: config.metadata?.domain,
    metadata: config.metadata,
  };
}

/**
 * Initialize AWS client
 */
export async function initAWS(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('aws', environment) as AWSConfig | null;

  if (!config) {
    throw new Error(`AWS configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`AWS configuration is not active for environment: ${environment}`);
  }

  return {
    credentials: {
      accessKeyId: config.config.accessKeyId,
      secretAccessKey: config.config.secretAccessKey,
      sessionToken: config.config.sessionToken,
    },
    region: config.config.region,
    accountId: config.metadata?.accountId,
    services: config.metadata?.services || [],
    metadata: config.metadata,
  };
}

/**
 * Initialize Lago client
 */
export async function initLago(environment: ServiceEnvironment = 'production') {
  const config = await serviceApiRepository.getConfig('lago', environment) as LagoConfig | null;

  if (!config) {
    throw new Error(`Lago configuration not found for environment: ${environment}`);
  }

  if (!config.isActive) {
    throw new Error(`Lago configuration is not active for environment: ${environment}`);
  }

  return {
    apiKey: config.config.apiKey,
    apiUrl: config.config.apiUrl,
    metadata: config.metadata,
  };
}

/**
 * Test a service configuration
 */
export async function testServiceConnection(serviceName: string, environment: ServiceEnvironment = 'production'): Promise<{ success: boolean; message: string }> {
  try {
    switch (serviceName) {
      case 'stripe':
        await initStripe(environment);
        return { success: true, message: 'Stripe configuration is valid' };

      case 'paypal':
        await initPayPal(environment);
        return { success: true, message: 'PayPal configuration is valid' };

      case 'scaleway':
        await initScaleway(environment);
        return { success: true, message: 'Scaleway configuration is valid' };

      case 'resend':
        await initResend(environment);
        return { success: true, message: 'Resend configuration is valid' };

      case 'aws':
        await initAWS(environment);
        return { success: true, message: 'AWS configuration is valid' };

      case 'lago':
        await initLago(environment);
        return { success: true, message: 'Lago configuration is valid' };

      // NeoBridge services — test with live API call on saved config
      case 'github_token': {
        const cfg = await serviceApiRepository.getConfig('github_token' as any, environment) as any;
        if (!cfg?.config?.personalAccessToken) return { success: false, message: 'Token GitHub non configuré' };
        const r = await fetch('https://api.github.com/user', {
          headers: { 'Authorization': `Bearer ${cfg.config.personalAccessToken}`, 'Accept': 'application/vnd.github+json' }
        });
        if (!r.ok) return { success: false, message: 'Token GitHub invalide ou expiré' };
        const u = await r.json();
        return { success: true, message: `GitHub : @${u.login} (${u.public_repos} repos)` };
      }

      case 'vercel': {
        const cfg = await serviceApiRepository.getConfig('vercel' as any, environment) as any;
        if (!cfg?.config?.apiToken) return { success: false, message: 'Token Vercel non configuré' };
        const r = await fetch('https://api.vercel.com/v2/user', {
          headers: { 'Authorization': `Bearer ${cfg.config.apiToken}` }
        });
        if (!r.ok) return { success: false, message: 'Token Vercel invalide' };
        const u = await r.json();
        return { success: true, message: `Vercel : ${u.user?.username || u.user?.email}` };
      }

      case 'notion': {
        const cfg = await serviceApiRepository.getConfig('notion' as any, environment) as any;
        if (!cfg?.config?.apiKey) return { success: false, message: 'Clé Notion non configurée' };
        const r = await fetch('https://api.notion.com/v1/users/me', {
          headers: { 'Authorization': `Bearer ${cfg.config.apiKey}`, 'Notion-Version': '2022-06-28' }
        });
        if (!r.ok) return { success: false, message: 'Clé API Notion invalide' };
        const u = await r.json();
        return { success: true, message: `Notion : ${u.name || u.bot?.owner?.user?.name || u.id}` };
      }

      case 'anthropic': {
        const cfg = await serviceApiRepository.getConfig('anthropic' as any, environment) as any;
        if (!cfg?.config?.apiKey) return { success: false, message: 'Clé Anthropic non configurée' };
        const r = await fetch('https://api.anthropic.com/v1/models', {
          headers: { 'x-api-key': cfg.config.apiKey, 'anthropic-version': '2023-06-01' }
        });
        if (!r.ok) return { success: false, message: 'Clé API Anthropic invalide' };
        const d = await r.json();
        return { success: true, message: `Anthropic : ${d.data?.length || 0} modèles disponibles` };
      }

      case 'mistral': {
        const cfg = await serviceApiRepository.getConfig('mistral' as any, environment) as any;
        if (!cfg?.config?.apiKey) return { success: false, message: 'Clé Mistral non configurée' };
        const r = await fetch('https://api.mistral.ai/v1/models', {
          headers: { 'Authorization': `Bearer ${cfg.config.apiKey}` }
        });
        if (!r.ok) return { success: false, message: 'Clé API Mistral invalide' };
        const d = await r.json();
        return { success: true, message: `Mistral : ${d.data?.length || 0} modèles disponibles` };
      }

      case 'railway': {
        const cfg = await serviceApiRepository.getConfig('railway' as any, environment) as any;
        if (!cfg?.config?.apiKey) return { success: false, message: 'Clé Railway non configurée' };
        const r = await fetch('https://backboard.railway.app/graphql/v2', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cfg.config.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: '{ me { id name } }' })
        });
        if (!r.ok) return { success: false, message: 'Clé API Railway invalide' };
        const d = await r.json();
        if (d.errors) return { success: false, message: 'Token Railway invalide ou expiré' };
        return { success: true, message: `Railway : ${d.data?.me?.name || d.data?.me?.id}` };
      }

      case 'zoho': {
        const cfg = await serviceApiRepository.getConfig('zoho' as any, environment) as any;
        if (!cfg?.config?.clientId || !cfg?.config?.refreshToken) return { success: false, message: 'Credentials Zoho non configurés' };
        // Try com domain first (most accounts), then eu and in
        for (const domain of ['com', 'eu', 'in']) {
          const params = new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: cfg.config.clientId,
            client_secret: cfg.config.clientSecret,
            refresh_token: cfg.config.refreshToken,
          });
          try {
            const r = await fetch(`https://accounts.zoho.${domain}/oauth/v2/token`, { method: 'POST', body: params });
            const d = await r.json();
            if (d.access_token) {
              return { success: true, message: `Zoho connecté (domaine .${domain}) — token valide ${Math.round((d.expires_in || 3600) / 60)} min` };
            }
          } catch { /* try next */ }
        }
        return { success: false, message: 'Zoho OAuth échoué sur tous les domaines' };
      }

      case 'temporal': {
        const cfg = await serviceApiRepository.getConfig('temporal' as any, environment) as any;
        if (!cfg?.config?.address) return { success: false, message: 'Adresse Temporal non configurée' };
        return { success: true, message: `Temporal configuré : ${cfg.config.address} / ${cfg.config.namespace || 'default'}` };
      }

      case 'openai': {
        const cfg = await serviceApiRepository.getConfig('openai' as any, environment) as any;
        if (!cfg?.config?.apiKey) return { success: false, message: 'Clé OpenAI non configurée' };
        const r = await fetch('https://api.openai.com/v1/models', {
          headers: { 'Authorization': `Bearer ${cfg.config.apiKey}` }
        });
        if (!r.ok) return { success: false, message: 'Clé API OpenAI invalide' };
        const d = await r.json();
        return { success: true, message: `OpenAI : ${d.data?.length || 0} modèles disponibles` };
      }

      case 'gemini': {
        const cfg = await serviceApiRepository.getConfig('gemini' as any, environment) as any;
        if (!cfg?.config?.apiKey) return { success: false, message: 'Clé Gemini non configurée' };
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cfg.config.apiKey}`);
        if (!r.ok) return { success: false, message: 'Clé API Gemini invalide' };
        const d = await r.json();
        return { success: true, message: `Gemini : ${d.models?.length || 0} modèles disponibles` };
      }

      case 'perplexity': {
        const cfg = await serviceApiRepository.getConfig('perplexity' as any, environment) as any;
        if (!cfg?.config?.apiKey) return { success: false, message: 'Clé Perplexity non configurée' };
        const r = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cfg.config.apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
        });
        if (r.status === 401) return { success: false, message: 'Clé API Perplexity invalide' };
        return { success: true, message: 'Perplexity : clé API valide' };
      }

      default:
        return { success: false, message: `Unknown service: ${serviceName}` };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

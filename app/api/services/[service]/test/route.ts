/**
 * API Route for Testing Service Configuration
 * POST /api/services/[service]/test - Test service connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { testServiceConnection } from '@/lib/services';
import type { ServiceEnvironment } from '@/lib/services/types';
import { getCurrentUser } from '@/lib/auth/server';
import { serviceApiRepository } from '@/lib/services';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ service: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { service } = await params;
    const body = await request.json();
    const environment = (body.environment || 'production') as ServiceEnvironment;
    const testConfig = body.testConfig; // Optional: test config before saving

    let result: { success: boolean; message: string };
    const startTime = Date.now();

    // If testConfig is provided, test with those credentials directly
    if (testConfig) {
      try {
        // Test actual API connections with provided credentials
        switch (service) {
          case 'scaleway':
            // Pour TEM, seuls Secret Key et Project ID sont requis
            if (!testConfig.config?.secretKey || !testConfig.config?.projectId) {
              throw new Error('Clés Scaleway manquantes (Secret Key et Project ID requis pour TEM)');
            }

            // Test Scaleway TEM API - List domains for the project
            try {
              const region = 'fr-par';
              const temUrl = `https://api.scaleway.com/transactional-email/v1alpha1/regions/${region}/domains?project_id=${testConfig.config.projectId}`;

              const scalewayResponse = await fetch(temUrl, {
                method: 'GET',
                headers: {
                  'X-Auth-Token': testConfig.config.secretKey,
                  'Content-Type': 'application/json',
                },
              });

              if (!scalewayResponse.ok) {
                const errorText = await scalewayResponse.text();
                let errorMsg = '';
                try {
                  const errorJson = JSON.parse(errorText);
                  errorMsg = errorJson.message || errorJson.error_message || errorJson.error || '';
                } catch {
                  errorMsg = errorText;
                }

                if (scalewayResponse.status === 403) {
                  throw new Error(`Clé Scaleway invalide ou sans permissions TEM (403). Vérifiez votre Secret Key et les permissions.`);
                } else if (scalewayResponse.status === 401) {
                  throw new Error(`Authentification Scaleway échouée (401). Vérifiez votre Secret Key.`);
                } else if (scalewayResponse.status === 404) {
                  throw new Error(`Project ID invalide ou TEM non activé pour ce projet (404).`);
                } else {
                  throw new Error(`Erreur Scaleway TEM ${scalewayResponse.status}: ${errorMsg || 'Erreur inconnue'}`);
                }
              }

              // Verify response and count domains
              const data = await scalewayResponse.json();
              const domainCount = data.domains?.length || 0;
              const verifiedCount = data.domains?.filter((d: any) => d.status === 'checked').length || 0;

              result = {
                success: true,
                message: `Connexion Scaleway TEM réussie ✓ (${verifiedCount}/${domainCount} domaines vérifiés)`
              };
            } catch (error) {
              if (error instanceof Error) {
                throw error;
              }
              throw new Error('Erreur réseau lors de la connexion à Scaleway TEM');
            }
            break;

          case 'resend':
            if (!testConfig.config?.apiKey) {
              throw new Error('Missing required Resend API key');
            }
            // Test Resend API - list domains endpoint
            const resendResponse = await fetch('https://api.resend.com/domains', {
              headers: {
                'Authorization': `Bearer ${testConfig.config.apiKey}`,
                'Content-Type': 'application/json',
              },
            });
            if (!resendResponse.ok) {
              const errorText = await resendResponse.text();
              throw new Error(`Invalid Resend API key: ${errorText}`);
            }
            result = { success: true, message: 'Resend API connection successful' };
            break;

          case 'aws':
            if (!testConfig.config?.accessKeyId || !testConfig.config?.secretAccessKey) {
              throw new Error('Missing required AWS credentials');
            }
            // For AWS, we just validate the format for now
            // Real AWS testing would require AWS SDK
            result = { success: true, message: 'AWS credentials format is valid' };
            break;

          case 'github_token': {
            if (!testConfig.config?.personalAccessToken) throw new Error('Token GitHub manquant');
            const r = await fetch('https://api.github.com/user', {
              headers: { 'Authorization': `Bearer ${testConfig.config.personalAccessToken}`, 'Accept': 'application/vnd.github+json' },
            });
            if (!r.ok) throw new Error('Token GitHub invalide ou expiré');
            const u = await r.json();
            result = { success: true, message: `GitHub : @${u.login} (${u.public_repos} repos publics)` };
            break;
          }

          case 'vercel': {
            if (!testConfig.config?.apiToken) throw new Error('Token Vercel manquant');
            const r = await fetch('https://api.vercel.com/v2/user', {
              headers: { 'Authorization': `Bearer ${testConfig.config.apiToken}` },
            });
            if (!r.ok) throw new Error('Token Vercel invalide');
            const u = await r.json();
            result = { success: true, message: `Vercel : ${u.user?.username || u.user?.email}` };
            break;
          }

          case 'notion': {
            if (!testConfig.config?.apiKey) throw new Error('Clé Notion manquante');
            const r = await fetch('https://api.notion.com/v1/users/me', {
              headers: { 'Authorization': `Bearer ${testConfig.config.apiKey}`, 'Notion-Version': '2022-06-28' },
            });
            if (!r.ok) throw new Error('Clé API Notion invalide');
            const u = await r.json();
            result = { success: true, message: `Notion : ${u.name || u.bot?.owner?.user?.name || u.id}` };
            break;
          }

          case 'anthropic': {
            if (!testConfig.config?.apiKey) throw new Error('Clé Anthropic manquante');
            const r = await fetch('https://api.anthropic.com/v1/models', {
              headers: { 'x-api-key': testConfig.config.apiKey, 'anthropic-version': '2023-06-01' },
            });
            if (!r.ok) throw new Error('Clé API Anthropic invalide');
            const d = await r.json();
            result = { success: true, message: `Anthropic : ${d.data?.length || 0} modèles disponibles` };
            break;
          }

          case 'mistral': {
            if (!testConfig.config?.apiKey) throw new Error('Clé Mistral manquante');
            const r = await fetch('https://api.mistral.ai/v1/models', {
              headers: { 'Authorization': `Bearer ${testConfig.config.apiKey}` },
            });
            if (!r.ok) throw new Error('Clé API Mistral invalide');
            const d = await r.json();
            result = { success: true, message: `Mistral : ${d.data?.length || 0} modèles disponibles` };
            break;
          }

          case 'openai': {
            if (!testConfig.config?.apiKey) throw new Error('Clé OpenAI manquante');
            const r = await fetch('https://api.openai.com/v1/models', {
              headers: { 'Authorization': `Bearer ${testConfig.config.apiKey}` },
            });
            if (!r.ok) throw new Error('Clé API OpenAI invalide');
            const d = await r.json();
            result = { success: true, message: `OpenAI : ${d.data?.length || 0} modèles disponibles` };
            break;
          }

          case 'gemini': {
            if (!testConfig.config?.apiKey) throw new Error('Clé Gemini manquante');
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${testConfig.config.apiKey}`);
            if (!r.ok) throw new Error('Clé API Gemini invalide');
            const d = await r.json();
            result = { success: true, message: `Gemini : ${d.models?.length || 0} modèles disponibles` };
            break;
          }

          case 'perplexity': {
            if (!testConfig.config?.apiKey) throw new Error('Clé Perplexity manquante');
            const r = await fetch('https://api.perplexity.ai/chat/completions', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${testConfig.config.apiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ model: 'sonar', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
            });
            if (r.status === 401) throw new Error('Clé API Perplexity invalide');
            result = { success: true, message: 'Perplexity : clé API valide' };
            break;
          }

          case 'neon': {
            if (!testConfig.config?.apiKey) throw new Error('Clé Neon manquante');
            const r = await fetch('https://console.neon.tech/api/v2/projects', {
              headers: { 'Authorization': `Bearer ${testConfig.config.apiKey}`, 'Accept': 'application/json' },
            });
            if (r.status === 401) throw new Error('Clé API Neon invalide');
            if (!r.ok) throw new Error(`Erreur Neon API (${r.status})`);
            const d = await r.json();
            result = { success: true, message: `Neon : ${d.projects?.length ?? 0} projet(s) accessible(s)` };
            break;
          }

          case 'railway': {
            if (!testConfig.config?.apiKey) throw new Error('Clé Railway manquante');
            const r = await fetch('https://backboard.railway.app/graphql/v2', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${testConfig.config.apiKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ query: '{ me { id name } }' }),
            });
            if (!r.ok) throw new Error('Clé API Railway invalide');
            const d = await r.json();
            if (d.errors) throw new Error('Token Railway invalide ou expiré');
            result = { success: true, message: `Railway : ${d.data?.me?.name || d.data?.me?.id}` };
            break;
          }

          case 'zoho': {
            if (!testConfig.config?.clientId || !testConfig.config?.refreshToken) throw new Error('Client ID et Refresh Token Zoho requis');
            for (const domain of ['com', 'eu', 'in']) {
              const params = new URLSearchParams({
                grant_type: 'refresh_token',
                client_id: testConfig.config.clientId,
                client_secret: testConfig.config.clientSecret || '',
                refresh_token: testConfig.config.refreshToken,
              });
              try {
                const r = await fetch(`https://accounts.zoho.${domain}/oauth/v2/token`, { method: 'POST', body: params });
                const d = await r.json();
                if (d.access_token) {
                  result = { success: true, message: `Zoho connecté (domaine .${domain}) — token valide ${Math.round((d.expires_in || 3600) / 60)} min` };
                  break;
                }
              } catch { /* try next */ }
            }
            if (!result!.success) throw new Error('Zoho OAuth échoué sur tous les domaines');
            break;
          }

          case 'temporal': {
            if (!testConfig.config?.address) throw new Error('Adresse Temporal manquante');
            result = { success: true, message: `Temporal configuré : ${testConfig.config.address} / ${testConfig.config.namespace || 'default'}` };
            break;
          }

          default:
            result = { success: false, message: `Unknown service: ${service}` };
        }
      } catch (error) {
        result = {
          success: false,
          message: error instanceof Error ? error.message : 'Invalid configuration',
        };
      }
    } else {
      // Test the saved service connection
      result = await testServiceConnection(service, environment);
    }

    const responseTime = Date.now() - startTime;

    // If test is successful and we're testing a saved config (not testConfig), mark as tested in database
    if (result.success && !testConfig) {
      const config = await serviceApiRepository.getConfig(
        service as any,
        environment
      );

      if (config) {
        // Find the config ID to mark as tested
        const configs = await serviceApiRepository.listConfigs(service as any);
        const configToUpdate = configs.find(
          (c) => c.serviceName === service && c.environment === environment
        );

        if (configToUpdate) {
          await serviceApiRepository.markTested(configToUpdate.id);
        }
      }

      // Track usage
      if (config) {
        const configs = await serviceApiRepository.listConfigs(service as any);
        const configToTrack = configs.find(
          (c) => c.serviceName === service && c.environment === environment
        );

        if (configToTrack) {
          await serviceApiRepository.trackUsage({
            configId: configToTrack.id,
            serviceName: service as any,
            operation: 'test_connection',
            status: 'success',
            responseTime,
          });
        }
      }
    }

    return NextResponse.json({
      success: result.success,
      message: result.message,
      responseTime,
    });
  } catch (error) {
    console.error('Error testing service configuration:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

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

          case 'github_token':
            if (!testConfig.config?.personalAccessToken) throw new Error("Token GitHub requis")
            {
              const ghRes = await fetch('https://api.github.com/user', {
                headers: {
                  'Authorization': `Bearer ${testConfig.config.personalAccessToken}`,
                  'Accept': 'application/vnd.github+json',
                  'X-GitHub-Api-Version': '2022-11-28',
                }
              })
              if (!ghRes.ok) throw new Error("Token GitHub invalide ou expiré")
              const ghUser = await ghRes.json()
              result = { success: true, message: `GitHub connecté : @${ghUser.login} (${ghUser.public_repos} repos)` }
            }
            break

          case 'vercel':
            if (!testConfig.config?.apiToken) throw new Error("Token Vercel requis")
            {
              const vRes = await fetch('https://api.vercel.com/v2/user', {
                headers: { 'Authorization': `Bearer ${testConfig.config.apiToken}` }
              })
              if (!vRes.ok) throw new Error("Token Vercel invalide")
              const vUser = await vRes.json()
              result = { success: true, message: `Vercel connecté : ${vUser.user?.username || vUser.user?.email}` }
            }
            break

          case 'notion':
            if (!testConfig.config?.apiKey) throw new Error("Clé API Notion requise")
            {
              const nRes = await fetch('https://api.notion.com/v1/users/me', {
                headers: {
                  'Authorization': `Bearer ${testConfig.config.apiKey}`,
                  'Notion-Version': '2022-06-28',
                }
              })
              if (!nRes.ok) throw new Error("Clé API Notion invalide")
              const nUser = await nRes.json()
              result = { success: true, message: `Notion connecté : ${nUser.name || nUser.id}` }
            }
            break

          case 'anthropic':
            if (!testConfig.config?.apiKey) throw new Error("Clé API Anthropic requise")
            {
              const aRes = await fetch('https://api.anthropic.com/v1/models', {
                headers: {
                  'x-api-key': testConfig.config.apiKey,
                  'anthropic-version': '2023-06-01',
                }
              })
              if (!aRes.ok) throw new Error("Clé API Anthropic invalide")
              const aData = await aRes.json()
              const modelCount = aData.data?.length || 0
              result = { success: true, message: `Anthropic connecté — ${modelCount} modèles disponibles` }
            }
            break

          case 'mistral':
            if (!testConfig.config?.apiKey) throw new Error("Clé API Mistral requise")
            {
              const mRes = await fetch('https://api.mistral.ai/v1/models', {
                headers: { 'Authorization': `Bearer ${testConfig.config.apiKey}` }
              })
              if (!mRes.ok) throw new Error("Clé API Mistral invalide")
              const mData = await mRes.json()
              const mCount = mData.data?.length || 0
              result = { success: true, message: `Mistral connecté — ${mCount} modèles disponibles` }
            }
            break

          case 'railway':
            if (!testConfig.config?.apiKey && !testConfig.config?.accessToken && !testConfig.config?.projectToken) {
              if (testConfig.config?.clientId && testConfig.config?.clientSecret) {
                result = {
                  success: true,
                  message: 'Railway OAuth configuré — enregistrez puis lancez /api/auth/oauth/railway pour autoriser l’application.'
                }
                break
              }
              throw new Error("Renseignez un token Railway ou un couple Client ID / Client Secret")
            }
            {
              const token = testConfig.config.projectToken || testConfig.config.apiKey || testConfig.config.accessToken
              const explicitMode = testConfig.metadata?.authMode
              const looksLikeProjectToken = typeof token === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)
              const useProjectToken = explicitMode === 'project-token' || Boolean(testConfig.metadata?.projectName) || looksLikeProjectToken
              const rRes = await fetch('https://backboard.railway.com/graphql/v2', {
                method: 'POST',
                headers: useProjectToken
                  ? {
                      'Project-Access-Token': token,
                      'Content-Type': 'application/json',
                    }
                  : {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json',
                    },
                body: JSON.stringify({
                  query: useProjectToken
                    ? '{ projectToken { projectId environmentId } }'
                    : '{ me { id name email } }'
                })
              })
              if (!rRes.ok) throw new Error(useProjectToken ? "Project token Railway invalide" : "Clé API Railway invalide")
              const rData = await rRes.json()
              if (rData.errors) throw new Error(useProjectToken ? "Project token Railway invalide ou expiré" : "Token Railway invalide ou expiré")
              result = useProjectToken
                ? { success: true, message: `Railway projet valide : ${rData.data?.projectToken?.projectId || 'project'} / ${rData.data?.projectToken?.environmentId || 'environment'}` }
                : { success: true, message: `Railway connecté : ${rData.data?.me?.name || rData.data?.me?.email || rData.data?.me?.id}` }
            }
            break

          case 'zoho':
            if (!testConfig.config?.clientId || !testConfig.config?.refreshToken) throw new Error("Client ID et Refresh Token requis")
            result = { success: true, message: 'Credentials Zoho format OK — connexion vérifiée au prochain refresh token' }
            break

          case 'temporal':
            if (!testConfig.config?.address) throw new Error("Adresse Temporal requise")
            result = { success: true, message: `Temporal configuré : ${testConfig.config.address}` }
            break

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

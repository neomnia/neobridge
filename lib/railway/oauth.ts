import { serviceApiRepository } from "@/lib/services";

const RAILWAY_AUTH_URL = "https://backboard.railway.com/oauth/auth";
const RAILWAY_TOKEN_URL = "https://backboard.railway.com/oauth/token";
const RAILWAY_ME_URL = "https://backboard.railway.com/oauth/me";

export interface RailwayOAuthConfig {
  id?: string;
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  scope: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: string;
  projectId?: string;
  workspaceId?: string;
  metadata?: Record<string, unknown>;
}

export interface RailwayOAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  scope?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

export interface RailwayOAuthProfile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

function resolveDefaultCallbackUrl(requestUrl?: string): string {
  const explicit = process.env.RAILWAY_OAUTH_REDIRECT_URI || process.env.NEXT_PUBLIC_RAILWAY_OAUTH_REDIRECT_URI;
  if (explicit) {
    return explicit;
  }

  if (requestUrl) {
    return `${new URL(requestUrl).origin}/api/auth/oauth/railway/callback`;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/auth/oauth/railway/callback`;
  }

  return "";
}

export async function getRailwayOAuthConfig(
  environment: "production" | "test" | "sandbox" = "production",
  requestUrl?: string
): Promise<RailwayOAuthConfig | null> {
  const savedConfig = await serviceApiRepository.getConfig("railway" as any, environment) as any;

  const callbackUrl =
    savedConfig?.config?.callbackUrl ||
    savedConfig?.metadata?.redirectUri ||
    resolveDefaultCallbackUrl(requestUrl);

  const clientId = savedConfig?.config?.clientId || process.env.RAILWAY_OAUTH_CLIENT_ID || "";
  const clientSecret = savedConfig?.config?.clientSecret || process.env.RAILWAY_OAUTH_CLIENT_SECRET || "";

  if (!clientId || !clientSecret || !callbackUrl) {
    return null;
  }

  return {
    id: savedConfig?.id,
    clientId,
    clientSecret,
    callbackUrl,
    scope: savedConfig?.config?.scope || "openid email profile offline_access",
    apiKey: savedConfig?.config?.apiKey,
    accessToken: savedConfig?.config?.accessToken,
    refreshToken: savedConfig?.config?.refreshToken,
    tokenType: savedConfig?.config?.tokenType,
    expiresAt: savedConfig?.config?.expiresAt,
    projectId: savedConfig?.config?.projectId,
    workspaceId: savedConfig?.config?.workspaceId,
    metadata: savedConfig?.metadata,
  };
}

export function buildRailwayAuthorizationUrl(config: RailwayOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.callbackUrl,
    scope: config.scope || "openid email profile offline_access",
    prompt: "consent",
    state,
  });

  return `${RAILWAY_AUTH_URL}?${params.toString()}`;
}

export async function exchangeRailwayCodeForToken(
  code: string,
  config: RailwayOAuthConfig
): Promise<RailwayOAuthTokenResponse> {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: config.callbackUrl,
  });

  const response = await fetch(RAILWAY_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: params.toString(),
    cache: "no-store",
  });

  const data = await response.json().catch(() => null) as RailwayOAuthTokenResponse | null;

  if (!response.ok || !data?.access_token) {
    throw new Error(
      data?.error_description ||
      data?.error ||
      `Railway token exchange failed (${response.status})`
    );
  }

  return data;
}

export async function fetchRailwayOAuthProfile(accessToken: string): Promise<RailwayOAuthProfile> {
  const response = await fetch(RAILWAY_ME_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  const data = await response.json().catch(() => null) as RailwayOAuthProfile | null;

  if (!response.ok || !data?.sub) {
    throw new Error("Unable to fetch Railway OAuth profile");
  }

  return data;
}

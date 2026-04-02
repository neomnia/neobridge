import { NextRequest, NextResponse } from "next/server";
import { isAdmin, verifyAuth } from "@/lib/auth/server";
import { serviceApiRepository } from "@/lib/services";
import {
  exchangeRailwayCodeForToken,
  fetchRailwayOAuthProfile,
  getRailwayOAuthConfig,
} from "@/lib/railway/oauth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildAdminRedirect(request: NextRequest, status: "success" | "error", error?: string, details?: string) {
  const redirectUrl = new URL("/admin/api", request.url);
  redirectUrl.searchParams.set("service", "railway");
  redirectUrl.searchParams.set("oauth", status);

  if (error) {
    redirectUrl.searchParams.set("error", error);
  }

  if (details) {
    redirectUrl.searchParams.set("details", details);
  }

  return redirectUrl;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const issuer = searchParams.get("iss");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        buildAdminRedirect(request, "error", "railway_denied", error)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        buildAdminRedirect(request, "error", "missing_code", "Le code OAuth Railway est manquant.")
      );
    }

    const savedState = request.cookies.get("railway_oauth_state")?.value;
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        buildAdminRedirect(request, "error", "invalid_state", "Le state OAuth Railway est invalide ou expiré.")
      );
    }

    if (issuer && issuer !== "https://backboard.railway.com") {
      return NextResponse.redirect(
        buildAdminRedirect(request, "error", "invalid_issuer", `Issuer inattendu: ${issuer}`)
      );
    }

    const user = await verifyAuth();
    if (!user || !(await isAdmin(user.userId))) {
      return NextResponse.redirect(
        buildAdminRedirect(request, "error", "admin_required", "Connexion admin requise pour finaliser Railway OAuth.")
      );
    }

    const config = await getRailwayOAuthConfig("production", request.url);
    if (!config) {
      return NextResponse.redirect(
        buildAdminRedirect(
          request,
          "error",
          "config_missing",
          "Les credentials Railway OAuth ne sont pas configurés dans NeoBridge."
        )
      );
    }

    const tokenData = await exchangeRailwayCodeForToken(code, config);
    const profile = await fetchRailwayOAuthProfile(tokenData.access_token);

    const existingConfig = await serviceApiRepository.getConfig("railway" as any, "production") as any;
    const expiresAt = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : existingConfig?.config?.expiresAt;

    const saved = await serviceApiRepository.upsertConfig({
      serviceName: "railway" as any,
      serviceType: existingConfig?.serviceType || "neobridge",
      environment: "production",
      isActive: true,
      isDefault: existingConfig?.isDefault ?? false,
      config: {
        ...(existingConfig?.config || {}),
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        callbackUrl: config.callbackUrl,
        apiKey: tokenData.access_token,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || existingConfig?.config?.refreshToken,
        tokenType: tokenData.token_type || "Bearer",
        scope: tokenData.scope || config.scope,
        idToken: tokenData.id_token || existingConfig?.config?.idToken,
        expiresAt,
      },
      metadata: {
        ...(existingConfig?.metadata || {}),
        authMode: "oauth",
        redirectUri: config.callbackUrl,
        oauthIssuer: issuer || "https://backboard.railway.com",
        connectedAt: new Date().toISOString(),
        railwayUserId: profile.sub,
        railwayUserEmail: profile.email,
        railwayUserName: profile.name,
      },
    } as any);

    try {
      await serviceApiRepository.trackUsage({
        configId: saved.id,
        serviceName: "railway",
        operation: "oauth_callback",
        status: "success",
        statusCode: "200",
        requestData: {
          scope: tokenData.scope || config.scope,
        },
        responseData: {
          railwayUserId: profile.sub,
          railwayUserEmail: profile.email,
        },
        responseTime: Date.now() - startTime,
      });
    } catch (logError) {
      console.error("⚠️ [Railway OAuth Callback] Failed to log success:", logError);
    }

    const response = NextResponse.redirect(
      buildAdminRedirect(request, "success", undefined, "Railway OAuth connecté avec succès.")
    );
    response.cookies.delete("railway_oauth_state");

    return response;
  } catch (error: any) {
    console.error("❌ [Railway OAuth Callback]", error);

    try {
      const existingConfig = await serviceApiRepository.getConfig("railway" as any, "production") as any;
      if (existingConfig?.id) {
        await serviceApiRepository.trackUsage({
          configId: existingConfig.id,
          serviceName: "railway",
          operation: "oauth_callback",
          status: "failed",
          statusCode: "500",
          errorMessage: error?.message || "Railway OAuth callback failed",
          responseTime: Date.now() - startTime,
        });
      }
    } catch (logError) {
      console.error("⚠️ [Railway OAuth Callback] Failed to log error:", logError);
    }

    return NextResponse.redirect(
      buildAdminRedirect(
        request,
        "error",
        "callback_error",
        error?.message || "Impossible de finaliser Railway OAuth."
      )
    );
  }
}

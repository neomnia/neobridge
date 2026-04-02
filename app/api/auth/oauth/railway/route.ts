import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAdmin, verifyAuth } from "@/lib/auth/server";
import { serviceApiRepository } from "@/lib/services";
import { buildRailwayAuthorizationUrl, getRailwayOAuthConfig } from "@/lib/railway/oauth";

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
    const user = await verifyAuth();
    if (!user || !(await isAdmin(user.userId))) {
      return NextResponse.redirect(
        buildAdminRedirect(request, "error", "admin_required", "Connexion admin requise pour autoriser Railway.")
      );
    }

    const config = await getRailwayOAuthConfig("production", request.url);
    if (!config) {
      return NextResponse.redirect(
        buildAdminRedirect(
          request,
          "error",
          "config_missing",
          "Renseignez d'abord le Client ID et le Client Secret Railway dans l'administration."
        )
      );
    }

    const state = crypto.randomUUID();
    const authUrl = buildRailwayAuthorizationUrl(config, state);

    if (config.id) {
      try {
        await serviceApiRepository.trackUsage({
          configId: config.id,
          serviceName: "railway",
          operation: "oauth_initiation",
          status: "success",
          statusCode: "302",
          requestData: {
            redirectUri: config.callbackUrl,
            scope: config.scope,
          },
          responseTime: Date.now() - startTime,
        });
      } catch (logError) {
        console.error("⚠️ [Railway OAuth] Failed to log initiation:", logError);
      }
    }

    const response = NextResponse.redirect(authUrl);
    response.cookies.set("railway_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });

    return response;
  } catch (error: any) {
    console.error("❌ [Railway OAuth] Failed to start flow:", error);

    return NextResponse.redirect(
      buildAdminRedirect(
        request,
        "error",
        "oauth_start_failed",
        error?.message || "Impossible d'initialiser Railway OAuth."
      )
    );
  }
}

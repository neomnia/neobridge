/**
 * GitHub Management Integration API
 * GET  /api/integrations/github - List repos + orgs
 * POST /api/integrations/github - Create repo / test connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { githubManagementClient } from '@/lib/integrations/github-management';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ok = await githubManagementClient.init();
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'GitHub Management not configured. Add credentials in API Management.' },
        { status: 424 }
      );
    }

    const [user, orgs, repos] = await Promise.all([
      githubManagementClient.getAuthenticatedUser(),
      githubManagementClient.listOrgs(),
      githubManagementClient.listRepos(1, 30),
    ]);

    return NextResponse.json({ success: true, data: { user, orgs, repos } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ok = await githubManagementClient.init();
    if (!ok) {
      return NextResponse.json({ success: false, error: 'GitHub Management not configured' }, { status: 424 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'create_repo') {
      const repo = await githubManagementClient.createRepo({
        name: body.name,
        description: body.description,
        private: body.private ?? true,
        autoInit: body.autoInit ?? true,
        org: body.org,
      });
      return NextResponse.json({ success: true, data: repo });
    }

    if (action === 'test') {
      const user = await githubManagementClient.getAuthenticatedUser();
      return NextResponse.json({ success: true, message: 'Connection OK', user });
    }

    if (action === 'list_orgs') {
      const orgs = await githubManagementClient.listOrgs();
      return NextResponse.json({ success: true, data: { orgs } });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

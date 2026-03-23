/**
 * Vercel Integration API
 * GET  /api/integrations/vercel - List Vercel projects + account info
 * POST /api/integrations/vercel - Test connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { vercelClient } from '@/lib/integrations/vercel';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ok = await vercelClient.init();
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Vercel not configured. Add your Vercel token in API Management.' },
        { status: 424 }
      );
    }

    const projects = await vercelClient.listProjects(50);

    return NextResponse.json({ success: true, data: { projects } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ok = await vercelClient.init();
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Vercel not configured' }, { status: 424 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'create_project') {
      const project = await vercelClient.createProject({
        name: body.name,
        framework: body.framework,
        gitRepo: body.gitRepo,
      });
      return NextResponse.json({ success: true, data: project });
    }

    if (action === 'add_domain') {
      const status = await vercelClient.addDomain(body.projectId, body.domain);
      return NextResponse.json({ success: true, data: status });
    }

    if (action === 'list_domains') {
      const domains = await vercelClient.listDomains(body.projectId);
      return NextResponse.json({ success: true, data: { domains } });
    }

    if (action === 'test') {
      const projects = await vercelClient.listProjects(1);
      return NextResponse.json({ success: true, message: 'Connection OK', projectCount: projects.length });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

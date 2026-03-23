/**
 * Cloudflare Integration API
 * GET  /api/integrations/cloudflare?domain=... - Check domain status
 * POST /api/integrations/cloudflare - Domain/DNS actions
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/admin-auth';
import { cloudflareClient } from '@/lib/integrations/cloudflare';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ok = await cloudflareClient.init();
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare not configured. Add credentials in API Management.' },
        { status: 424 }
      );
    }

    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (domain) {
      const status = await cloudflareClient.checkDomainStatus(domain);
      return NextResponse.json({ success: true, data: status });
    }

    // List all zones
    const zones = await cloudflareClient.listZones();
    return NextResponse.json({ success: true, data: { zones } });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAdminAuth(request);
    if (!auth.isAuthenticated || !auth.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const ok = await cloudflareClient.init();
    if (!ok) {
      return NextResponse.json({ success: false, error: 'Cloudflare not configured' }, { status: 424 });
    }

    const body = await request.json();
    const { action } = body;

    if (action === 'check_domain') {
      const status = await cloudflareClient.checkDomainStatus(body.domain);
      return NextResponse.json({ success: true, data: status });
    }

    if (action === 'list_dns') {
      const records = await cloudflareClient.listDnsRecords(body.zoneId, body.type);
      return NextResponse.json({ success: true, data: { records } });
    }

    if (action === 'add_vercel_dns') {
      const { zoneId, domain } = body;
      const [aRecord, cnameRecord] = await Promise.allSettled([
        cloudflareClient.addVercelARecord(zoneId, domain),
        cloudflareClient.addVercelCname(zoneId, domain),
      ]);
      return NextResponse.json({
        success: true,
        data: {
          aRecord: aRecord.status === 'fulfilled' ? aRecord.value : null,
          cnameRecord: cnameRecord.status === 'fulfilled' ? cnameRecord.value : null,
          errors: [
            aRecord.status === 'rejected' ? `A record: ${aRecord.reason?.message}` : null,
            cnameRecord.status === 'rejected' ? `CNAME: ${cnameRecord.reason?.message}` : null,
          ].filter(Boolean),
        },
      });
    }

    if (action === 'verify_vercel_dns') {
      const result = await cloudflareClient.verifyVercelDnsSetup(body.zoneId, body.domain);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'test') {
      const zones = await cloudflareClient.listZones(1, 1);
      return NextResponse.json({ success: true, message: 'Connection OK', zoneCount: zones.length });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

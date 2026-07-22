import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentOrg } from '@/lib/org';

// GET — return current integration status (secret is masked, never sent to client)
export async function GET() {
  const org = await getCurrentOrg();
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  const { data } = await supabase
    .from('accounting_integrations')
    .select('provider, webhook_url, accounting_org_id, is_active, connected_at, last_used_at')
    .eq('org_id', org.orgId)
    .maybeSingle();

  if (!data) return NextResponse.json({ connected: false });

  return NextResponse.json({
    connected:        data.is_active,
    provider:         data.provider,
    webhookUrl:       data.webhook_url,
    accountingOrgId:  data.accounting_org_id,
    connectedAt:      data.connected_at,
    lastUsedAt:       data.last_used_at,
  });
}

// POST — save or update integration credentials
export async function POST(req: NextRequest) {
  const org = await getCurrentOrg();
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { provider, webhookUrl, webhookSecret, accountingOrgId } = body as {
    provider:         string;
    webhookUrl:       string;
    webhookSecret:    string;
    accountingOrgId?: string;
  };

  if (!provider || !webhookUrl || !webhookSecret) {
    return NextResponse.json({ error: 'provider, webhookUrl, and webhookSecret are required.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('accounting_integrations')
    .upsert({
      org_id:           org.orgId,
      provider,
      webhook_url:      webhookUrl,
      webhook_secret:   webhookSecret,
      accounting_org_id: accountingOrgId ?? null,
      is_active:        true,
      connected_at:     new Date().toISOString(),
    }, { onConflict: 'org_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

// DELETE — disconnect integration
export async function DELETE() {
  const org = await getCurrentOrg();
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = await createClient();
  await supabase
    .from('accounting_integrations')
    .update({ is_active: false })
    .eq('org_id', org.orgId);

  return NextResponse.json({ ok: true });
}

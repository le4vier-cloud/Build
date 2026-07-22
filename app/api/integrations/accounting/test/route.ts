import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getCurrentOrg } from '@/lib/org';
import { getAccountingIntegration } from '@/lib/count-integration';

// POST — fire a test ping using the stored credentials; secret never leaves the server
export async function POST() {
  const org = await getCurrentOrg();
  if (!org) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const accounting = await getAccountingIntegration(org.orgId, 'build');
  if (!accounting) return NextResponse.json({ error: 'No integration configured.' }, { status: 404 });

  const result = await accounting.createInvoice({
    number:   'TEST-PING',
    date:     new Date().toISOString().slice(0, 10),
    lineItems: [{ description: 'Integration test — safe to ignore', quantity: 1, unitPrice: 0, vatType: 'exempt' }],
    notes:    'Automated connection test from Build. This invoice can be deleted.',
    sourceRecordId: `test-${Date.now()}`,
  });

  // Touch last_used_at on success
  if (result.ok) {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    await supabase
      .from('accounting_integrations')
      .update({ last_used_at: new Date().toISOString() })
      .eq('org_id', org.orgId);
  }

  return NextResponse.json(result.ok ? { ok: true } : { ok: false, error: result.error });
}

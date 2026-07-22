import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getAccountingIntegration } from '@/lib/count-integration';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: orderId } = params;
  const body = await req.json().catch(() => ({}));
  const { status, salePrice, costPerUnit } = body as {
    status:       string;
    salePrice?:   number;
    costPerUnit?: number;
  };

  const VALID = ['draft', 'in_progress', 'qa_check', 'complete', 'cancelled'];
  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${VALID.join(', ')}` }, { status: 400 });
  }

  const supabase = getSupabase();

  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select('id, status, org_id, clients(id, name, email), products:product_id(id, name)')
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // Fire accounting event only when transitioning to complete,
  // and only if this org has configured an integration.
  if (status === 'complete' && order.status !== 'complete') {
    const accounting = await getAccountingIntegration(order.org_id, 'build');

    if (accounting) {
      const client      = order.clients as any;
      const product     = order.products as any;
      const unitPrice   = salePrice ?? costPerUnit ?? 0;
      const today       = new Date().toISOString().slice(0, 10);
      const due         = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

      accounting.createInvoice({
        number:    `BUILD-${orderId.slice(0, 8).toUpperCase()}`,
        date:      today,
        dueDate:   due,
        contact:   client ? { name: client.name, email: client.email } : undefined,
        lineItems: [{
          description: `Manufacturing: ${product?.name ?? 'Product'}`,
          quantity:    1,
          unitPrice,
          vatType:     'standard',
        }],
        notes:          unitPrice === 0 ? 'Update unit price — pass salePrice in the request body.' : undefined,
        sourceRecordId: orderId,
      }).catch(err => console.error('[orders/status → accounting]', err?.message));
    }
  }

  return NextResponse.json({ ok: true, status });
}

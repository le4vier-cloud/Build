/**
 * PATCH /api/orders/[id]/status
 *
 * Update an order's status. When status transitions to 'complete', fires:
 *   - invoice.created  → client invoice for the finished product
 *   - bill.created     → supplier bills for any outsourced parts consumed (future)
 *
 * Body: {
 *   status: 'draft' | 'in_progress' | 'qa_check' | 'complete' | 'cancelled',
 *   costPerUnit?: number,   // from CostPanel — pass this from the manufacturing store
 *   salePrice?:   number,   // agreed sale price (ex-VAT)
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createAccountingClient } from '@/lib/count-integration';

const accounting = createAccountingClient('build');

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
  const { status, costPerUnit, salePrice } = body as {
    status:       string;
    costPerUnit?: number;
    salePrice?:   number;
  };

  const VALID = ['draft', 'in_progress', 'qa_check', 'complete', 'cancelled'];
  if (!status || !VALID.includes(status)) {
    return NextResponse.json({ error: `Invalid status. Must be one of: ${VALID.join(', ')}` }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch order with client and product info
  const { data: order, error: fetchErr } = await supabase
    .from('orders')
    .select(`
      id, status, start_date, end_date, org_id,
      clients(id, name, email),
      products:product_id(id, name)
    `)
    .eq('id', orderId)
    .single();

  if (fetchErr || !order) {
    return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  }

  // Update status
  const { error: updateErr } = await supabase
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  // ── Fire Count invoice when order is marked complete ──────────────────────
  if (status === 'complete' && order.status !== 'complete') {
    const client      = (order.clients as any);
    const product     = (order.products as any);
    const productName = product?.name ?? 'Manufactured product';
    const unitPrice   = salePrice ?? costPerUnit ?? 0;
    const today       = new Date().toISOString().slice(0, 10);
    const due         = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);

    await accounting.createInvoice({
      number:  `BUILD-${orderId.slice(0, 8).toUpperCase()}`,
      date:    today,
      dueDate: due,
      contact: client ? { name: client.name, email: client.email } : undefined,
      lineItems: [
        {
          description: `Manufacturing: ${productName}`,
          quantity:    1,
          unitPrice,
          vatType:     'standard',
        },
        // Labour cost as a separate line (informational — zero price if not passed)
        ...(costPerUnit && salePrice && salePrice !== costPerUnit ? [{
          description: `[Cost reference] Manufacturing cost per unit: R${costPerUnit.toFixed(2)}`,
          quantity:    1,
          unitPrice:   0,
          vatType:     'exempt' as const,
        }] : []),
      ],
      notes:          unitPrice === 0
        ? 'Update unit price — pass salePrice in the PATCH body or via the CostPanel.'
        : undefined,
      sourceRecordId: orderId,
    }).catch(err => console.error('[orders/status → count invoice]', err?.message));
  }

  return NextResponse.json({ ok: true, status });
}

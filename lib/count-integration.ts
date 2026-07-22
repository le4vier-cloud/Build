import { createHmac, randomUUID } from 'crypto';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export type VATType  = 'standard' | 'zero' | 'exempt' | 'none';
export type Provider = 'count' | 'xero' | 'quickbooks' | 'sage';

export interface LineItem {
  description: string;
  quantity:    number;
  unitPrice:   number;
  vatType?:    VATType;
}

export interface Contact {
  name:       string;
  email?:     string;
  phone?:     string;
  vatNumber?: string;
}

export interface InvoicePayload {
  number?:        string;
  date:           string;
  dueDate?:       string;
  contact?:       Contact;
  lineItems:      LineItem[];
  notes?:         string;
  currency?:      string;
  sourceRecordId: string;
}

export interface BillPayload {
  number?:        string;
  date:           string;
  dueDate?:       string;
  contact?:       Contact;
  lineItems:      LineItem[];
  notes?:         string;
  sourceRecordId: string;
}

export interface ExpensePayload {
  date:           string;
  description:    string;
  amount:         number;
  vatType?:       VATType;
  category?:      string;
  contact?:       Contact;
  notes?:         string;
  reference?:     string;
  sourceRecordId: string;
}

export interface PaymentPayload {
  date:           string;
  amount:         number;
  vatType?:       VATType;
  description?:   string;
  contact?:       Contact;
  reference?:     string;
  notes?:         string;
  currency?:      string;
  sourceRecordId: string;
}

export interface IntegrationConfig {
  webhookUrl:       string;
  webhookSecret:    string;
  accountingOrgId?: string;
  source:           string;
  provider?:        Provider;
}

function sign(secret: string, body: string) {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

function buildRequest(config: IntegrationConfig, eventType: string, sourceRecordId: string, data: object) {
  const provider = config.provider ?? 'count';

  if (provider === 'xero') {
    const body = JSON.stringify({ Invoices: [{ ...data }] });
    return {
      url: `https://api.xero.com/api.xro/2.0/Invoices`,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.webhookSecret}`, 'Xero-tenant-id': config.accountingOrgId ?? '' },
      body,
    };
  }

  if (provider === 'quickbooks') {
    const body = JSON.stringify(data);
    return {
      url: `https://quickbooks.api.intuit.com/v3/company/${config.accountingOrgId}/invoice`,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.webhookSecret}` },
      body,
    };
  }

  // Default: Count signed webhook
  const payload = { id: randomUUID(), event: eventType, source: config.source, sourceRecordId, timestamp: new Date().toISOString(), data };
  const body    = JSON.stringify(payload);
  return {
    url: config.webhookUrl,
    headers: {
      'Content-Type':      'application/json',
      'X-Count-Org-Id':    config.accountingOrgId ?? '',
      'X-Count-Signature': sign(config.webhookSecret, body),
    },
    body,
  };
}

export class AccountingIntegration {
  constructor(private config: IntegrationConfig) {}

  private async send(eventType: string, sourceRecordId: string, data: object) {
    try {
      const { url, headers, body } = buildRequest(this.config, eventType, sourceRecordId, data);
      const res = await fetch(url, { method: 'POST', headers, body });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const json = await res.json().catch(() => ({}));
      return { ok: true, count_record_id: json.count_record_id as string | undefined };
    } catch (err: any) {
      console.error(`[accounting/${eventType}]`, err?.message);
      return { ok: false, error: err?.message as string };
    }
  }

  createInvoice(p: InvoicePayload) {
    return this.send('invoice.created', p.sourceRecordId, {
      type: 'invoice', number: p.number, date: p.date, dueDate: p.dueDate,
      currency: p.currency ?? 'ZAR', contact: p.contact, lineItems: p.lineItems, notes: p.notes,
    });
  }

  createBill(p: BillPayload) {
    return this.send('bill.created', p.sourceRecordId, {
      type: 'bill', number: p.number, date: p.date, dueDate: p.dueDate,
      contact: p.contact, lineItems: p.lineItems, notes: p.notes,
    });
  }

  createExpense(p: ExpensePayload) {
    return this.send('expense.created', p.sourceRecordId, {
      type: 'expense', date: p.date, description: p.description, amount: p.amount,
      vatType: p.vatType ?? 'standard', category: p.category, contact: p.contact,
      notes: p.notes, number: p.reference,
    });
  }

  recordPayment(p: PaymentPayload) {
    return this.send('payment.received', p.sourceRecordId, {
      type: 'payment', date: p.date, amount: p.amount, vatType: p.vatType ?? 'standard',
      description: p.description, contact: p.contact, notes: p.notes,
      number: p.reference, currency: p.currency ?? 'ZAR',
    });
  }
}

/** Fetches credentials from DB for the given org and returns a ready client.
 *  Returns null if no integration is configured — callers should skip silently. */
export async function getAccountingIntegration(
  orgId:  string,
  source: 'build' | 'transport',
): Promise<AccountingIntegration | null> {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from('accounting_integrations')
    .select('webhook_url, webhook_secret, accounting_org_id, provider')
    .eq('org_id', orgId)
    .eq('is_active', true)
    .maybeSingle();

  if (!data) return null;

  return new AccountingIntegration({
    webhookUrl:       data.webhook_url,
    webhookSecret:    data.webhook_secret,
    accountingOrgId:  data.accounting_org_id ?? undefined,
    source,
    provider:         data.provider as Provider,
  });
}

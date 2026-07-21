/**
 * count-integration.ts
 *
 * Drop-in accounting integration client. Fire accounting events from any
 * source app (Build, Transport, Shake) to Count — or swap the provider to
 * send the same events to Xero, QuickBooks, or Sage instead.
 *
 * USAGE (copy this file into the source app's lib/ directory):
 *
 *   const accounting = new AccountingIntegration({
 *     url:      process.env.COUNT_WEBHOOK_URL!,
 *     secret:   process.env.COUNT_WEBHOOK_SECRET!,
 *     orgId:    process.env.COUNT_ORG_ID!,
 *     source:   'build',           // or 'transport' | 'shake'
 *     provider: 'count',           // or 'xero' | 'quickbooks' | 'sage'
 *   });
 *
 *   await accounting.createInvoice({ ... });
 *   await accounting.createBill({ ... });
 *   await accounting.createExpense({ ... });
 *   await accounting.recordPayment({ ... });
 */
import { createHmac, randomUUID } from 'crypto';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VATType = 'standard' | 'zero' | 'exempt' | 'none';
export type Provider = 'count' | 'xero' | 'quickbooks' | 'sage';

export interface LineItem {
  description: string;
  quantity:    number;
  unitPrice:   number;     // excluding VAT
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
  date:           string;       // YYYY-MM-DD
  dueDate?:       string;
  contact?:       Contact;
  lineItems:      LineItem[];
  notes?:         string;
  currency?:      string;
  sourceRecordId: string;       // ID in the source app (for idempotency)
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
  amount:         number;       // excluding VAT
  vatType?:       VATType;
  category?:      string;       // must match Count's expense category names
  contact?:       Contact;
  notes?:         string;
  reference?:     string;
  sourceRecordId: string;
}

export interface PaymentPayload {
  date:           string;
  amount:         number;       // excluding VAT
  vatType?:       VATType;
  description?:   string;
  contact?:       Contact;
  reference?:     string;
  notes?:         string;
  currency?:      string;
  sourceRecordId: string;
}

export interface IntegrationConfig {
  url:       string;      // Count webhook URL or accounting provider API base
  secret:    string;      // HMAC signing secret (Count) or OAuth token (Xero/QB)
  orgId:     string;      // Count org UUID (or Xero tenantId / QB realmId)
  source:    string;      // 'build' | 'transport' | 'shake'
  provider?: Provider;    // default: 'count'
  silent?:   boolean;     // if true, log errors but never throw (default: true)
}

// ── Signature ─────────────────────────────────────────────────────────────────

function sign(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

// ── Provider adapters ─────────────────────────────────────────────────────────
// Each adapter maps our standard payload to the provider's wire format.
// Count is implemented fully; Xero/QB show the extension point.

interface AdapterResult {
  url:     string;
  headers: Record<string, string>;
  body:    string;
}

function adaptCount(
  config: IntegrationConfig,
  eventType: string,
  sourceRecordId: string,
  data: object,
): AdapterResult {
  const payload = {
    id:             randomUUID(),
    event:          eventType,
    source:         config.source,
    sourceRecordId,
    timestamp:      new Date().toISOString(),
    data,
  };
  const body = JSON.stringify(payload);
  return {
    url: config.url,
    headers: {
      'Content-Type':     'application/json',
      'X-Count-Org-Id':   config.orgId,
      'X-Count-Signature': sign(config.secret, body),
    },
    body,
  };
}

function adaptXero(
  config: IntegrationConfig,
  eventType: string,
  _sourceRecordId: string,
  data: any,
): AdapterResult {
  // Xero uses OAuth2 Bearer tokens and a REST API instead of webhooks.
  // Map our standard format to Xero's Invoices / BankTransactions API.
  // See: https://developer.xero.com/documentation/api/accounting/invoices
  const tenantId  = config.orgId;
  const baseUrl   = 'https://api.xero.com/api.xro/2.0';

  let xeroPath = '/Invoices';
  let xeroBody: any = {};

  if (eventType === 'invoice.created') {
    xeroBody = {
      Type:        'ACCREC',
      Contact:     { Name: data.contact?.name ?? 'Unknown' },
      Date:        data.date,
      DueDate:     data.dueDate ?? data.date,
      Status:      'AUTHORISED',
      LineItems:   (data.lineItems ?? []).map((li: LineItem) => ({
        Description: li.description,
        Quantity:    li.quantity,
        UnitAmount:  li.unitPrice,
        TaxType:     li.vatType === 'standard' ? 'OUTPUT' : 'NONE',
      })),
    };
  } else if (eventType === 'bill.created') {
    xeroBody = { ...xeroBody, Type: 'ACCPAY' };
  }

  return {
    url:     `${baseUrl}${xeroPath}`,
    headers: {
      'Content-Type':   'application/json',
      'Authorization':  `Bearer ${config.secret}`,
      'Xero-tenant-id': tenantId,
    },
    body: JSON.stringify({ Invoices: [xeroBody] }),
  };
}

function adaptQuickBooks(
  config: IntegrationConfig,
  eventType: string,
  _sourceRecordId: string,
  data: any,
): AdapterResult {
  // QuickBooks Online REST API (v3)
  // See: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/invoices
  const realmId = config.orgId;
  const baseUrl = `https://quickbooks.api.intuit.com/v3/company/${realmId}`;

  const qbBody: any = {
    Line: (data.lineItems ?? []).map((li: LineItem) => ({
      Amount:          li.unitPrice * li.quantity,
      DetailType:      'SalesItemLineDetail',
      SalesItemLineDetail: { Qty: li.quantity, UnitPrice: li.unitPrice },
      Description:     li.description,
    })),
    CustomerRef: { name: data.contact?.name ?? 'Unknown' },
    TxnDate:     data.date,
    DueDate:     data.dueDate,
  };

  return {
    url:     `${baseUrl}/invoice`,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${config.secret}`,
      'Accept':        'application/json',
    },
    body: JSON.stringify(qbBody),
  };
}

// ── Main class ────────────────────────────────────────────────────────────────

export class AccountingIntegration {
  private config: Required<IntegrationConfig>;

  constructor(config: IntegrationConfig) {
    this.config = { provider: 'count', silent: true, ...config };
  }

  private adapt(eventType: string, sourceRecordId: string, data: object): AdapterResult {
    switch (this.config.provider) {
      case 'xero':        return adaptXero(this.config, eventType, sourceRecordId, data);
      case 'quickbooks':  return adaptQuickBooks(this.config, eventType, sourceRecordId, data);
      default:            return adaptCount(this.config, eventType, sourceRecordId, data);
    }
  }

  private async send(eventType: string, sourceRecordId: string, data: object): Promise<{ ok: boolean; count_record_id?: string; error?: string }> {
    if (!this.config.url || !this.config.secret || !this.config.orgId) {
      if (this.config.silent) return { ok: false, error: 'Accounting integration not configured.' };
      throw new Error('Accounting integration not configured (missing COUNT_WEBHOOK_URL / COUNT_WEBHOOK_SECRET / COUNT_ORG_ID).');
    }

    try {
      const { url, headers, body } = this.adapt(eventType, sourceRecordId, data);
      const res = await fetch(url, { method: 'POST', headers, body });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`${res.status}: ${err}`);
      }
      const json = await res.json().catch(() => ({}));
      return { ok: true, count_record_id: json.count_record_id };
    } catch (err: any) {
      console.error(`[accounting/${eventType}]`, err?.message);
      if (this.config.silent) return { ok: false, error: err?.message };
      throw err;
    }
  }

  /** Create a client invoice (e.g. completed order, delivered shipment) */
  createInvoice(payload: InvoicePayload) {
    return this.send('invoice.created', payload.sourceRecordId, {
      type:      'invoice',
      number:    payload.number,
      date:      payload.date,
      dueDate:   payload.dueDate,
      currency:  payload.currency ?? 'ZAR',
      contact:   payload.contact,
      lineItems: payload.lineItems,
      notes:     payload.notes,
    });
  }

  /** Create a supplier bill (e.g. parts purchase, material restock) */
  createBill(payload: BillPayload) {
    return this.send('bill.created', payload.sourceRecordId, {
      type:      'bill',
      number:    payload.number,
      date:      payload.date,
      dueDate:   payload.dueDate,
      contact:   payload.contact,
      lineItems: payload.lineItems,
      notes:     payload.notes,
    });
  }

  /** Record a business expense (e.g. fuel, driver pay, vehicle repair) */
  createExpense(payload: ExpensePayload) {
    return this.send('expense.created', payload.sourceRecordId, {
      type:        'expense',
      date:        payload.date,
      description: payload.description,
      amount:      payload.amount,
      vatType:     payload.vatType ?? 'standard',
      category:    payload.category,
      contact:     payload.contact,
      notes:       payload.notes,
      number:      payload.reference,
    });
  }

  /** Record a payment received (e.g. subscription charge, BtM post payment) */
  recordPayment(payload: PaymentPayload) {
    return this.send('payment.received', payload.sourceRecordId, {
      type:        'payment',
      date:        payload.date,
      amount:      payload.amount,
      vatType:     payload.vatType ?? 'standard',
      description: payload.description,
      contact:     payload.contact,
      notes:       payload.notes,
      number:      payload.reference,
      currency:    payload.currency ?? 'ZAR',
    });
  }
}

/** Singleton factory — call once per app, reads from env */
export function createAccountingClient(source: 'build' | 'transport' | 'shake') {
  return new AccountingIntegration({
    url:    process.env.COUNT_WEBHOOK_URL    ?? '',
    secret: process.env.COUNT_WEBHOOK_SECRET ?? '',
    orgId:  process.env.COUNT_ORG_ID         ?? '',
    source,
    provider: (process.env.COUNT_PROVIDER as Provider | undefined) ?? 'count',
    silent: true,
  });
}

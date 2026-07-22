-- Accounting integration credentials, stored per org.
-- Secrets are NEVER returned to the client — only used server-side when firing events.

create table accounting_integrations (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references organizations(id) on delete cascade,
  provider          text not null default 'count'
                      check (provider in ('count', 'xero', 'quickbooks', 'sage')),
  webhook_url       text not null,       -- Count webhook URL or Xero/QB API base
  webhook_secret    text not null,       -- HMAC secret (Count) or OAuth token (Xero/QB)
  accounting_org_id text,                -- Count org UUID / Xero tenantId / QB realmId
  is_active         boolean not null default true,
  connected_at      timestamptz not null default now(),
  last_used_at      timestamptz,
  unique (org_id)                        -- one active integration per org
);

alter table accounting_integrations enable row level security;

-- Only org members can read/write their own integration row
create policy "org members manage their own integration"
  on accounting_integrations for all
  using  (org_id in (select org_id from org_members where user_id = auth.uid()))
  with check (org_id in (select org_id from org_members where user_id = auth.uid()));

-- ============================================================
-- BUILD — Initial Schema
-- Run this in your Supabase SQL editor after connecting.
-- Enable Row Level Security on every table.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Organisations (multi-tenant root) ────────────────────────
create table organizations (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  logo_url    text,
  created_at  timestamptz not null default now()
);

-- ── Users / Auth ─────────────────────────────────────────────
-- Supabase Auth handles auth.users; this extends it per org.
create table org_members (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','admin','member')),
  created_at  timestamptz not null default now(),
  unique (org_id, user_id)
);

-- ── Staff ─────────────────────────────────────────────────────
create table staff_roles (
  id      uuid primary key default uuid_generate_v4(),
  org_id  uuid not null references organizations(id) on delete cascade,
  name    text not null
);

create table staff (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  email        text not null,
  headshot_url text,
  hourly_wage  numeric(10,2) not null default 0,
  user_role    text not null default 'front_end' check (user_role in ('front_end','back_end')),
  created_at   timestamptz not null default now(),
  unique (org_id, email)
);

create table staff_role_assignments (
  staff_id  uuid not null references staff(id) on delete cascade,
  role_id   uuid not null references staff_roles(id) on delete cascade,
  primary key (staff_id, role_id)
);

create table clock_stamps (
  id             uuid primary key default uuid_generate_v4(),
  staff_id       uuid not null references staff(id) on delete cascade,
  clocked_in_at  timestamptz not null default now(),
  clocked_out_at timestamptz
);

create table staff_schedules (
  id           uuid primary key default uuid_generate_v4(),
  staff_id     uuid not null references staff(id) on delete cascade,
  day_of_week  int not null check (day_of_week between 0 and 6), -- 0=Sun
  start_time   time not null,
  end_time     time not null
);

-- ── Tools ─────────────────────────────────────────────────────
create table tools (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references organizations(id) on delete cascade,
  name          text not null,
  serial_number text,
  image_url     text,
  created_at    timestamptz not null default now()
);

-- ── Stations ──────────────────────────────────────────────────
create table stations (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null,
  image_url  text,
  created_at timestamptz not null default now()
);

create table station_staff (
  station_id uuid not null references stations(id) on delete cascade,
  staff_id   uuid not null references staff(id) on delete cascade,
  primary key (station_id, staff_id)
);

create table station_tools (
  station_id uuid not null references stations(id) on delete cascade,
  tool_id    uuid not null references tools(id) on delete cascade,
  primary key (station_id, tool_id)
);

-- wage_per_hour is derived: sum of staff.hourly_wage for assigned staff
-- stored as a cache/override if needed
alter table stations add column wage_per_hour_override numeric(10,2);

-- ── Products ──────────────────────────────────────────────────
create table products (
  id          uuid primary key default uuid_generate_v4(),
  org_id      uuid not null references organizations(id) on delete cascade,
  name        text not null,
  model       text,
  description text,
  image_url   text,
  created_at  timestamptz not null default now()
);

create table product_options (
  id         uuid primary key default uuid_generate_v4(),
  product_id uuid not null references products(id) on delete cascade,
  name       text not null
);

create table product_events (
  id          uuid primary key default uuid_generate_v4(),
  product_id  uuid not null references products(id) on delete cascade,
  name        text not null,
  description text
);

-- ── Suppliers ─────────────────────────────────────────────────
create table suppliers (
  id           uuid primary key default uuid_generate_v4(),
  org_id       uuid not null references organizations(id) on delete cascade,
  name         text not null,
  address      text,
  created_at   timestamptz not null default now()
);

create table supplier_emails (
  id          uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  email       text not null
);

create table supplier_phones (
  id          uuid primary key default uuid_generate_v4(),
  supplier_id uuid not null references suppliers(id) on delete cascade,
  number      text not null
);

-- ── Parts (Outsourced) ────────────────────────────────────────
create table parts_os (
  id            uuid primary key default uuid_generate_v4(),
  org_id        uuid not null references organizations(id) on delete cascade,
  supplier_id   uuid references suppliers(id) on delete set null,
  name          text not null,
  barcode       text,
  serial_number text,
  qty_in_stock  numeric(12,3) not null default 0,
  min_threshold numeric(12,3),
  cost_price    numeric(12,2),
  sale_price    numeric(12,2),
  created_at    timestamptz not null default now()
);

-- ── Parts (Internally Manufactured) ──────────────────────────
create table parts_im (
  id                    uuid primary key default uuid_generate_v4(),
  org_id                uuid not null references organizations(id) on delete cascade,
  name                  text not null,
  serial_number         text,
  qty_in_stock          numeric(12,3) not null default 0,
  min_threshold         numeric(12,3),
  low_stock_alert       boolean not null default true,
  assembly_task_name    text not null default 'Internal Manufacturing of',
  assembly_description  text,
  max_produce_minutes   numeric(10,2),
  labour_cost_per_hour  numeric(10,2),
  created_at            timestamptz not null default now()
);

-- OS parts needed to build one unit of an IM part
create table parts_im_components (
  id           uuid primary key default uuid_generate_v4(),
  part_im_id   uuid not null references parts_im(id) on delete cascade,
  part_os_id   uuid not null references parts_os(id) on delete cascade,
  quantity      numeric(12,3) not null default 1
);

-- ── Processes — Tasks & Workflows ────────────────────────────
create table tasks (
  id               uuid primary key default uuid_generate_v4(),
  org_id           uuid not null references organizations(id) on delete cascade,
  product_id       uuid references products(id) on delete cascade,
  name             text not null,
  duration_minutes numeric(10,2) not null default 0,
  option_set       text not null default 'human' check (option_set in ('human','machine'))
);

create table task_option_assignments (
  task_id   uuid not null references tasks(id) on delete cascade,
  option_id uuid not null references product_options(id) on delete cascade,
  primary key (task_id, option_id)
);

create table workflows (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references organizations(id) on delete cascade,
  product_id uuid references products(id) on delete cascade,
  name       text not null
);

create table workflow_tasks (
  workflow_id  uuid not null references workflows(id) on delete cascade,
  task_id      uuid not null references tasks(id) on delete cascade,
  order_index  int not null default 0,
  primary key (workflow_id, task_id)
);

-- Station → Workflow per Product link (used in Stations module)
create table station_product_workflows (
  id          uuid primary key default uuid_generate_v4(),
  station_id  uuid not null references stations(id) on delete cascade,
  product_id  uuid not null references products(id) on delete cascade,
  workflow_id uuid not null references workflows(id) on delete cascade
);

-- ── Production Processes (saved flow layouts) ────────────────
create table production_processes (
  id                 uuid primary key default uuid_generate_v4(),
  org_id             uuid not null references organizations(id) on delete cascade,
  product_id         uuid not null references products(id) on delete cascade,
  name               text not null,
  total_time_minutes numeric(10,2),
  created_at         timestamptz not null default now()
);

create table process_nodes (
  id               uuid primary key default uuid_generate_v4(),
  process_id       uuid not null references production_processes(id) on delete cascade,
  station_id       uuid not null references stations(id) on delete cascade,
  order_index      int not null default 0,
  parallel_group   text,
  pos_x            numeric(10,2) not null default 0,
  pos_y            numeric(10,2) not null default 0
);

create table process_node_tasks (
  node_id  uuid not null references process_nodes(id) on delete cascade,
  task_id  uuid not null references tasks(id) on delete cascade,
  primary key (node_id, task_id)
);

create table process_node_workflows (
  node_id     uuid not null references process_nodes(id) on delete cascade,
  workflow_id uuid not null references workflows(id) on delete cascade,
  primary key (node_id, workflow_id)
);

-- ── Clients ───────────────────────────────────────────────────
create table clients (
  id         uuid primary key default uuid_generate_v4(),
  org_id     uuid not null references organizations(id) on delete cascade,
  name       text not null,
  address    text,
  created_at timestamptz not null default now()
);

create table client_emails (
  id        uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  email     text not null
);

create table client_phones (
  id        uuid primary key default uuid_generate_v4(),
  client_id uuid not null references clients(id) on delete cascade,
  number    text not null
);

-- ── Orders ────────────────────────────────────────────────────
create type order_status as enum ('draft','in_progress','qa_check','complete','cancelled');

create table orders (
  id                uuid primary key default uuid_generate_v4(),
  org_id            uuid not null references organizations(id) on delete cascade,
  client_id         uuid not null references clients(id) on delete restrict,
  product_id        uuid not null references products(id) on delete restrict,
  status            order_status not null default 'draft',
  progress_pct      numeric(5,2) not null default 0 check (progress_pct between 0 and 100),
  total_minutes     numeric(10,2),
  remaining_minutes numeric(10,2),
  start_date        date,
  end_date          date,
  created_at        timestamptz not null default now()
);

create table order_options (
  order_id  uuid not null references orders(id) on delete cascade,
  option_id uuid not null references product_options(id) on delete cascade,
  primary key (order_id, option_id)
);

create table order_stations (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references orders(id) on delete cascade,
  station_id  uuid not null references stations(id) on delete restrict,
  status      text not null default 'pending' check (status in ('pending','in_progress','complete')),
  progress_pct numeric(5,2) not null default 0
);

create table order_bom_items (
  id           uuid primary key default uuid_generate_v4(),
  order_id     uuid not null references orders(id) on delete cascade,
  part_type    text not null check (part_type in ('os','im')),
  part_os_id   uuid references parts_os(id) on delete restrict,
  part_im_id   uuid references parts_im(id) on delete restrict,
  qty_needed   numeric(12,3) not null default 0,
  qty_used     numeric(12,3) not null default 0
);

-- ── Row Level Security ────────────────────────────────────────
-- Enable RLS on all tables. Policies: org members can access their org's data.

alter table organizations           enable row level security;
alter table org_members             enable row level security;
alter table staff                   enable row level security;
alter table staff_roles             enable row level security;
alter table staff_role_assignments  enable row level security;
alter table clock_stamps            enable row level security;
alter table staff_schedules         enable row level security;
alter table stations                enable row level security;
alter table station_staff           enable row level security;
alter table station_tools           enable row level security;
alter table tools                   enable row level security;
alter table products                enable row level security;
alter table product_options         enable row level security;
alter table product_events          enable row level security;
alter table suppliers               enable row level security;
alter table supplier_emails         enable row level security;
alter table supplier_phones         enable row level security;
alter table parts_os                enable row level security;
alter table parts_im                enable row level security;
alter table parts_im_components     enable row level security;
alter table tasks                   enable row level security;
alter table task_option_assignments enable row level security;
alter table workflows               enable row level security;
alter table workflow_tasks          enable row level security;
alter table station_product_workflows enable row level security;
alter table production_processes    enable row level security;
alter table process_nodes           enable row level security;
alter table process_node_tasks      enable row level security;
alter table process_node_workflows  enable row level security;
alter table clients                 enable row level security;
alter table client_emails           enable row level security;
alter table client_phones           enable row level security;
alter table orders                  enable row level security;
alter table order_options           enable row level security;
alter table order_stations          enable row level security;
alter table order_bom_items         enable row level security;

-- Helper: is the current user a member of an org?
create or replace function is_org_member(org uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from org_members
    where org_id = org
      and user_id = auth.uid()
  );
$$;

-- Generic member policy (read + write within org)
-- Apply to every org_id-scoped table. Example for `staff`:
create policy "org members can manage staff"
  on staff for all
  using (is_org_member(org_id))
  with check (is_org_member(org_id));

-- (Repeat pattern for all other org_id tables — abbreviated here)
-- TODO: add policies for each table following the same pattern.

-- ── Useful Indexes ────────────────────────────────────────────
create index on staff(org_id);
create index on stations(org_id);
create index on products(org_id);
create index on tools(org_id);
create index on suppliers(org_id);
create index on parts_os(org_id);
create index on parts_os(supplier_id);
create index on parts_im(org_id);
create index on clients(org_id);
create index on orders(org_id);
create index on orders(client_id);
create index on orders(product_id);
create index on orders(status);
create index on clock_stamps(staff_id);
create index on order_stations(order_id);

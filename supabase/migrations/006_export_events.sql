create table if not exists export_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  export_type text not null,
  export_id text not null,
  export_name text,
  ip_hash text,
  user_agent text
);

create index if not exists idx_export_events_type_id on export_events (export_type, export_id);
create index if not exists idx_export_events_created on export_events (created_at desc);

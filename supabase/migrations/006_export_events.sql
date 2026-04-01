create table if not exists export_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  export_type text not null,        -- "researcher" | "domain" | "paper"
  export_id text not null,          -- the id or slug
  export_name text,                 -- human-readable name
  ip_hash text,                     -- hashed IP for dedup (privacy-safe)
  user_agent text
);

create index on export_events (export_type, export_id);
create index on export_events (created_at desc);

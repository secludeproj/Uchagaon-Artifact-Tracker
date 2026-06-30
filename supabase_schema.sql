-- ============================================
-- SECLUDE HERITAGE INVENTORY MANAGER
-- Supabase PostgreSQL Schema
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES TABLE (replaces Firebase users collection)
-- ============================================
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text unique not null,
  name text not null default '',
  role text not null default 'STAFF' check (role in ('ADMIN', 'STAFF', 'OWNER VIEW', 'CHIEF HERITAGE CONSERVATOR', 'PRINCIPAL PALACE MUSEOLOGIST', 'HERITAGE REGISTRAR & ARCHIVIST', 'PALACE SECURITY OFFICER')),
  avatar_url text,
  joined_date timestamptz default now(),
  last_active timestamptz default now()
);

-- ============================================
-- ARTIFACTS TABLE
-- ============================================
create table public.artifacts (
  id text primary key default 'ART-' || upper(substr(md5(random()::text), 1, 8)),
  qr_code text unique not null default 'QR-' || upper(substr(md5(random()::text), 1, 10)),
  name text not null,
  category text not null check (category in (
    'Weaponry & Armor', 'Artwork & Paintings', 'Furniture',
    'Textiles & Carpets', 'Ceramics & Pottery', 'Metalwork',
    'Religious & Ceremonial', 'Manuscripts & Books',
    'Jewelry & Ornaments', 'Other'
  )),
  description text default '',
  estimated_age text default '',
  material text default '',
  dimensions text default '',
  condition text not null default 'Good' check (condition in ('Mint', 'Good', 'Fair', 'Poor', 'Damaged')),
  estimated_value numeric(12,2) default 0,
  original_location text not null,
  current_location text not null,
  status text not null default 'On Display' check (status in (
    'On Display', 'In Storage', 'Under Maintenance', 'Damaged', 'Reserved'
  )),
  photos text[] default '{}',
  handling_notes text default '',
  conservation_notes text default '',
  last_inspected_date date,
  story text default '',
  added_by text not null default '',
  added_by_email text default '',
  last_updated_by text default '',
  last_updated_by_email text default '',
  added_date timestamptz default now(),
  last_updated_date timestamptz default now(),
  pending_sync boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- MOVEMENT HISTORY TABLE
-- ============================================
create table public.movement_logs (
  id uuid primary key default uuid_generate_v4(),
  artifact_id text references public.artifacts(id) on delete cascade,
  date timestamptz default now(),
  old_location text not null,
  new_location text not null,
  old_status text,
  new_status text,
  note text default '',
  staff_member text not null,
  staff_email text default '',
  created_at timestamptz default now()
);

-- ============================================
-- INSPECTION HISTORY TABLE
-- ============================================
create table public.inspection_logs (
  id uuid primary key default uuid_generate_v4(),
  artifact_id text references public.artifacts(id) on delete cascade,
  date timestamptz default now(),
  inspector text not null,
  inspector_email text default '',
  notes text default '',
  photo_url text default '',
  condition text not null check (condition in ('Mint', 'Good', 'Fair', 'Poor', 'Damaged')),
  created_at timestamptz default now()
);

-- ============================================
-- TEAM ACTIVITY TABLE
-- ============================================
create table public.team_activity (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.profiles(id) on delete set null,
  user_name text not null,
  user_email text not null,
  action text not null check (action in ('add', 'edit', 'move', 'delete', 'import')),
  artifact_name text not null,
  artifact_id text not null,
  details text default '',
  timestamp timestamptz default now()
);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Critical for corporate data protection
-- ============================================

alter table public.profiles enable row level security;
alter table public.artifacts enable row level security;
alter table public.movement_logs enable row level security;
alter table public.inspection_logs enable row level security;
alter table public.team_activity enable row level security;

-- Profiles: users can read all, only update their own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Artifacts: all authenticated users can read
create policy "Artifacts viewable by authenticated users"
  on public.artifacts for select
  using (auth.role() = 'authenticated');

-- Artifacts: only ADMIN and STAFF can insert/update
create policy "Staff and Admin can insert artifacts"
  on public.artifacts for insert
  with check (
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('ADMIN', 'STAFF', 'CHIEF HERITAGE CONSERVATOR',
                   'PRINCIPAL PALACE MUSEOLOGIST', 'HERITAGE REGISTRAR & ARCHIVIST')
    )
  );

create policy "Staff and Admin can update artifacts"
  on public.artifacts for update
  using (
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('ADMIN', 'STAFF', 'CHIEF HERITAGE CONSERVATOR',
                   'PRINCIPAL PALACE MUSEOLOGIST', 'HERITAGE REGISTRAR & ARCHIVIST')
    )
  );

-- Only ADMIN can delete
create policy "Only Admin can delete artifacts"
  on public.artifacts for delete
  using (
    auth.role() = 'authenticated' and
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('ADMIN', 'CHIEF HERITAGE CONSERVATOR')
    )
  );

-- Movement logs: read all, insert for staff+
create policy "Movement logs viewable by authenticated users"
  on public.movement_logs for select
  using (auth.role() = 'authenticated');

create policy "Staff can insert movement logs"
  on public.movement_logs for insert
  with check (auth.role() = 'authenticated');

-- Inspection logs
create policy "Inspection logs viewable by authenticated users"
  on public.inspection_logs for select
  using (auth.role() = 'authenticated');

create policy "Staff can insert inspection logs"
  on public.inspection_logs for insert
  with check (auth.role() = 'authenticated');

-- Team activity
create policy "Team activity viewable by authenticated users"
  on public.team_activity for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert activity"
  on public.team_activity for insert
  with check (auth.role() = 'authenticated');

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at on artifacts
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_artifacts_updated_at
  before update on public.artifacts
  for each row execute function update_updated_at_column();

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'STAFF'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- INDEXES for performance
-- ============================================
create index idx_artifacts_category on public.artifacts(category);
create index idx_artifacts_status on public.artifacts(status);
create index idx_artifacts_condition on public.artifacts(condition);
create index idx_artifacts_current_location on public.artifacts(current_location);
create index idx_movement_logs_artifact_id on public.movement_logs(artifact_id);
create index idx_inspection_logs_artifact_id on public.inspection_logs(artifact_id);
create index idx_team_activity_timestamp on public.team_activity(timestamp desc);


-- ============================================
-- CONSERVATION SCHEDULE TABLE (added later)
-- ============================================
CREATE TABLE IF NOT EXISTS public.conservation_schedule (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  artifact_id text REFERENCES public.artifacts(id) ON DELETE CASCADE,
  planned_date date,
  assigned_to text DEFAULT '',
  priority text DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
  notes text DEFAULT '',
  created_by text NOT NULL,
  created_by_email text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.conservation_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read conservation schedule"
ON public.conservation_schedule FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated insert conservation schedule"
ON public.conservation_schedule FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated update conservation schedule"
ON public.conservation_schedule FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated delete conservation schedule"
ON public.conservation_schedule FOR DELETE
USING (auth.role() = 'authenticated');

CREATE INDEX idx_conservation_schedule_artifact ON public.conservation_schedule(artifact_id);

-- ============================================================
-- Stay in Bloom — Supabase Setup
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Create the flowers table
create table public.flowers (
  id uuid default gen_random_uuid() primary key,
  image_url text not null,
  message text,
  approved boolean default false,
  created_at timestamptz default now()
);

-- 2. Enable Row Level Security
alter table public.flowers enable row level security;

-- 3. Anyone can read approved flowers (the garden view)
create policy "Anyone can view approved flowers"
  on public.flowers for select
  using (approved = true);

-- 4. Anyone can insert flowers (anonymous submissions)
create policy "Anyone can submit flowers"
  on public.flowers for insert
  with check (true);

-- 5. Only authenticated users can update (approve) flowers
create policy "Admins can update flowers"
  on public.flowers for update
  using (auth.role() = 'authenticated');

-- 6. Only authenticated users can delete flowers
create policy "Admins can delete flowers"
  on public.flowers for delete
  using (auth.role() = 'authenticated');

-- 7. Admins can read ALL flowers (including pending)
create policy "Admins can view all flowers"
  on public.flowers for select
  using (auth.role() = 'authenticated');

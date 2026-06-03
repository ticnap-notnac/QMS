-- Apply this in the Supabase SQL editor to allow authenticated users to view,
-- create, and manage audit schedules.

alter table public.audit_schedules enable row level security;

drop policy if exists "audit_schedules_select_authenticated" on public.audit_schedules;
drop policy if exists "audit_schedules_insert_authenticated" on public.audit_schedules;
drop policy if exists "audit_schedules_update_authenticated" on public.audit_schedules;
drop policy if exists "audit_schedules_delete_authenticated" on public.audit_schedules;

-- Allow all authenticated users to view audit schedules
create policy "audit_schedules_select_authenticated"
on public.audit_schedules
for select
to authenticated
using (true);

-- Allow all authenticated users to create audit schedules
create policy "audit_schedules_insert_authenticated"
on public.audit_schedules
for insert
to authenticated
with check (true);

-- Allow all authenticated users to update audit schedules
create policy "audit_schedules_update_authenticated"
on public.audit_schedules
for update
to authenticated
using (true)
with check (true);

-- Allow all authenticated users to delete audit schedules
create policy "audit_schedules_delete_authenticated"
on public.audit_schedules
for delete
to authenticated
using (true);

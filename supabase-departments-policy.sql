-- Apply this in the Supabase SQL editor to allow authenticated users to read departments
-- and allow admins to manage them.
-- This assumes public.is_current_user_admin() already exists in your database.

alter table public.departments enable row level security;

create policy "departments_select_authenticated"
on public.departments
for select
to authenticated
using (true);

create policy "departments_insert_admin"
on public.departments
for insert
to authenticated
with check (public.is_current_user_admin());

create policy "departments_update_admin"
on public.departments
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy "departments_delete_admin"
on public.departments
for delete
to authenticated
using (public.is_current_user_admin());
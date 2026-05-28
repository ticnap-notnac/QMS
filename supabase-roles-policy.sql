-- Apply this in the Supabase SQL editor to allow admins to manage roles.
-- This assumes public.is_current_user_admin() already exists in your database.

alter table public.roles enable row level security;

create policy "roles_select_authenticated"
on public.roles
for select
to authenticated
using (true);

create policy "roles_insert_admin"
on public.roles
for insert
to authenticated
with check (public.is_current_user_admin());

create policy "roles_update_admin"
on public.roles
for update
to authenticated
using (public.is_current_user_admin())
with check (public.is_current_user_admin());

create policy "roles_delete_admin"
on public.roles
for delete
to authenticated
using (public.is_current_user_admin());

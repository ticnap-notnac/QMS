-- Apply this in the Supabase SQL editor to allow authenticated users to read and write
-- audit runs and results.

alter table public.audit_runs enable row level security;
alter table public.audit_results enable row level security;

-- Drop existing if any
drop policy if exists "audit_runs_select" on public.audit_runs;
drop policy if exists "audit_runs_insert" on public.audit_runs;
drop policy if exists "audit_runs_update" on public.audit_runs;
drop policy if exists "audit_runs_delete" on public.audit_runs;

drop policy if exists "audit_results_select" on public.audit_results;
drop policy if exists "audit_results_insert" on public.audit_results;
drop policy if exists "audit_results_update" on public.audit_results;
drop policy if exists "audit_results_delete" on public.audit_results;

-- Policies for audit_runs
create policy "audit_runs_select" on public.audit_runs for select to authenticated using (true);
create policy "audit_runs_insert" on public.audit_runs for insert to authenticated with check (true);
create policy "audit_runs_update" on public.audit_runs for update to authenticated using (true) with check (true);
create policy "audit_runs_delete" on public.audit_runs for delete to authenticated using (true);

-- Policies for audit_results
create policy "audit_results_select" on public.audit_results for select to authenticated using (true);
create policy "audit_results_insert" on public.audit_results for insert to authenticated with check (true);
create policy "audit_results_update" on public.audit_results for update to authenticated using (true) with check (true);
create policy "audit_results_delete" on public.audit_results for delete to authenticated using (true);

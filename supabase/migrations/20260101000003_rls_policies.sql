-- Row Level Security: every table, explicit policy per operation.
-- (select auth.uid()) is wrapped in a subselect so Postgres evaluates it once per query.

alter table public.profiles     enable row level security;
alter table public.categories   enable row level security;
alter table public.transactions enable row level security;
alter table public.budgets      enable row level security;

-- Anonymous users have no access at all; authenticated users need table grants
-- (RLS then restricts rows).
-- Supabase default privileges grant ALL (incl. TRUNCATE, REFERENCES, TRIGGER) to
-- anon/authenticated on new tables; TRUNCATE ignores RLS, so revoke everything first
-- and then grant only the DML that RLS governs.
revoke all on public.profiles, public.categories, public.transactions, public.budgets from public;
revoke all on public.profiles, public.categories, public.transactions, public.budgets from anon;
revoke all on public.profiles, public.categories, public.transactions, public.budgets from authenticated;
grant select, insert, update, delete on
  public.profiles, public.categories, public.transactions, public.budgets to authenticated;

-- profiles (key column: id) ---------------------------------------------------
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_delete_own on public.profiles for delete to authenticated
  using (id = (select auth.uid()));

-- categories ------------------------------------------------------------------
create policy categories_select_own on public.categories for select to authenticated
  using (user_id = (select auth.uid()));
create policy categories_insert_own on public.categories for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy categories_update_own on public.categories for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy categories_delete_own on public.categories for delete to authenticated
  using (user_id = (select auth.uid()));

-- transactions (category ownership/type enforced by composite FK) -------------
create policy transactions_select_own on public.transactions for select to authenticated
  using (user_id = (select auth.uid()));
create policy transactions_insert_own on public.transactions for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy transactions_update_own on public.transactions for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy transactions_delete_own on public.transactions for delete to authenticated
  using (user_id = (select auth.uid()));

-- budgets (category ownership by composite FK, EXPENSE-only by trigger) -------
create policy budgets_select_own on public.budgets for select to authenticated
  using (user_id = (select auth.uid()));
create policy budgets_insert_own on public.budgets for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy budgets_update_own on public.budgets for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy budgets_delete_own on public.budgets for delete to authenticated
  using (user_id = (select auth.uid()));

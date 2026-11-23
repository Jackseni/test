-- ===== 20260101000001_create_tables.sql =====
-- FinTrack: core schema. Money is NUMERIC(14,2). All tables are user-owned.

-- profiles ------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- categories ----------------------------------------------------------------
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 50),
  type        text not null check (type in ('INCOME', 'EXPENSE')),
  color       text not null default '#10b981' check (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at  timestamptz not null default now(),
  -- Targets for composite foreign keys (ownership / type consistency).
  constraint categories_id_user_key unique (id, user_id),
  constraint categories_id_user_type_key unique (id, user_id, type)
);

-- Case/whitespace-insensitive uniqueness of names per user and type.
create unique index categories_user_name_type_key
  on public.categories (user_id, lower(btrim(name)), type);

-- transactions --------------------------------------------------------------
create table public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  category_id      uuid not null,
  type             text not null check (type in ('INCOME', 'EXPENSE')),
  amount           numeric(14, 2) not null check (amount > 0),
  description      text not null default '' check (char_length(description) <= 255),
  transaction_date date not null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- The category must belong to the SAME user AND have the SAME type as the
  -- transaction. FK checks bypass RLS, so this is enforced at the DB level.
  -- NO ACTION (not CASCADE): a category in use cannot be deleted; the app must
  -- reassign/delete its transactions first. (User deletion still cascades.)
  constraint transactions_category_fk foreign key (category_id, user_id, type)
    references public.categories (id, user_id, type)
);

create index transactions_user_date_idx on public.transactions (user_id, transaction_date desc);
create index transactions_category_idx  on public.transactions (category_id);

-- budgets -------------------------------------------------------------------
create table public.budgets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  category_id uuid not null,
  amount      numeric(14, 2) not null check (amount > 0),
  month       smallint not null check (month between 1 and 12),
  year        smallint not null check (year between 2000 and 2100),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint budgets_user_category_period_key unique (user_id, category_id, month, year),
  -- Category must belong to the same user. (EXPENSE-only is enforced by trigger.)
  constraint budgets_category_fk foreign key (category_id, user_id)
    references public.categories (id, user_id) on delete cascade
);

create index budgets_user_period_idx on public.budgets (user_id, year, month);
create index budgets_category_idx    on public.budgets (category_id);


-- ===== 20260101000002_functions_triggers.sql =====
-- Integrity triggers and new-user bootstrap. All functions pin search_path.

-- updated_at ----------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at     before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();
create trigger budgets_set_updated_at      before update on public.budgets
  for each row execute function public.set_updated_at();

-- Ownership is immutable -----------------------------------------------------
create function public.prevent_user_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be changed';
  end if;
  return new;
end;
$$;

create trigger categories_prevent_user_change   before update on public.categories
  for each row execute function public.prevent_user_id_change();
create trigger transactions_prevent_user_change before update on public.transactions
  for each row execute function public.prevent_user_id_change();
create trigger budgets_prevent_user_change      before update on public.budgets
  for each row execute function public.prevent_user_id_change();

-- Budgets only make sense for EXPENSE categories ------------------------------
create function public.enforce_budget_expense_category()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.categories c
    where c.id = new.category_id and c.user_id = new.user_id and c.type = 'EXPENSE'
  ) then
    raise exception 'budget category must be an EXPENSE category';
  end if;
  return new;
end;
$$;

create trigger budgets_expense_only before insert or update on public.budgets
  for each row execute function public.enforce_budget_expense_category();

-- A category's type cannot change while transactions/budgets reference it -----
-- (transactions are also protected by the composite FK; budgets need this.)
create function public.prevent_category_type_change_when_used()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.type is distinct from old.type and (
    exists (select 1 from public.transactions t where t.category_id = old.id)
    or exists (select 1 from public.budgets b where b.category_id = old.id)
  ) then
    raise exception 'category type cannot change while in use';
  end if;
  return new;
end;
$$;

create trigger categories_type_stable before update on public.categories
  for each row execute function public.prevent_category_type_change_when_used();

-- New user bootstrap: profile + default Spanish categories --------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 100))
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, type, color)
  values
    (new.id, 'Salario',        'INCOME',  '#10b981'),
    (new.id, 'Freelance',      'INCOME',  '#14b8a6'),
    (new.id, 'Inversiones',    'INCOME',  '#0ea5e9'),
    (new.id, 'Otros ingresos', 'INCOME',  '#64748b'),
    (new.id, 'Alimentación',   'EXPENSE', '#f59e0b'),
    (new.id, 'Transporte',     'EXPENSE', '#3b82f6'),
    (new.id, 'Vivienda',       'EXPENSE', '#8b5cf6'),
    (new.id, 'Servicios',      'EXPENSE', '#06b6d4'),
    (new.id, 'Salud',          'EXPENSE', '#ef4444'),
    (new.id, 'Educación',      'EXPENSE', '#6366f1'),
    (new.id, 'Ocio',           'EXPENSE', '#ec4899'),
    (new.id, 'Otros gastos',   'EXPENSE', '#94a3b8')
  -- Bare target: uniqueness is the expression index categories_user_name_type_key
  -- (user_id, lower(btrim(name)), type); a column list would not match it.
  on conflict do nothing;

  return new;
end;
$$;

-- Trigger functions must never be callable through the API.
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ===== 20260101000003_rls_policies.sql =====
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

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

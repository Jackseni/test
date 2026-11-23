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

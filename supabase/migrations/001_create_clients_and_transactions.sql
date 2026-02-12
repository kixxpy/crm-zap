-- ЭТАП 3 — Создание таблиц для Parts CRM
-- Выполни этот SQL в Supabase: Dashboard → SQL Editor → New Query

create table clients (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  phone text,
  vin text,
  bonus_balance numeric default 0,
  total_purchases_sum numeric default 0,
  total_orders_count integer default 0,
  created_at timestamp default now()
);

create table transactions (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references clients(id) on delete cascade,
  purchase_amount numeric not null,
  bonus_used numeric default 0,
  bonus_earned numeric default 0,
  final_paid numeric not null,
  created_at timestamp default now()
);

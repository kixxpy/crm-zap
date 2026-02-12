-- Добавление полей для возвратов в таблицу transactions
-- Выполни этот SQL в Supabase: Dashboard → SQL Editor → New Query

alter table transactions
  add column if not exists is_refund boolean not null default false,
  add column if not exists refund_for uuid references transactions(id);


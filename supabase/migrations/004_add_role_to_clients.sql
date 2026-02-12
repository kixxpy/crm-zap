-- Добавление роли клиента/мастера в таблицу clients
-- Выполни этот SQL в Supabase: Dashboard → SQL Editor → New Query
-- или через psql/cli в той же БД, где уже созданы таблицы.

alter table clients
  add column if not exists role text not null default 'client';


-- Уникальность телефона в таблице clients
-- Выполни этот SQL в Supabase: Dashboard → SQL Editor → New Query
-- или через psql/cli в той же БД, где уже созданы таблицы.

-- Делаем телефон уникальным, при этом допускаем несколько NULL
create unique index if not exists clients_phone_unique
  on clients (phone)
  where phone is not null;


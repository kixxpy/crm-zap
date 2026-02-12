-- Включить RLS для таблиц
alter table clients enable row level security;
alter table transactions enable row level security;

-- Удалить старые политики, если есть (для повторного запуска)
drop policy if exists "Allow all for clients" on clients;
drop policy if exists "Allow all for transactions" on transactions;

-- Политики для clients: полный доступ по anon key (для разработки)
-- В продакшене замени на политики с проверкой auth.uid()
create policy "Allow all for clients"
  on clients for all
  using (true)
  with check (true);

-- Политики для transactions: полный доступ по anon key
create policy "Allow all for transactions"
  on transactions for all
  using (true)
  with check (true);

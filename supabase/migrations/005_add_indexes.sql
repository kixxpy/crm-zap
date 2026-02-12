-- Индексы для ускорения выборок клиентов и транзакций в Parts CRM
-- Выполни этот SQL в Supabase: Dashboard → SQL Editor → New Query
-- или через psql/cli в той же БД.

-- Ускоряет сортировку и выборку клиентов по дате создания
create index if not exists idx_clients_created_at
  on clients (created_at);

-- Ускоряет выборки транзакций по клиенту и дате (бонусы, продажи по дням)
create index if not exists idx_transactions_client_id_created_at
  on transactions (client_id, created_at);

-- Ускоряет сортировку и агрегации транзакций по дате
create index if not exists idx_transactions_created_at
  on transactions (created_at);


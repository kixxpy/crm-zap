-- Запусти этот скрипт в Supabase: SQL Editor → New query → вставь и Run.
-- Таблица client_vins (можно запускать повторно).

-- 1. Таблица (если ещё нет)
create table if not exists client_vins (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid not null references clients(id) on delete cascade,
  vin text not null,
  machine_label text,
  created_at timestamp default now(),
  constraint client_vins_vin_not_empty check (trim(vin) != ''),
  constraint client_vins_vin_length check (char_length(trim(vin)) = 17),
  constraint client_vins_vin_format check (trim(vin) ~ '^[A-Za-z0-9]{17}$')
);

-- 2. Индексы (если ещё нет)
create index if not exists idx_client_vins_client_id on client_vins(client_id);
create unique index if not exists idx_client_vins_client_vin on client_vins(client_id, upper(trim(vin)));

-- 3. Перенос vin из clients в client_vins (только если в clients ещё есть колонка vin)
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'clients' and column_name = 'vin'
  ) then
    insert into client_vins (client_id, vin, machine_label)
    select c.id, upper(trim(c.vin)), null
    from clients c
    where c.vin is not null
      and trim(c.vin) != ''
      and char_length(trim(c.vin)) = 17
      and trim(c.vin) ~ '^[A-Za-z0-9]{17}$'
      and not exists (
        select 1 from client_vins cv
        where cv.client_id = c.id and upper(trim(cv.vin)) = upper(trim(c.vin))
      );
  end if;
end $$;

-- 4. Удаление колонки vin из clients (если есть)
alter table clients drop column if exists vin;

-- 5. RLS и политика
alter table client_vins enable row level security;
drop policy if exists "Allow all for client_vins" on client_vins;
create policy "Allow all for client_vins"
  on client_vins for all
  using (true)
  with check (true);

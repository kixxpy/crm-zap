-- Таблица винкодов клиента (несколько на одного клиента, описание машины необязательно)
create table client_vins (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid not null references clients(id) on delete cascade,
  vin text not null,
  machine_label text,
  created_at timestamp default now(),
  constraint client_vins_vin_not_empty check (trim(vin) != ''),
  constraint client_vins_vin_length check (char_length(trim(vin)) = 17),
  constraint client_vins_vin_format check (trim(vin) ~ '^[A-Za-z0-9]{17}$')
);

create index idx_client_vins_client_id on client_vins(client_id);
create unique index idx_client_vins_client_vin on client_vins(client_id, upper(trim(vin)));

-- Перенос существующих vin из clients в client_vins (только валидные 17 символов)
insert into client_vins (client_id, vin, machine_label)
select id, upper(trim(vin)), null
from clients
where vin is not null
  and trim(vin) != ''
  and char_length(trim(vin)) = 17
  and trim(vin) ~ '^[A-Za-z0-9]{17}$';

-- Удаление колонки vin из clients
alter table clients drop column vin;

-- RLS для client_vins (как у clients)
alter table client_vins enable row level security;
create policy "Allow all for client_vins"
  on client_vins for all
  using (true)
  with check (true);

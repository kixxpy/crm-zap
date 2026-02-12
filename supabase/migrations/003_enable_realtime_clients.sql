-- Включить Realtime для таблицы clients
-- В Dashboard: Database → Publications → supabase_realtime → включить clients
-- Или выполнить: alter publication supabase_realtime add table clients;
alter publication supabase_realtime add table clients;

/**
 * Применяет миграцию RLS к Supabase.
 * Требует: SUPABASE_DB_URL (Connection string из Dashboard → Settings → Database)
 * Запуск: SUPABASE_DB_URL="postgresql://..." node scripts/run-rls-migration.js
 */
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const MIGRATION_PATH = path.join(
  __dirname,
  "../supabase/migrations/002_enable_rls_clients.sql"
);

async function run() {
  const url = process.env.SUPABASE_DB_URL;
  if (!url) {
    console.error(
      "Ошибка: установите SUPABASE_DB_URL (Connection string из Supabase Dashboard → Settings → Database)"
    );
    process.exit(1);
  }

  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  const client = new Client({ connectionString: url });

  try {
    await client.connect();
    await client.query(sql);
    console.log("✓ Миграция RLS применена успешно.");
  } catch (err) {
    console.error("Ошибка:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();

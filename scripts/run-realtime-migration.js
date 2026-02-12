/**
 * Включает Realtime для таблицы clients.
 * Требует: SUPABASE_DB_URL в .env (Connection string из Dashboard → Settings → Database)
 * Запуск: npm run db:realtime
 */
require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const MIGRATION_PATH = path.join(
  __dirname,
  "../supabase/migrations/003_enable_realtime_clients.sql"
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
    console.log("✓ Realtime для clients включён успешно.");
  } catch (err) {
    if (err.message?.includes("already exists") || err.code === "42710") {
      console.log("✓ Таблица clients уже в publication supabase_realtime.");
    } else {
      console.error("Ошибка:", err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

run();

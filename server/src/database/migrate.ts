import fs from 'fs/promises'
import path from 'path'
import { pool } from './pool'

async function ensureMigrationsTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `)
}

async function hasMigrationRun(filename: string) {
  const result = await pool.query('SELECT 1 FROM schema_migrations WHERE filename = $1', [filename])
  return (result.rowCount ?? 0) > 0
}

async function runMigration(filename: string, sql: string) {
  await pool.query('BEGIN')

  try {
    await pool.query(sql)
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename])
    await pool.query('COMMIT')
    console.log(`Migrated ${filename}`)
  } catch (error) {
    await pool.query('ROLLBACK')
    throw error
  }
}

async function migrate() {
  await ensureMigrationsTable()

  const migrationsDir = path.resolve(__dirname, 'migrations')
  const includeDemoSeeds = process.env.SEED_DEMO_DATA === 'true'
  const files = (await fs.readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .filter((file) => includeDemoSeeds || !file.includes('_seed_'))
    .sort((a, b) => a.localeCompare(b))

  for (const file of files) {
    if (await hasMigrationRun(file)) {
      continue
    }

    const sql = await fs.readFile(path.join(migrationsDir, file), 'utf8')
    await runMigration(file, sql)
  }

  await pool.end()
}

migrate().catch(async (error) => {
  console.error(error)
  await pool.end()
  process.exit(1)
})

import * as adminAuthService from '../services/adminAuthService'
import { pool } from '../database/pool'

async function run() {
  const name = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || ''
  const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim().toLowerCase() || ''
  const password = process.env.ADMIN_BOOTSTRAP_PASSWORD || ''

  if (!name || !email || !password) {
    throw new Error(
      'Set ADMIN_BOOTSTRAP_NAME, ADMIN_BOOTSTRAP_EMAIL, and ADMIN_BOOTSTRAP_PASSWORD before running this command.',
    )
  }

  const result = await adminAuthService.registerFirstAdmin({ name, email, password })
  console.log(`Admin account created for ${result.user.email}.`)
}

void run()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Could not create the admin account.')
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })

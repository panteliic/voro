import { pool } from './pool'
import { encryptMessage, messageEncryptionKey } from '../utils/messageCrypto'

export async function encryptExistingMessages() {
  messageEncryptionKey()
  const client = await pool.connect()
  try {
    for (;;) {
      await client.query('BEGIN')
      const result = await client.query<{ id: string; order_id: string; sender_user_id: string; body: string }>(
        'SELECT id, order_id, sender_user_id, body FROM order_message WHERE body_encrypted = FALSE ORDER BY id LIMIT 200 FOR UPDATE',
      )
      for (const row of result.rows) {
        await client.query('UPDATE order_message SET body = $1, body_encrypted = TRUE WHERE id = $2',
          [encryptMessage(row.body, row.order_id, row.sender_user_id), row.id])
      }
      await client.query('COMMIT')
      if (result.rows.length === 0) break
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error('DATABASE_URL is not set. Set it in your environment before starting the app.')
}

// Disable SSL for local development (localhost or sslmode=disable in URL)
const isLocal = connectionString.includes('localhost') || connectionString.includes('sslmode=disable')

export const client = postgres(connectionString, {
  prepare: false,
  ssl: isLocal ? false : 'require',
  max: isLocal ? 5 : 20,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
})

export const db = drizzle(client, { schema })

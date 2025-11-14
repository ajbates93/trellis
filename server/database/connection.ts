import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

// Disable SSL for local development (localhost or sslmode=disable in URL)
const isLocal = connectionString.includes('localhost') || connectionString.includes('sslmode=disable')

export const client = postgres(connectionString, {
  prepare: false,
  ssl: isLocal ? false : 'require',
})

export const db = drizzle(client, { schema })

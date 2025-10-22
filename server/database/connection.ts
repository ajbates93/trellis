import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL!

export const client = postgres(connectionString, {
  prepare: false,
  ssl: 'require',
})

export const db = drizzle(client, { schema })

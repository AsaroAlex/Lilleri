import { openDatabase } from './index.js'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl)
  throw new Error('Set DATABASE_URL for the standalone PostgreSQL migration command')
const handle = await openDatabase({ driver: 'postgres', url: databaseUrl })
await handle.close()
console.log('Database migrations applied')

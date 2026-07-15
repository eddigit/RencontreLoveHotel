import { config } from 'dotenv';
config();

import { Pool } from 'pg'
import { log } from '@/utils/logger'

let pool: Pool | null = null

type SqlProxy = {
  (strings: TemplateStringsArray, ...values: any[]): Promise<any[]>
  query<T = any>(query: string, params?: any[]): Promise<T>
}

function initPool() {
  if (pool) return pool
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!databaseUrl) {
    throw new Error(
      'DATABASE_URL non défini. Pour exécuter des opérations serveur, créez un fichier .env.local avec DATABASE_URL ou configurez la variable d\'environnement.'
    )
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl:
      process.env.DATABASE_SSL === 'true'
        ? {
            rejectUnauthorized:
              process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false'
          }
        : false
  })

  return pool
}

function buildParameterizedQuery(
  strings: TemplateStringsArray,
  values: any[]
) {
  let text = strings[0]

  for (let index = 0; index < values.length; index += 1) {
    text += `$${index + 1}${strings[index + 1]}`
  }

  return { text, values }
}

function createSqlProxy(): SqlProxy {
  const sqlFunction = async (
    strings: TemplateStringsArray,
    ...values: any[]
  ) => {
    const query = buildParameterizedQuery(strings, values)
    return executeQuery(query.text, query.values)
  }

  const proxy = sqlFunction as SqlProxy
  proxy.query = async <T = any>(query: string, params: any[] = []) => {
    return executeQuery<T>(query, params)
  }

  return proxy
}

export const sql = createSqlProxy()

export async function executeQuery<T = any>(query: string, params: any[] = []): Promise<T> {
  try {
    const db = initPool()
    const result = await db.query(query, params)
    return result.rows as T
  } catch (error) {
    log('error', 'Database query failed', {
      operation: 'executeQuery',
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorCode:
        typeof error === 'object' && error && 'code' in error
          ? String(error.code)
          : undefined
    })
    throw error
  }
}

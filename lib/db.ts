import { config } from 'dotenv';
config();

import { neon } from "@neondatabase/serverless"
// Créer une instance de connexion à la base de données de façon sûre
// On évite d'appeler `neon()` au chargement du module si la variable
// d'environnement n'est pas définie, ce qui empêche Next.js de planter
// pendant le build/collect phase. Si l'app tente d'exécuter une requête
// sans configuration, une erreur descriptive sera levée à l'exécution.
let _sql: any = null

function initSql() {
  if (_sql) return _sql
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    // Fournir un stub qui provoque une erreur uniquement lorsque quelqu'un
    // tente d'exécuter une requête. Cela permet au build Next de se terminer
    // sans que `neon()` soit appelé.
    _sql = {
      query: async () => {
        throw new Error(
          'DATABASE_URL non défini. Pour exécuter des opérations serveur, créez un fichier .env.local avec DATABASE_URL ou configurez la variable d\'environnement.'
        )
      }
    }
    return _sql
  }

  _sql = neon(databaseUrl)
  return _sql
}

// Exposer `sql` qui initialise la connexion à la demande
export const sql = {
  query: async (...args: any[]) => {
    const s = initSql()
    return s.query(...args)
  }
}

// Fonction générique pour exécuter des requêtes SQL
export async function executeQuery<T = any>(query: string, params: any[] = []): Promise<T> {
  try {
    const s = initSql()
    const rows = await s.query(query, params)
    return rows as T
  } catch (error) {
    console.error("Erreur lors de l'exécution de la requête SQL:", error)
    throw error
  }
}

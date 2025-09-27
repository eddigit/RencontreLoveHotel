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
    const errorFunction = async () => {
      throw new Error(
        'DATABASE_URL non défini. Pour exécuter des opérations serveur, créez un fichier .env.local avec DATABASE_URL ou configurez la variable d\'environnement.'
      )
    }
    
    // Support des template literals et .query()
    _sql = Object.assign(errorFunction, {
      query: errorFunction
    })
    return _sql
  }

  _sql = neon(databaseUrl)
  return _sql
}

// Exposer `sql` qui initialise la connexion à la demande
// Support des template literals ET de sql.query()
function createSqlProxy() {
  // Fonction principale pour template literals: sql`SELECT...`
  const sqlFunction = (...args: any[]) => {
    const s = initSql()
    return s(...args)
  }
  
  // Méthode query pour: sql.query(query, params)
  sqlFunction.query = async (...args: any[]) => {
    const s = initSql()
    if (typeof s.query === 'function') {
      return s.query(...args)
    }
    // Fallback si neon ne supporte que template literals
    return s(...args)
  }
  
  return sqlFunction
}

export const sql = createSqlProxy()

// Fonction générique pour exécuter des requêtes SQL
export async function executeQuery<T = any>(query: string, params: any[] = []): Promise<T> {
  try {
    const s = initSql()
    // Utiliser sql.query() pour les requêtes avec paramètres
    const rows = await s.query(query, params)
    return rows as T
  } catch (error) {
    console.error("Erreur lors de l'exécution de la requête SQL:", error)
    throw error
  }
}

import pg from 'pg';
import { readFileSync } from 'fs';

const { Client } = pg;

// Connection directe Supabase
const client = new Client({
  host: 'db.nfelepjqazglpqjpvctg.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || '',
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log('Connecté à Supabase PostgreSQL');

  const sql = readFileSync('./supabase/subscription-migration.sql', 'utf8');
  await client.query(sql);
  console.log('Migration exécutée avec succès !');
} catch (err) {
  console.error('Erreur migration:', err.message);
  process.exit(1);
} finally {
  await client.end();
}

import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  const client = new Client({
    connectionString: 'postgresql://postgres.nfelepjqazglpqjpvctg:azerty123A198900@aws-0-eu-west-3.pooler.supabase.com:6543/postgres',
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log('✅ Connecté à Supabase PostgreSQL');

  const sql = fs.readFileSync(path.join(__dirname, '../supabase/schema.sql'), 'utf-8');
  console.log('📄 Schema SQL chargé (' + sql.length + ' caractères)');

  try {
    await client.query(sql);
    console.log('✅ Schema exécuté avec succès !');
    
    const res = await client.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log('\n📋 Tables créées :');
    res.rows.forEach((r: any) => console.log('  ✅ ' + r.tablename));
    
    const rls = await client.query(`
      SELECT schemaname, tablename, policyname 
      FROM pg_policies 
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname
    `);
    console.log('\n🔒 RLS Policies : ' + rls.rows.length + ' politiques actives');
    
    const triggers = await client.query(`
      SELECT trigger_name, event_object_table
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table
    `);
    console.log('⚡ Triggers : ' + triggers.rows.length + ' triggers actifs');
    
    console.log('\n🎉 Base de données prête !');
  } catch (err: any) {
    console.error('❌ Erreur SQL :', err.message);
  }

  await client.end();
}

main();

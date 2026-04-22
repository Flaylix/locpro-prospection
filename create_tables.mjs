import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Variables VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes');
  process.exit(1);
}

// Extraire le project ref depuis l'URL
const ref = url.replace('https://', '').replace('.supabase.co', '');
console.log('Projet Supabase :', ref);

const sqlStatements = [
  `CREATE TABLE IF NOT EXISTS agences (
    id          TEXT PRIMARY KEY,
    nom         TEXT NOT NULL,
    email       TEXT DEFAULT '',
    tel         TEXT DEFAULT '',
    ville       TEXT DEFAULT '',
    region      TEXT DEFAULT '',
    categorie   TEXT DEFAULT 'Voiture',
    status      TEXT DEFAULT 'à contacter',
    notes       TEXT DEFAULT '',
    created_at  TIMESTAMPTZ DEFAULT NOW()
  )`,
  `CREATE TABLE IF NOT EXISTS prospects (
    siren         TEXT PRIMARY KEY,
    nom           TEXT NOT NULL,
    email         TEXT DEFAULT '',
    telephone     TEXT DEFAULT '',
    ville         TEXT DEFAULT '',
    code_postal   TEXT DEFAULT '',
    departement   TEXT DEFAULT '',
    adresse       TEXT DEFAULT '',
    site_web      TEXT DEFAULT '',
    dirigeant     TEXT DEFAULT '',
    categorie     TEXT DEFAULT 'Location véhicules',
    code_naf      TEXT DEFAULT '',
    effectif      TEXT DEFAULT '',
    date_creation TEXT DEFAULT '',
    status        TEXT DEFAULT 'nouveau',
    notes         TEXT DEFAULT '',
    email_sent    BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    imported_at   TIMESTAMPTZ DEFAULT NOW()
  )`,
  `ALTER TABLE agences ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE prospects ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agences' AND policyname='agences_select') THEN
      CREATE POLICY "agences_select" ON agences FOR SELECT USING (true);
      CREATE POLICY "agences_insert" ON agences FOR INSERT WITH CHECK (true);
      CREATE POLICY "agences_update" ON agences FOR UPDATE USING (true);
      CREATE POLICY "agences_delete" ON agences FOR DELETE USING (true);
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='prospects' AND policyname='prospects_select') THEN
      CREATE POLICY "prospects_select" ON prospects FOR SELECT USING (true);
      CREATE POLICY "prospects_insert" ON prospects FOR INSERT WITH CHECK (true);
      CREATE POLICY "prospects_update" ON prospects FOR UPDATE USING (true);
      CREATE POLICY "prospects_delete" ON prospects FOR DELETE USING (true);
    END IF;
  END $$`
];

// Utiliser l'API Management Supabase (v1)
async function runSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

// Test avec la clé anon
console.log('\nTest de connexion via Management API...');
const test = await runSql('SELECT 1');
console.log('Status:', test.status, '| Body:', test.body.substring(0, 200));

if (test.status === 401 || test.status === 403) {
  console.log('\n⚠️  La clé anon ne peut pas créer des tables (accès DDL refusé).');
  console.log('Solution : fournir la clé service_role dans VITE_SUPABASE_SERVICE_KEY');
  console.log('Ou exécuter supabase_schema.sql manuellement dans le SQL Editor Supabase.');
} else if (test.status === 200) {
  console.log('\n✓ Connexion OK, création des tables...');
  for (const sql of sqlStatements) {
    const result = await runSql(sql);
    const preview = sql.substring(0, 50).replace(/\n/g, ' ').trim();
    if (result.status === 200) {
      console.log(`✓ ${preview}...`);
    } else {
      console.log(`✗ ${preview}... → ${result.body.substring(0, 100)}`);
    }
  }
}

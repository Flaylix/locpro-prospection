import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('Variables manquantes');
  process.exit(1);
}

// Extraire le project ref (gérer les URLs avec ou sans path)
const cleanUrl = url.split('/rest/')[0].split('/auth/')[0];
const ref = cleanUrl.replace('https://', '').replace('.supabase.co', '');
console.log('Projet Supabase :', ref);
console.log('URL de base :', cleanUrl);

const supabase = createClient(cleanUrl, serviceKey);

const steps = [
  {
    name: 'Table agences',
    sql: `CREATE TABLE IF NOT EXISTS agences (
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
    )`
  },
  {
    name: 'Table prospects',
    sql: `CREATE TABLE IF NOT EXISTS prospects (
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
    )`
  },
  {
    name: 'RLS agences',
    sql: `ALTER TABLE agences ENABLE ROW LEVEL SECURITY`
  },
  {
    name: 'RLS prospects',
    sql: `ALTER TABLE prospects ENABLE ROW LEVEL SECURITY`
  },
  {
    name: 'Policies agences',
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='agences' AND policyname='agences_select') THEN
        CREATE POLICY "agences_select" ON agences FOR SELECT USING (true);
        CREATE POLICY "agences_insert" ON agences FOR INSERT WITH CHECK (true);
        CREATE POLICY "agences_update" ON agences FOR UPDATE USING (true);
        CREATE POLICY "agences_delete" ON agences FOR DELETE USING (true);
      END IF;
    END $$`
  },
  {
    name: 'Policies prospects',
    sql: `DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='prospects' AND policyname='prospects_select') THEN
        CREATE POLICY "prospects_select" ON prospects FOR SELECT USING (true);
        CREATE POLICY "prospects_insert" ON prospects FOR INSERT WITH CHECK (true);
        CREATE POLICY "prospects_update" ON prospects FOR UPDATE USING (true);
        CREATE POLICY "prospects_delete" ON prospects FOR DELETE USING (true);
      END IF;
    END $$`
  }
];

// Utiliser Management API avec la service key
async function runSql(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

// Test de connexion
const test = await runSql('SELECT 1 as ok');
console.log('Test connexion → status:', test.status, '| réponse:', test.body.substring(0, 100));

if (test.status !== 200) {
  console.log('\nManagement API inaccessible, tentative via supabase.rpc...');

  // Fallback: utiliser supabase-js avec sql tagged template
  for (const step of steps) {
    try {
      const { error } = await supabase.from('_').select().throwOnError().then(() => ({error: null})).catch(e => ({error: e}));
      // Try direct sql
      const res = await supabase.rpc('exec_sql', { sql: step.sql });
      console.log(step.name + ':', res.error ? '✗ ' + res.error.message : '✓');
    } catch(e) {
      console.log(step.name + ': ✗', e.message);
    }
  }
} else {
  console.log('\nCréation des tables en cours...\n');
  for (const step of steps) {
    const result = await runSql(step.sql);
    if (result.status === 200) {
      console.log('✓', step.name);
    } else {
      const err = JSON.parse(result.body || '{}');
      const msg = err.message || result.body;
      if (msg.includes('already exists')) {
        console.log('✓', step.name, '(existait déjà)');
      } else {
        console.log('✗', step.name, '→', msg.substring(0, 100));
      }
    }
  }
  console.log('\nVérification finale...');
  const check = await runSql("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
  console.log('Tables présentes:', check.body);
}

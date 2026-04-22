import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

const cleanUrl = url.split('/rest/')[0];
console.log('URL:', cleanUrl);

const supabase = createClient(cleanUrl, serviceKey, {
  db: { schema: 'public' },
  auth: { persistSession: false }
});

// Tester si on peut lire le schema
const { data: tables, error: e1 } = await supabase
  .from('information_schema.tables')
  .select('table_name')
  .eq('table_schema', 'public');

console.log('Tables existantes:', tables, 'Erreur:', e1?.message);

// Tenter supabase.sql (disponible en v2 récent)
try {
  const result = await supabase.sql`SELECT current_user`;
  console.log('supabase.sql fonctionne:', result);
} catch(e) {
  console.log('supabase.sql non disponible:', e.message);
}

// Tenter via REST avec service_role directement
const testRes = await fetch(`${cleanUrl}/rest/v1/agences?select=id&limit=1`, {
  headers: {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`
  }
});
console.log('REST /agences status:', testRes.status, await testRes.text().then(t => t.substring(0, 100)));

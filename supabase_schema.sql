-- ============================================================
-- LocPro CRM — Schéma Supabase
-- Coller dans : Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- ── Table : agences (Base Agences) ──────────────────────────
CREATE TABLE IF NOT EXISTS agences (
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
);

-- ── Table : prospects (Prospection Pappers) ─────────────────
CREATE TABLE IF NOT EXISTS prospects (
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
);

-- ── Activer Row Level Security (RLS) ────────────────────────
ALTER TABLE agences   ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;

-- ── Policies : accès public (clé anon) ──────────────────────
-- Agences
CREATE POLICY "agences_select" ON agences FOR SELECT USING (true);
CREATE POLICY "agences_insert" ON agences FOR INSERT WITH CHECK (true);
CREATE POLICY "agences_update" ON agences FOR UPDATE USING (true);
CREATE POLICY "agences_delete" ON agences FOR DELETE USING (true);

-- Prospects
CREATE POLICY "prospects_select" ON prospects FOR SELECT USING (true);
CREATE POLICY "prospects_insert" ON prospects FOR INSERT WITH CHECK (true);
CREATE POLICY "prospects_update" ON prospects FOR UPDATE USING (true);
CREATE POLICY "prospects_delete" ON prospects FOR DELETE USING (true);

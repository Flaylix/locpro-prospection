import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL || '').split('/rest/')[0]
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(url, key, {
  auth: { persistSession: false },
})

export const HAS_SUPABASE = !!(url && key)

export function toDbProspect(p) {
  return {
    siren: p.siren,
    nom: p.nom || '',
    email: p.email || '',
    telephone: p.telephone || '',
    ville: p.ville || '',
    code_postal: p.codePostal || '',
    departement: p.departement || '',
    adresse: p.adresse || '',
    site_web: p.siteWeb || '',
    dirigeant: p.dirigeant || '',
    categorie: p.categorie || 'Location véhicules',
    code_naf: p.codeNaf || '',
    effectif: p.effectif || '',
    date_creation: p.dateCreation || '',
    status: p.status || 'nouveau',
    notes: p.notes || '',
    email_sent: !!p.emailSent,
    email_sent_at: p.emailSentAt || null,
    imported_at: p.importedAt || new Date().toISOString(),
  }
}

const FIELD_MAP = {
  siren: 'siren',
  nom: 'nom',
  email: 'email',
  telephone: 'telephone',
  ville: 'ville',
  codePostal: 'code_postal',
  departement: 'departement',
  adresse: 'adresse',
  siteWeb: 'site_web',
  dirigeant: 'dirigeant',
  categorie: 'categorie',
  codeNaf: 'code_naf',
  effectif: 'effectif',
  dateCreation: 'date_creation',
  status: 'status',
  notes: 'notes',
  emailSent: 'email_sent',
  emailSentAt: 'email_sent_at',
  importedAt: 'imported_at',
}

export function toDbPartial(updates) {
  const out = {}
  for (const [k, v] of Object.entries(updates)) {
    if (FIELD_MAP[k]) out[FIELD_MAP[k]] = v
  }
  return out
}

export function fromDbProspect(r) {
  return {
    id: r.siren,
    siren: r.siren,
    nom: r.nom,
    email: r.email,
    telephone: r.telephone,
    ville: r.ville,
    codePostal: r.code_postal,
    departement: r.departement,
    adresse: r.adresse,
    siteWeb: r.site_web,
    dirigeant: r.dirigeant,
    categorie: r.categorie,
    codeNaf: r.code_naf,
    effectif: r.effectif,
    dateCreation: r.date_creation,
    status: r.status,
    notes: r.notes,
    emailSent: r.email_sent,
    emailSentAt: r.email_sent_at,
    importedAt: r.imported_at,
  }
}

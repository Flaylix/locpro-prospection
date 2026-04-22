import { supabase, toDbProspect, toDbPartial, fromDbProspect } from './supabaseClient'

const PAPPERS_API_KEY = import.meta.env.VITE_PAPPERS_API_KEY

const NAF_LABELS = {
  '7711A': 'Location courte durée',
  '7711B': 'Location longue durée',
  '7712Z': 'Location autres véhicules',
  '4511Z': 'Commerce véhicules légers',
  '4519Z': 'Commerce autres véhicules',
}

export async function searchAgences({ codeNaf = '7711A', departement = '', page = 1, parPage = 100 }) {
  const params = new URLSearchParams({
    api_token: PAPPERS_API_KEY,
    code_naf: codeNaf,
    departement,
    page,
    par_page: parPage,
    champs: 'siren,nom_entreprise,siege,dirigeants,email,telephone,date_creation,effectif',
  })

  const response = await fetch(`https://api.pappers.fr/v2/entreprises?${params}`)
  if (!response.ok) throw new Error(`Pappers API error: ${response.status}`)
  const data = await response.json()

  return data.resultats?.map(e => ({
    id: e.siren,
    siren: e.siren,
    nom: e.nom_entreprise,
    email: e.email || e.siege?.email || '',
    telephone: e.telephone || e.siege?.telephone || '',
    adresse: [e.siege?.adresse_ligne_1, e.siege?.code_postal, e.siege?.ville].filter(Boolean).join(', '),
    ville: e.siege?.ville || '',
    departement: e.siege?.departement || '',
    codePostal: e.siege?.code_postal || '',
    codeNaf,
    categorie: NAF_LABELS[codeNaf] || 'Location véhicules',
    dirigeant: e.dirigeants?.[0] ? `${e.dirigeants[0].prenom || ''} ${e.dirigeants[0].nom || ''}`.trim() : '',
    effectif: e.effectif || '',
    dateCreation: e.date_creation || '',
    status: 'nouveau',
    notes: '',
    importedAt: new Date().toISOString(),
  })) || []
}

export async function importMassif({ departements = [], codesNaf = ['7711A', '7711B'], onProgress }) {
  const allAgences = []
  let total = 0

  for (const naf of codesNaf) {
    for (const dept of departements.length ? departements : ['']) {
      try {
        const page1 = await searchAgences({ codeNaf: naf, departement: dept, page: 1, parPage: 100 })
        allAgences.push(...page1)
        total += page1.length
        onProgress?.(total)

        if (page1.length === 100) {
          const page2 = await searchAgences({ codeNaf: naf, departement: dept, page: 2, parPage: 100 })
          allAgences.push(...page2)
          total += page2.length
          onProgress?.(total)
        }

        if (allAgences.length >= 400) break
        await new Promise(r => setTimeout(r, 300))
      } catch (err) {
        console.error(`Erreur NAF ${naf} dept ${dept}:`, err)
      }
    }
    if (allAgences.length >= 400) break
  }

  const unique = Array.from(new Map(allAgences.map(a => [a.siren, a])).values())
  return unique.slice(0, 400)
}

// ─── Persistance Supabase ────────────────────────────────────────────────

export async function saveProspects(prospects) {
  if (!prospects.length) return { total: 0, nouveaux: 0 }

  // Vérifier les SIREN existants pour calculer le nombre de nouveaux
  const { data: existingRows, error: selErr } = await supabase
    .from('prospects')
    .select('siren')
    .in('siren', prospects.map(p => p.siren))
  if (selErr) throw new Error('Lecture Supabase : ' + selErr.message)

  const existingSirens = new Set((existingRows || []).map(r => r.siren))
  const nouveaux = prospects.filter(p => !existingSirens.has(p.siren))

  // Upsert atomique (évite les races sur PK siren)
  const { error: upErr } = await supabase
    .from('prospects')
    .upsert(prospects.map(toDbProspect), { onConflict: 'siren', ignoreDuplicates: true })
  if (upErr) throw new Error('Sauvegarde Supabase : ' + upErr.message)

  const { count, error: cErr } = await supabase
    .from('prospects')
    .select('*', { count: 'exact', head: true })
  if (cErr) throw new Error('Comptage Supabase : ' + cErr.message)

  try {
    localStorage.setItem('locpro_prospects_lastImport', new Date().toISOString())
  } catch {}

  return { total: count || 0, nouveaux: nouveaux.length }
}

export async function getProspects() {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('imported_at', { ascending: false })
  if (error) throw new Error('Lecture Supabase : ' + error.message)
  return (data || []).map(fromDbProspect)
}

export async function updateProspect(siren, updates) {
  const dbUpdates = toDbPartial(updates)
  delete dbUpdates.siren
  if (Object.keys(dbUpdates).length === 0) return getProspects()
  const { error } = await supabase
    .from('prospects')
    .update(dbUpdates)
    .eq('siren', siren)
  if (error) throw new Error('Mise à jour Supabase : ' + error.message)
  return getProspects()
}

export async function deleteProspect(siren) {
  const { error } = await supabase
    .from('prospects')
    .delete()
    .eq('siren', siren)
  if (error) throw new Error('Suppression Supabase : ' + error.message)
}

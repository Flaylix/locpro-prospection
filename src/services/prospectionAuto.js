const PAPPERS_KEY = import.meta.env.VITE_PAPPERS_API_KEY
const HUNTER_KEY  = import.meta.env.VITE_HUNTER_API_KEY
const RESEND_KEY  = import.meta.env.VITE_RESEND_API_KEY
const BREVO_KEY   = import.meta.env.VITE_BREVO_API_KEY

const NAF_CODES = ['7711A', '7711B', '7712Z']

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function updateProspectStatus(siren, status) {
  const prospects = JSON.parse(localStorage.getItem('locpro_prospects') || '[]')
  const updated = prospects.map(p =>
    p.siren === siren
      ? { ...p, status, emailSent: true, emailSentAt: new Date().toISOString() }
      : p
  )
  localStorage.setItem('locpro_prospects', JSON.stringify(updated))
}

// ─── ÉTAPE 1 : Pappers → agences ───────────────────────────────────────────
async function fetchAgencesPappers(departement = '', page = 1) {
  const results = []
  for (const naf of NAF_CODES) {
    const params = new URLSearchParams({
      api_token: PAPPERS_KEY,
      code_naf: naf,
      departement,
      page,
      par_page: 50,
      champs: 'siren,nom_entreprise,siege,dirigeants,site_web,telephone',
    })
    try {
      const res = await fetch(`https://api.pappers.fr/v2/entreprises?${params}`)
      if (!res.ok) throw new Error(`Pappers ${res.status}`)
      const data = await res.json()
      const formatted = (data.resultats || []).map(e => ({
        siren: e.siren,
        nom: e.nom_entreprise,
        telephone: e.telephone || e.siege?.telephone || '',
        ville: e.siege?.ville || '',
        codePostal: e.siege?.code_postal || '',
        departement: e.siege?.departement || '',
        adresse: e.siege?.adresse_ligne_1 || '',
        siteWeb: e.site_web || '',
        dirigeant: e.dirigeants?.[0]
          ? `${e.dirigeants[0].prenom || ''} ${e.dirigeants[0].nom || ''}`.trim()
          : '',
        categorie:
          naf === '7711A' ? 'Location courte durée' :
          naf === '7711B' ? 'Location longue durée' :
          'Location véhicules',
        email: '',
        status: 'nouveau',
        emailSent: false,
        importedAt: new Date().toISOString(),
      }))
      results.push(...formatted)
    } catch (err) {
      console.error(`Pappers NAF ${naf} dept ${departement}:`, err)
    }
    await sleep(300)
  }
  return results
}

// ─── ÉTAPE 2 : Hunter.io → email ───────────────────────────────────────────
async function findEmailHunter(agence) {
  if (!agence.siteWeb || !HUNTER_KEY) return agence
  try {
    const domain = agence.siteWeb.replace(/https?:\/\/(www\.)?/, '').split('/')[0]
    if (!domain || domain.length < 4) return agence
    const res = await fetch(
      `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_KEY}&limit=1`
    )
    if (!res.ok) return agence
    const data = await res.json()
    const firstEmail = data.data?.emails?.[0]?.value
    const pattern = data.data?.pattern
    let email = firstEmail || ''
    if (!email && pattern && agence.dirigeant) {
      const [prenom, ...rest] = agence.dirigeant.split(' ')
      const nom = rest.join(' ')
      email = pattern
        .replace('{first}', (prenom || '').toLowerCase())
        .replace('{last}', (nom || '').toLowerCase())
        .replace('{f}', (prenom?.[0] || '').toLowerCase())
        .replace('{l}', (nom?.[0] || '').toLowerCase())
      if (!email.includes('@')) email = ''
    }
    return { ...agence, email }
  } catch {
    return agence
  }
}

// ─── ÉTAPE 3 : Resend → email de prospection ───────────────────────────────
export async function sendProspectionEmail(agence) {
  const prenom = agence.dirigeant?.split(' ')[0] || 'Madame, Monsieur'

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#ffffff;color:#111827">
      <div style="background:#6366f1;padding:24px 28px">
        <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:800;letter-spacing:-0.02em">LocPro</h1>
        <p style="color:rgba(255,255,255,0.7);font-size:12px;margin:4px 0 0">Gestion de location de véhicules</p>
      </div>
      <div style="padding:32px 28px">
        <p style="font-size:15px;line-height:1.6;color:#111827;margin-top:0">Bonjour ${prenom},</p>
        <p style="font-size:14px;line-height:1.8;color:#374151">
          Je me permets de vous contacter car j'ai développé <strong style="color:#6366f1">LocPro</strong>,
          une plateforme pensée spécifiquement pour les loueurs indépendants comme <strong>${agence.nom}</strong>.
        </p>
        <p style="font-size:14px;line-height:1.8;color:#374151">En quelques secondes, LocPro vous permet de :</p>
        <div style="margin:20px 0;padding-left:4px">
          ${[
            'Générer vos contrats par IA en 30 secondes',
            'Créer vos factures automatiquement dès la signature',
            'Envoyer des rappels SMS automatiques à vos clients',
            'Gérer toute votre flotte avec taux d\'occupation et alertes',
            'Répondre à vos appels 24h/24 grâce à l\'assistant vocal IA',
          ].map(item => `
            <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px">
              <span style="color:#6366f1;font-weight:700;font-size:16px;line-height:1.4">→</span>
              <span style="font-size:13px;color:#374151;line-height:1.6">${item}</span>
            </div>`
          ).join('')}
        </div>
        <p style="font-size:14px;line-height:1.8;color:#374151">
          Nos clients loueurs gagnent en moyenne <strong style="color:#6366f1">8 heures par mois</strong> sur leur administratif.
        </p>
        <div style="text-align:center;margin:32px 0">
          <a href="mailto:contact@locpro.fr?subject=Demande de démo LocPro — ${encodeURIComponent(agence.nom)}"
            style="background:#6366f1;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;letter-spacing:0.04em;display:inline-block">
            Demander une démo gratuite →
          </a>
        </div>
        <p style="font-size:13px;color:#6b7280;line-height:1.7">
          Disponible cette semaine pour un appel de 15 minutes ?<br>
          Je m'adapte entièrement à vos disponibilités.
        </p>
      </div>
      <div style="background:#f9fafb;padding:16px 28px;border-top:1px solid #e5e7eb">
        <p style="font-size:11px;color:#9ca3af;margin:0">
          © LocPro 2026 ·
          <a href="mailto:contact@locpro.fr?subject=Désabonnement" style="color:#6b7280">Se désabonner</a>
        </p>
      </div>
    </div>
  `

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
      },
      body: JSON.stringify({
        from: 'LocPro <contact@locpro.fr>',
        to: agence.email,
        subject: `${agence.nom} — Gérez toutes vos locations en 30 secondes`,
        html,
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

// ─── ÉTAPE 4 : Brevo → séquence de relance ─────────────────────────────────
export async function createBrevoSequence(agence) {
  if (!BREVO_KEY) return
  try {
    await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': BREVO_KEY },
      body: JSON.stringify({
        email: agence.email,
        attributes: {
          PRENOM: agence.dirigeant?.split(' ')[0] || '',
          NOM_AGENCE: agence.nom,
          VILLE: agence.ville,
          TELEPHONE: agence.telephone,
        },
        listIds: [2],
        updateEnabled: true,
      }),
    })
  } catch (err) {
    console.error('Brevo sequence error:', err)
  }
}

// ─── FLOW COMPLET ──────────────────────────────────────────────────────────
export async function lancerProspectionAuto({
  departements = [],
  limite = 400,
  envoyerEmails = false,
  onProgress,
}) {
  const agences = []

  // 1. Agences Pappers
  onProgress?.({ step: 'pappers', count: 0, message: 'Recherche des agences Pappers…' })
  for (const dept of departements.length ? departements : ['']) {
    const batch = await fetchAgencesPappers(dept, 1)
    agences.push(...batch)
    onProgress?.({ step: 'pappers', count: agences.length, message: `${agences.length} agences trouvées` })
    if (agences.length >= limite) break
    await sleep(500)
  }

  const agencesUniques = [...new Map(agences.map(a => [a.siren, a])).values()].slice(0, limite)

  // 2. Emails via Hunter
  onProgress?.({ step: 'hunter', count: 0, message: 'Recherche des emails professionnels…' })
  const avecEmails = []
  for (let i = 0; i < agencesUniques.length; i++) {
    const agence = await findEmailHunter(agencesUniques[i])
    avecEmails.push(agence)
    if (i % 5 === 0) {
      onProgress?.({ step: 'hunter', count: i, message: `${i}/${agencesUniques.length} emails recherchés` })
    }
    await sleep(200)
  }
  const avecEmailTrouve = avecEmails.filter(a => a.email)

  // 3. Sauvegarde
  onProgress?.({ step: 'save', count: avecEmails.length, message: 'Sauvegarde dans LocPro…' })
  const existing = JSON.parse(localStorage.getItem('locpro_prospects') || '[]')
  const existingSirens = new Set(existing.map(p => p.siren))
  const nouveaux = avecEmails.filter(a => !existingSirens.has(a.siren))
  const merged = [...nouveaux, ...existing]
  localStorage.setItem('locpro_prospects', JSON.stringify(merged))
  localStorage.setItem('locpro_prospects_lastImport', new Date().toISOString())

  // 4. Envoi emails
  if (envoyerEmails) {
    const aEnvoyer = nouveaux.filter(a => a.email)
    onProgress?.({ step: 'email', count: 0, message: `Envoi de ${aEnvoyer.length} emails…` })
    let sent = 0
    for (const agence of aEnvoyer) {
      const ok = await sendProspectionEmail(agence)
      if (ok) {
        sent++
        updateProspectStatus(agence.siren, 'contacté')
        await createBrevoSequence(agence)
      }
      onProgress?.({ step: 'email', count: sent, message: `${sent}/${aEnvoyer.length} emails envoyés` })
      await sleep(1100)
    }
  }

  onProgress?.({ step: 'done', count: nouveaux.length, message: 'Prospection terminée !' })
  return {
    total: merged.length,
    nouveaux: nouveaux.length,
    avecEmail: avecEmailTrouve.length,
  }
}

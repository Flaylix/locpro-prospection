import { useState, useEffect } from 'react'
import { getProspects, updateProspect, deleteProspect } from '../services/pappersService'
import { lancerProspectionAuto } from '../services/prospectionAuto'

const DEPARTEMENTS = [
  { code: '75', label: 'Paris' },
  { code: '13', label: 'Marseille' },
  { code: '69', label: 'Lyon' },
  { code: '31', label: 'Toulouse' },
  { code: '06', label: 'Nice' },
  { code: '44', label: 'Nantes' },
  { code: '67', label: 'Strasbourg' },
  { code: '34', label: 'Montpellier' },
  { code: '33', label: 'Bordeaux' },
  { code: '59', label: 'Lille' },
  { code: '35', label: 'Rennes' },
  { code: '76', label: 'Rouen' },
  { code: '38', label: 'Grenoble' },
  { code: '57', label: 'Metz' },
  { code: '972', label: 'Martinique' },
  { code: '974', label: 'Réunion' },
]

const STATUS = {
  nouveau:   { label: 'Nouveau',   bg: '#dbeafe', color: '#1d4ed8' },
  contacté:  { label: 'Contacté',  bg: '#fef3c7', color: '#92400e' },
  intéressé: { label: 'Intéressé', bg: '#d1fae5', color: '#065f46' },
  client:    { label: 'Client ✓',  bg: '#d1fae5', color: '#065f46' },
  refusé:    { label: 'Refusé',    bg: '#fee2e2', color: '#991b1b' },
}

const STEP_LABELS = {
  start:   { icon: '⏳', label: 'Démarrage' },
  pappers: { icon: '🔍', label: 'Pappers.fr' },
  hunter:  { icon: '✉️', label: 'Hunter.io' },
  save:    { icon: '💾', label: 'Sauvegarde' },
  email:   { icon: '📤', label: 'Envoi emails' },
  done:    { icon: '✅', label: 'Terminé' },
}

const HAS_PAPPERS = !!import.meta.env.VITE_PAPPERS_API_KEY
const HAS_HUNTER  = !!import.meta.env.VITE_HUNTER_API_KEY
const HAS_RESEND  = !!import.meta.env.VITE_RESEND_API_KEY
const HAS_BREVO   = !!import.meta.env.VITE_BREVO_API_KEY

function computeStats(data) {
  return {
    total: data.length,
    avecEmail: data.filter(p => p.email).length,
    contactés: data.filter(p => p.status === 'contacté').length,
    intéressés: data.filter(p => p.status === 'intéressé' || p.status === 'client').length,
  }
}

function StatusPill({ status }) {
  const c = STATUS[status] || STATUS.nouveau
  return (
    <span style={{ background: c.bg, color: c.color, padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {c.label}
    </span>
  )
}

function ApiStatusDot({ ok, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: ok ? '#16a34a' : '#d1d5db', flexShrink: 0 }} />
      <span style={{ color: ok ? '#374151' : '#9ca3af', fontWeight: ok ? 600 : 400 }}>{label}</span>
    </div>
  )
}

export default function Prospects() {
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(false)
  const [progressInfo, setProgressInfo] = useState({ step: 'start', count: 0, message: '' })
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [filterDept, setFilterDept] = useState('')
  const [lastImport, setLastImport] = useState(null)
  const [stats, setStats] = useState({ total: 0, avecEmail: 0, contactés: 0, intéressés: 0 })
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [selectedDepts, setSelectedDepts] = useState([])
  const [sendEmails, setSendEmails] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  useEffect(() => {
    const data = getProspects()
    setProspects(data)
    setLastImport(localStorage.getItem('locpro_prospects_lastImport'))
    setStats(computeStats(data))
  }, [])

  async function handleProspectionAuto() {
    if (!HAS_PAPPERS) {
      alert('Clé API Pappers manquante (VITE_PAPPERS_API_KEY). Ajoutez-la dans les secrets Replit.')
      return
    }
    setLoading(true)
    setLastResult(null)
    setProgressInfo({ step: 'start', count: 0, message: 'Démarrage de la prospection…' })

    try {
      const result = await lancerProspectionAuto({
        departements: selectedDepts,
        limite: 400,
        envoyerEmails: sendEmails,
        onProgress: info => setProgressInfo(info),
      })
      setLastResult(result)
      const data = getProspects()
      setProspects(data)
      setStats(computeStats(data))
      setLastImport(new Date().toISOString())
    } catch (err) {
      alert('Erreur prospection : ' + err.message)
    }
    setLoading(false)
  }

  function handleStatusChange(siren, newStatus) {
    const updated = updateProspect(siren, { status: newStatus })
    setProspects(updated)
    setStats(computeStats(updated))
    setSelectedProspect(p => p ? { ...p, status: newStatus } : null)
  }

  function handleDelete(siren) {
    deleteProspect(siren)
    const data = getProspects()
    setProspects(data)
    setStats(computeStats(data))
    setSelectedProspect(null)
  }

  function exportCSV() {
    const headers = ['Nom', 'SIREN', 'Email', 'Téléphone', 'Ville', 'Département', 'Catégorie', 'Dirigeant', 'Statut', 'Notes']
    const rows = filtered.map(p =>
      [p.nom, p.siren, p.email, p.telephone, p.ville, p.departement, p.categorie, p.dirigeant, p.status, p.notes]
        .map(v => `"${(v || '').replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `prospects-locpro-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const filtered = prospects.filter(p => {
    const q = search.toLowerCase()
    return (
      (!q || p.nom?.toLowerCase().includes(q) || p.ville?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q) || p.dirigeant?.toLowerCase().includes(q)) &&
      (filterStatus === 'tous' || p.status === filterStatus) &&
      (!filterDept || p.departement?.includes(filterDept) || p.codePostal?.startsWith(filterDept))
    )
  })

  const progressPct = progressInfo.step === 'pappers'
    ? Math.min((progressInfo.count / 400) * 100, 80)
    : progressInfo.step === 'hunter'
    ? 80 + Math.min((progressInfo.count / 400) * 15, 15)
    : progressInfo.step === 'email'
    ? 95 + Math.min((progressInfo.count / 100) * 5, 5)
    : progressInfo.step === 'done' ? 100 : 5

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 155px)', overflow: 'hidden' }}>
      <style>{`
        .prospect-card:hover { border-color: #c7d2fe !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher agence, ville, dirigeant, email…"
          style={{ padding: '8px 13px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827', background: '#fff', outline: 'none', width: 260 }}
        />
        <select
          value={filterDept} onChange={e => setFilterDept(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827', background: '#fff', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">Tous les départements</option>
          {DEPARTEMENTS.map(d => <option key={d.code + d.label} value={d.code}>{d.label} ({d.code})</option>)}
        </select>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['tous', 'nouveau', 'contacté', 'intéressé', 'client', 'refusé'].map(st => (
            <button key={st} onClick={() => setFilterStatus(st)} style={{
              padding: '5px 12px',
              border: `1px solid ${filterStatus === st ? '#6366f1' : '#e5e7eb'}`,
              borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: filterStatus === st ? '#eef2ff' : '#fff',
              color: filterStatus === st ? '#6366f1' : '#6b7280',
            }}>
              {st === 'tous' ? 'Tous' : STATUS[st]?.label}
            </button>
          ))}
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {prospects.length > 0 && (
            <button onClick={exportCSV} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#f9fafb', color: '#374151' }}>
              ↓ CSV
            </button>
          )}
          <button onClick={() => { setLastResult(null); setShowImportPanel(true) }} style={{ padding: '8px 16px', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#6366f1', color: '#fff' }}>
            ⚡ Prospection auto
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px', display: 'flex', gap: 28, alignItems: 'center' }}>
        {[
          { label: 'Total', value: stats.total, color: '#374151' },
          { label: 'Avec email', value: stats.avecEmail, color: '#16a34a' },
          { label: 'Contactés', value: stats.contactés, color: '#92400e' },
          { label: 'Intéressés', value: stats.intéressés, color: '#065f46' },
        ].map(k => (
          <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: k.color, lineHeight: 1 }}>{k.value}</span>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>{k.label}</span>
          </div>
        ))}
        {lastImport && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af' }}>
            Dernier import : {new Date(lastImport).toLocaleDateString('fr-FR')} {new Date(lastImport).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── Liste ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {prospects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '65%', gap: 12 }}>
            <div style={{ fontSize: 52 }}>🏢</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#374151' }}>Aucune agence importée</div>
            <div style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', maxWidth: 380, lineHeight: 1.7 }}>
              Lancez la prospection automatique pour importer des agences depuis Pappers.fr, trouver leurs emails via Hunter.io et envoyer vos emails de contact.
            </div>
            <button onClick={() => setShowImportPanel(true)} style={{ marginTop: 8, padding: '10px 22px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              ⚡ Lancer la prospection auto
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
              {filtered.length} agence{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}
              {filtered.length !== prospects.length ? ` (filtrées sur ${prospects.length})` : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
              {filtered.map(p => (
                <div key={p.siren} className="prospect-card" onClick={() => setSelectedProspect(p)}
                  style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'border-color .15s' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>
                        {p.ville}{p.codePostal ? ` (${p.codePostal.slice(0, 2)})` : ''} · {p.categorie}
                      </div>
                    </div>
                    <StatusPill status={p.status} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {p.email
                      ? <span style={{ fontSize: 12, color: '#6366f1' }}>✉ {p.email}</span>
                      : <span style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic' }}>Email non trouvé</span>
                    }
                    {p.telephone && <span style={{ fontSize: 12, color: '#6b7280' }}>📱 {p.telephone}</span>}
                    {p.dirigeant && <span style={{ fontSize: 11, color: '#9ca3af' }}>👤 {p.dirigeant}</span>}
                    {p.emailSent && (
                      <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '2px 7px', borderRadius: 4, width: 'fit-content', marginTop: 2 }}>
                        Email envoyé {p.emailSentAt ? new Date(p.emailSentAt).toLocaleDateString('fr-FR') : ''}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ══ MODAL PROSPECTION AUTO ══ */}
      {showImportPanel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => !loading && setShowImportPanel(false)}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '14px auto 0' }} />

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '16px 24px 12px', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 16, color: '#111827' }}>⚡ Prospection automatique</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 3 }}>
                  Pappers → Hunter.io → LocPro → Resend + relances Brevo
                </div>
              </div>
              {!loading && (
                <button onClick={() => setShowImportPanel(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 7, color: '#6b7280', width: 30, height: 30, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
              )}
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Statut des APIs */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Statut des clés API</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <ApiStatusDot ok={HAS_PAPPERS} label="Pappers.fr (agences)" />
                  <ApiStatusDot ok={HAS_HUNTER}  label="Hunter.io (emails)" />
                  <ApiStatusDot ok={HAS_RESEND}  label="Resend (envoi)" />
                  <ApiStatusDot ok={HAS_BREVO}   label="Brevo (relances)" />
                </div>
                {(!HAS_PAPPERS || !HAS_HUNTER || !HAS_RESEND || !HAS_BREVO) && (
                  <div style={{ marginTop: 10, fontSize: 11, color: '#f59e0b', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '7px 10px' }}>
                    Les clés manquantes peuvent être ajoutées dans les Secrets Replit. Sans Hunter.io, les emails ne seront pas recherchés. Sans Resend/Brevo, les emails ne seront pas envoyés.
                  </div>
                )}
              </div>

              {/* Départements */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Départements ciblés <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none' }}>(vide = toute la France)</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {DEPARTEMENTS.map(d => {
                    const active = selectedDepts.includes(d.code)
                    return (
                      <button key={d.code + d.label}
                        onClick={() => setSelectedDepts(prev => prev.includes(d.code) ? prev.filter(x => x !== d.code) : [...prev, d.code])}
                        style={{
                          padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                          background: active ? '#6366f1' : '#f9fafb',
                          color: active ? '#fff' : '#374151',
                          border: `1px solid ${active ? '#6366f1' : '#e5e7eb'}`,
                          transition: 'all .15s',
                        }}>
                        {d.label} <span style={{ opacity: .55, fontSize: 10 }}>({d.code})</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Toggle envoi emails */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: sendEmails ? '#eef2ff' : '#f9fafb', border: `1px solid ${sendEmails ? '#c7d2fe' : '#e5e7eb'}`, borderRadius: 10, padding: '14px 16px', transition: 'all .2s' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 2 }}>
                    Envoyer les emails automatiquement
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    Envoi via Resend · Relances J+3 et J+7 via Brevo
                    {!HAS_RESEND && <span style={{ color: '#f59e0b', marginLeft: 6 }}>· Resend non configuré</span>}
                  </div>
                </div>
                <div
                  onClick={() => setSendEmails(!sendEmails)}
                  style={{ width: 46, height: 26, borderRadius: 13, background: sendEmails ? '#6366f1' : '#d1d5db', position: 'relative', cursor: 'pointer', transition: 'background .2s', flexShrink: 0, marginLeft: 16 }}>
                  <div style={{ position: 'absolute', top: 3, left: sendEmails ? 23 : 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                </div>
              </div>

              {/* Barre de progression */}
              {loading && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 22, height: 22, border: '2.5px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>
                        {STEP_LABELS[progressInfo.step]?.icon} {STEP_LABELS[progressInfo.step]?.label}
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{progressInfo.message}</div>
                    </div>
                  </div>
                  <div style={{ background: '#e5e7eb', borderRadius: 20, height: 6, overflow: 'hidden' }}>
                    <div style={{ background: '#6366f1', height: '100%', width: `${progressPct}%`, transition: 'width .4s', borderRadius: 20 }} />
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#9ca3af' }}>
                    <span>{progressInfo.count} traités</span>
                    <span>{Math.round(progressPct)}%</span>
                  </div>
                </div>
              )}

              {/* Résultat */}
              {lastResult && !loading && (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 20 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{lastResult.nouveaux}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Nouvelles agences</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#6366f1' }}>{lastResult.avecEmail}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Emails trouvés</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#374151' }}>{lastResult.total}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Total en base</div>
                  </div>
                </div>
              )}

              {/* Bouton lancer */}
              {!loading && (
                <button
                  onClick={handleProspectionAuto}
                  disabled={!HAS_PAPPERS}
                  style={{
                    width: '100%', padding: '15px', background: HAS_PAPPERS ? '#6366f1' : '#e5e7eb',
                    color: HAS_PAPPERS ? '#fff' : '#9ca3af', border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 700, cursor: HAS_PAPPERS ? 'pointer' : 'not-allowed',
                  }}>
                  ⚡ Lancer la prospection · jusqu'à 400 agences
                </button>
              )}

              {loading && (
                <button disabled style={{ width: '100%', padding: '15px', background: '#e5e7eb', color: '#9ca3af', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'not-allowed' }}>
                  Prospection en cours…
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ FICHE PROSPECT ══ */}
      {selectedProspect && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelectedProspect(null)}>
          <div style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px 12px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', flex: 1, marginRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedProspect.nom}
              </div>
              <button onClick={() => setSelectedProspect(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 7, color: '#6b7280', width: 30, height: 30, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
            </div>

            <div style={{ padding: '6px 24px 24px' }}>
              {[
                ['SIREN', selectedProspect.siren],
                ['Ville', `${selectedProspect.ville}${selectedProspect.departement ? ` (${selectedProspect.departement})` : ''}`],
                ['Adresse', selectedProspect.adresse || '—'],
                ['Email', selectedProspect.email || '—'],
                ['Téléphone', selectedProspect.telephone || '—'],
                ['Dirigeant', selectedProspect.dirigeant || '—'],
                ['Catégorie NAF', selectedProspect.categorie],
                ['Site web', selectedProspect.siteWeb || '—'],
                ['Email envoyé', selectedProspect.emailSent ? `Oui — ${selectedProspect.emailSentAt ? new Date(selectedProspect.emailSentAt).toLocaleDateString('fr-FR') : ''}` : 'Non'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>{l}</span>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, textAlign: 'right', maxWidth: '65%', wordBreak: 'break-word' }}>{v}</span>
                </div>
              ))}

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Statut</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {Object.entries(STATUS).map(([key, val]) => {
                    const active = selectedProspect.status === key
                    return (
                      <button key={key} onClick={() => handleStatusChange(selectedProspect.siren, key)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: active ? val.color : val.bg,
                          color: active ? '#fff' : val.color,
                          border: `1px solid ${val.color}40`,
                        }}>
                        {val.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Notes</div>
                <textarea
                  defaultValue={selectedProspect.notes}
                  onBlur={e => updateProspect(selectedProspect.siren, { notes: e.target.value })}
                  rows={3} placeholder="Ajouter une note…"
                  style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', color: '#111827', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
                {selectedProspect.email && (
                  <a href={`mailto:${selectedProspect.email}`}
                    style={{ display: 'block', background: '#6366f1', color: '#fff', textAlign: 'center', padding: 13, borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                    ✉ Envoyer un email
                  </a>
                )}
                {selectedProspect.telephone && (
                  <a href={`tel:${selectedProspect.telephone}`}
                    style={{ display: 'block', background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', textAlign: 'center', padding: 12, borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                    📱 Appeler
                  </a>
                )}
                <button onClick={() => handleDelete(selectedProspect.siren)}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 12, borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Supprimer ce prospect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

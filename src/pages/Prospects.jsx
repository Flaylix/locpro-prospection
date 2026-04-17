import { useState, useEffect } from 'react'
import { importMassif, saveProspects, getProspects, updateProspect, deleteProspect } from '../services/pappersService'

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
  nouveau:   { label: 'Nouveau',    bg: '#dbeafe', color: '#1d4ed8' },
  contacté:  { label: 'Contacté',   bg: '#fef3c7', color: '#92400e' },
  intéressé: { label: 'Intéressé',  bg: '#d1fae5', color: '#065f46' },
  client:    { label: 'Client ✓',   bg: '#d1fae5', color: '#065f46' },
  refusé:    { label: 'Refusé',     bg: '#fee2e2', color: '#991b1b' },
}

const s = {
  btn: (primary) => ({
    padding: '8px 16px', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600,
    cursor: 'pointer', background: primary ? '#6366f1' : '#f9fafb',
    color: primary ? '#fff' : '#374151',
    border: primary ? 'none' : '1px solid #e5e7eb',
  }),
  input: {
    width: '100%', padding: '9px 13px', border: '1px solid #d1d5db',
    borderRadius: 8, fontSize: 13, color: '#111827', background: '#fff',
    outline: 'none', boxSizing: 'border-box',
  },
  label: {
    fontSize: 11, fontWeight: 600, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 5,
  },
  card: {
    background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10,
    padding: '14px 16px', cursor: 'pointer', transition: 'border-color .15s',
  },
}

function StatusPill({ status }) {
  const c = STATUS[status] || STATUS.nouveau
  return (
    <span style={{
      background: c.bg, color: c.color,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0,
    }}>
      {c.label}
    </span>
  )
}

function computeStats(data) {
  return {
    total: data.length,
    avecEmail: data.filter(p => p.email).length,
    contactés: data.filter(p => p.status === 'contacté').length,
    intéressés: data.filter(p => p.status === 'intéressé' || p.status === 'client').length,
  }
}

export default function Prospects() {
  const [prospects, setProspects] = useState([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('tous')
  const [filterDept, setFilterDept] = useState('')
  const [lastImport, setLastImport] = useState(null)
  const [stats, setStats] = useState({ total: 0, avecEmail: 0, contactés: 0, intéressés: 0 })
  const [selectedProspect, setSelectedProspect] = useState(null)
  const [showImportPanel, setShowImportPanel] = useState(false)
  const [selectedDepts, setSelectedDepts] = useState([])
  const [hasKey] = useState(!!import.meta.env.VITE_PAPPERS_API_KEY)

  useEffect(() => {
    const data = getProspects()
    setProspects(data)
    setLastImport(localStorage.getItem('locpro_prospects_lastImport'))
    setStats(computeStats(data))
  }, [])

  async function handleImport() {
    if (!hasKey) {
      alert('Clé API Pappers manquante. Ajoutez VITE_PAPPERS_API_KEY dans les secrets.')
      return
    }
    setLoading(true)
    setProgress(0)
    try {
      const agences = await importMassif({
        departements: selectedDepts,
        codesNaf: ['7711A', '7711B', '7712Z'],
        onProgress: n => setProgress(n),
      })
      const result = saveProspects(agences)
      const data = getProspects()
      setProspects(data)
      setStats(computeStats(data))
      setLastImport(new Date().toISOString())
      setShowImportPanel(false)
      alert(`Import terminé — ${result.nouveaux} nouvelles agences ajoutées (${result.total} au total)`)
    } catch (err) {
      alert('Erreur import : ' + err.message)
    }
    setLoading(false)
    setProgress(0)
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
        .map(v => `"${v || ''}"`)
        .join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    a.download = `prospects-locpro-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const filtered = prospects.filter(p => {
    const q = search.toLowerCase()
    return (
      (!q || p.nom?.toLowerCase().includes(q) || p.ville?.toLowerCase().includes(q) || p.email?.toLowerCase().includes(q)) &&
      (filterStatus === 'tous' || p.status === filterStatus) &&
      (!filterDept || p.departement?.includes(filterDept) || p.codePostal?.startsWith(filterDept))
    )
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 155px)', overflow: 'hidden' }}>
      <style>{`
        .prospect-card:hover { border-color: #c7d2fe !important; }
        .dept-btn { transition: all .15s; }
        .dept-btn:hover { opacity: .85; }
      `}</style>

      {/* ── Toolbar ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher agence, ville, email…"
          style={{ ...s.input, width: 240 }}
        />
        <select
          value={filterDept} onChange={e => setFilterDept(e.target.value)}
          style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 8, fontSize: 13, color: '#111827', background: '#fff', outline: 'none', cursor: 'pointer' }}
        >
          <option value="">Tous les départements</option>
          {DEPARTEMENTS.map(d => <option key={d.code} value={d.code}>{d.label} ({d.code})</option>)}
        </select>

        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {['tous', 'nouveau', 'contacté', 'intéressé', 'client', 'refusé'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              style={{
                padding: '5px 12px', border: `1px solid ${filterStatus === st ? '#6366f1' : '#e5e7eb'}`,
                borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                background: filterStatus === st ? '#eef2ff' : '#fff',
                color: filterStatus === st ? '#6366f1' : '#6b7280',
              }}
            >
              {st === 'tous' ? 'Tous' : STATUS[st]?.label}
            </button>
          ))}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {prospects.length > 0 && (
            <button onClick={exportCSV} style={s.btn(false)}>↓ CSV</button>
          )}
          <button onClick={() => setShowImportPanel(true)} style={s.btn(true)}>
            + Import Pappers
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '10px 24px', display: 'flex', gap: 24 }}>
        {[
          { label: 'Total', value: stats.total, color: '#6b7280' },
          { label: 'Avec email', value: stats.avecEmail, color: '#16a34a' },
          { label: 'Contactés', value: stats.contactés, color: '#92400e' },
          { label: 'Intéressés', value: stats.intéressés, color: '#065f46' },
        ].map(k => (
          <div key={k.label} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>{k.label}</span>
          </div>
        ))}
        {lastImport && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>
            Dernier import : {new Date(lastImport).toLocaleDateString('fr-FR')} {new Date(lastImport).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* ── Liste ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
        {!hasKey && (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '14px 18px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
            <strong>Clé API Pappers manquante.</strong> Ajoutez <code style={{ background: '#fef3c7', padding: '1px 5px', borderRadius: 3 }}>VITE_PAPPERS_API_KEY</code> dans les secrets Replit pour activer l'import automatique.
            Obtenez votre clé gratuite sur <a href="https://pappers.fr" target="_blank" style={{ color: '#6366f1' }}>pappers.fr</a> → Mon compte → API.
          </div>
        )}

        {prospects.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', gap: 12, color: '#9ca3af' }}>
            <div style={{ fontSize: 52 }}>🏢</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>Aucune agence importée</div>
            <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 360 }}>
              Importez automatiquement des agences depuis Pappers.fr (base officielle des entreprises françaises).
            </div>
            <button onClick={() => setShowImportPanel(true)} style={{ ...s.btn(true), marginTop: 8 }}>
              + Lancer l'import Pappers
            </button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 12 }}>
              {filtered.length} agence{filtered.length !== 1 ? 's' : ''} affichée{filtered.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
              {filtered.map(p => (
                <div
                  key={p.siren}
                  className="prospect-card"
                  style={s.card}
                  onClick={() => setSelectedProspect(p)}
                >
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
                      : <span style={{ fontSize: 12, color: '#d1d5db', fontStyle: 'italic' }}>Pas d'email</span>
                    }
                    {p.telephone && <span style={{ fontSize: 12, color: '#374151' }}>📱 {p.telephone}</span>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Modal Import Pappers ── */}
      {showImportPanel && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => !loading && setShowImportPanel(false)}
        >
          <div
            style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxHeight: '85vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 12px', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>Import depuis Pappers.fr</div>
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Base officielle des entreprises françaises · Codes NAF 7711A, 7711B, 7712Z</div>
              </div>
              {!loading && (
                <button onClick={() => setShowImportPanel(false)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 7, color: '#6b7280', width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
              )}
            </div>

            <div style={{ padding: '20px 22px' }}>
              <label style={s.label}>Départements ciblés <span style={{ color: '#9ca3af', fontWeight: 400 }}>(laisser vide = toute la France)</span></label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 22 }}>
                {DEPARTEMENTS.map(d => {
                  const active = selectedDepts.includes(d.code)
                  return (
                    <button
                      key={d.code + d.label}
                      className="dept-btn"
                      onClick={() => setSelectedDepts(prev => prev.includes(d.code) ? prev.filter(x => x !== d.code) : [...prev, d.code])}
                      style={{
                        padding: '5px 13px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        background: active ? '#6366f1' : '#f9fafb',
                        color: active ? '#fff' : '#374151',
                        border: `1px solid ${active ? '#6366f1' : '#e5e7eb'}`,
                      }}
                    >
                      {d.label} <span style={{ opacity: .6, fontSize: 10 }}>({d.code})</span>
                    </button>
                  )
                })}
              </div>

              {!hasKey && (
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#dc2626' }}>
                  Clé API Pappers manquante (VITE_PAPPERS_API_KEY). Ajoutez-la dans les secrets Replit.
                </div>
              )}

              {loading ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 32, marginBottom: 10 }}>⏳</div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>{progress} agences trouvées…</div>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 16 }}>Interrogation de l'API Pappers en cours</div>
                  <div style={{ background: '#e5e7eb', borderRadius: 20, height: 5, overflow: 'hidden' }}>
                    <div style={{ background: '#6366f1', height: '100%', width: `${Math.min((progress / 400) * 100, 100)}%`, transition: 'width .3s', borderRadius: 20 }} />
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleImport}
                  disabled={!hasKey}
                  style={{ ...s.btn(true), width: '100%', padding: '14px', fontSize: 14, opacity: hasKey ? 1 : 0.5 }}
                >
                  Importer jusqu'à 400 agences
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Fiche prospect ── */}
      {selectedProspect && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setSelectedProspect(null)}
        >
          <div
            style={{ background: '#fff', borderRadius: '16px 16px 0 0', width: '100%', maxHeight: '88vh', overflow: 'auto', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 40, height: 4, background: '#e5e7eb', borderRadius: 2, margin: '14px auto 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px 12px', borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', flex: 1, marginRight: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedProspect.nom}</div>
              <button onClick={() => setSelectedProspect(null)} style={{ background: '#f3f4f6', border: 'none', borderRadius: 7, color: '#6b7280', width: 30, height: 30, cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>✕</button>
            </div>

            <div style={{ padding: '6px 22px 24px', overflow: 'auto' }}>
              {[
                ['SIREN', selectedProspect.siren],
                ['Ville', `${selectedProspect.ville}${selectedProspect.departement ? ` (${selectedProspect.departement})` : ''}`],
                ['Adresse', selectedProspect.adresse || '—'],
                ['Email', selectedProspect.email || '—'],
                ['Téléphone', selectedProspect.telephone || '—'],
                ['Dirigeant', selectedProspect.dirigeant || '—'],
                ['Effectif', selectedProspect.effectif || '—'],
                ['Catégorie NAF', selectedProspect.categorie],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f9fafb' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{l}</span>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{v}</span>
                </div>
              ))}

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Statut</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {Object.entries(STATUS).map(([key, val]) => {
                    const active = selectedProspect.status === key
                    return (
                      <button
                        key={key}
                        onClick={() => handleStatusChange(selectedProspect.siren, key)}
                        style={{
                          padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                          background: active ? val.color : val.bg,
                          color: active ? '#fff' : val.color,
                          border: `1px solid ${val.color}40`,
                        }}
                      >
                        {val.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Notes</div>
                <textarea
                  defaultValue={selectedProspect.notes}
                  onBlur={e => updateProspect(selectedProspect.siren, { notes: e.target.value })}
                  rows={3}
                  placeholder="Ajouter une note…"
                  style={{ width: '100%', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', color: '#111827', fontSize: 13, fontFamily: 'inherit', resize: 'none', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                {selectedProspect.email && (
                  <a href={`mailto:${selectedProspect.email}`} style={{ display: 'block', background: '#6366f1', color: '#fff', textAlign: 'center', padding: 13, borderRadius: 10, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                    ✉ Envoyer un email
                  </a>
                )}
                {selectedProspect.telephone && (
                  <a href={`tel:${selectedProspect.telephone}`} style={{ display: 'block', background: '#f9fafb', border: '1px solid #e5e7eb', color: '#374151', textAlign: 'center', padding: 12, borderRadius: 10, fontWeight: 600, fontSize: 13, textDecoration: 'none' }}>
                    📱 Appeler
                  </a>
                )}
                <button
                  onClick={() => handleDelete(selectedProspect.siren)}
                  style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 12, borderRadius: 10, fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
                >
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

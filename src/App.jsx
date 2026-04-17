import { useState, useMemo, useRef } from "react";

const CATEGORIES = ["Voiture", "Luxe", "Utilitaire", "Minibus", "Moto"];
const REGIONS = [
  "Île-de-France", "PACA", "Auvergne-Rhône-Alpes", "Occitanie",
  "Nouvelle-Aquitaine", "Bretagne", "Normandie", "Grand Est",
  "Hauts-de-France", "Pays de la Loire",
];
const QUOTAS = { brevo: 300, resend: 100 };

const CAT_COLORS = {
  Voiture: { bg: "#dbeafe", text: "#1d4ed8" },
  Luxe: { bg: "#fef3c7", text: "#92400e" },
  Utilitaire: { bg: "#d1fae5", text: "#065f46" },
  Minibus: { bg: "#ede9fe", text: "#5b21b6" },
  Moto: { bg: "#fee2e2", text: "#991b1b" },
};

const DEFAULT_TPL = `Bonjour,

Je me permets de vous contacter au sujet de LocPro, une solution de gestion de contrats de location pensée pour les agences comme {NOM_AGENCE}.

En quelques secondes vous pouvez :
• Générer un contrat conforme grâce à l'IA
• Le faire signer électroniquement (eIDAS)
• Envoyer des rappels SMS automatiques
• Piloter votre flotte {CATEGORIE} depuis un tableau de bord

Je serais ravi de vous faire une démo rapide — 15 minutes suffisent.

Bien cordialement,
L'équipe LocPro
https://locpro.fr`;

const personalize = (tpl, a) =>
  tpl
    .replace(/\{NOM_AGENCE\}/g, a.nom)
    .replace(/\{CATEGORIE\}/g, a.categorie.toLowerCase())
    .replace(/\{VILLE\}/g, a.ville)
    .replace(/\{REGION\}/g, a.region);

const todayKey = () => new Date().toISOString().slice(0, 10);
const loadSent = () => {
  try {
    const r = localStorage.getItem("lp_" + todayKey());
    return r ? JSON.parse(r) : { brevo: 0, resend: 0 };
  } catch {
    return { brevo: 0, resend: 0 };
  }
};
const saveSent = (c) => {
  try { localStorage.setItem("lp_" + todayKey(), JSON.stringify(c)); } catch {}
};

function Badge({ cat }) {
  const c = CAT_COLORS[cat] || { bg: "#f3f4f6", text: "#374151" };
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: "2px 9px", borderRadius: 12,
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {cat}
    </span>
  );
}

function QuotaBar({ label, used, max, color }) {
  const pct = Math.min(100, (used / max) * 100);
  const full = used >= max;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: full ? "#dc2626" : color }}>
          {full ? "Quota atteint" : `${max - used} restants`}
        </span>
      </div>
      <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          width: pct + "%", height: "100%",
          background: full ? "#dc2626" : color,
          borderRadius: 4, transition: "width .4s",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{used} envoyés</span>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{max}/jour</span>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: 12, padding: 28, width: 460,
          boxShadow: "0 20px 60px rgba(0,0,0,0.2)", animation: "fadeUp .18s ease",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>{title}</h3>
          <button onClick={onClose} style={styles.iconBtn}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const styles = {
  input: {
    width: "100%", padding: "8px 12px", border: "1px solid #d1d5db",
    borderRadius: 7, fontSize: 13, color: "#111827", background: "#fff",
    outline: "none", boxSizing: "border-box",
  },
  select: {
    padding: "8px 12px", border: "1px solid #d1d5db",
    borderRadius: 7, fontSize: 13, color: "#111827", background: "#fff",
    outline: "none", cursor: "pointer",
  },
  label: { fontSize: 11, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 5, display: "block" },
  btn: {
    padding: "8px 16px", borderRadius: 7, fontSize: 13, fontWeight: 600,
    cursor: "pointer", border: "none", transition: "opacity .15s",
  },
  iconBtn: {
    background: "none", border: "none", cursor: "pointer",
    color: "#9ca3af", fontSize: 16, padding: "2px 6px", borderRadius: 4,
  },
  card: {
    background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, padding: 18,
  },
};

export default function App() {
  const [agencies, setAgencies] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [fCat, setFCat] = useState("Tout");
  const [fReg, setFReg] = useState("Toutes");
  const [fSt, setFSt] = useState("Tous");
  const [tab, setTab] = useState("liste");
  const [subject, setSubject] = useState("Simplifiez vos contrats de location — LocPro");
  const [tpl, setTpl] = useState(DEFAULT_TPL);
  const [senderName, setSenderName] = useState("Équipe LocPro");
  const [senderEmail, setSenderEmail] = useState("prospection@locpro.fr");
  const [brevoKey, setBrevoKey] = useState("");
  const [resendKey, setResendKey] = useState("");
  const [claudeKey, setClaudeKey] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [mode, setMode] = useState("auto");
  const [sentToday, setSentToday] = useState(loadSent);
  const [sending, setSending] = useState(false);
  const [log, setLog] = useState([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newA, setNewA] = useState({ nom: "", email: "", tel: "", ville: "", region: REGIONS[0], categorie: CATEGORIES[0], notes: "" });
  const [importText, setImportText] = useState("");
  const [sortF, setSortF] = useState("nom");
  const [sortD, setSortD] = useState("asc");
  const abortRef = useRef(false);

  const hasBrevo = !!brevoKey.trim();
  const hasResend = !!resendKey.trim();
  const hasClaude = !!claudeKey.trim();
  const hasKey = hasBrevo || hasResend;
  const qBrevo = Math.max(0, QUOTAS.brevo - sentToday.brevo);
  const qResend = Math.max(0, QUOTAS.resend - sentToday.resend);
  const totalQ = (hasBrevo ? qBrevo : 0) + (hasResend ? qResend : 0);

  const filtered = useMemo(() => {
    let list = agencies.filter(a => {
      const q = search.toLowerCase();
      return (
        (!q || a.nom.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.ville.toLowerCase().includes(q)) &&
        (fCat === "Tout" || a.categorie === fCat) &&
        (fReg === "Toutes" || a.region === fReg) &&
        (fSt === "Tous" || (fSt === "Prospecté" ? a.prospecte : !a.prospecte))
      );
    });
    return [...list].sort((a, b) => {
      const va = (a[sortF] || "").toString().toLowerCase();
      const vb = (b[sortF] || "").toString().toLowerCase();
      return sortD === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    });
  }, [agencies, search, fCat, fReg, fSt, sortF, sortD]);

  const selAgencies = agencies.filter(a => selected.has(a.id));
  const toggleSel = id => setSelected(p => { const s = new Set(p); s.has(id) ? s.delete(id) : s.add(id); return s; });
  const toggleAll = () => setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(a => a.id)));
  const toggleProsp = id => setAgencies(p => p.map(a => a.id === id ? { ...a, prospecte: !a.prospecte } : a));
  const delAgency = id => { setAgencies(p => p.filter(a => a.id !== id)); setSelected(p => { const s = new Set(p); s.delete(id); return s; }); };
  const sortBy = f => { if (sortF === f) setSortD(d => d === "asc" ? "desc" : "asc"); else { setSortF(f); setSortD("asc"); } };

  const addAgency = () => {
    if (!newA.nom || !newA.email) return;
    setAgencies(p => [...p, { ...newA, id: Date.now(), prospecte: false }]);
    setNewA({ nom: "", email: "", tel: "", ville: "", region: REGIONS[0], categorie: CATEGORIES[0], notes: "" });
    setShowAdd(false);
  };

  const doImport = () => {
    const added = importText.trim().split("\n").filter(Boolean).map(line => {
      const p = line.split(";").map(x => x.trim());
      if (p.length < 2) return null;
      return {
        id: Date.now() + Math.random(),
        nom: p[0], email: p[1], tel: p[2] || "", ville: p[3] || "",
        region: p[4] || REGIONS[0],
        categorie: CATEGORIES.includes(p[5]) ? p[5] : "Voiture",
        prospecte: false, notes: p[6] || "",
      };
    }).filter(Boolean);
    if (added.length) {
      setAgencies(p => [...p, ...added]);
      setImportText("");
      alert(`${added.length} agence(s) importée(s) avec succès.`);
    }
  };

  const exportCSV = () => {
    const rows = [
      "Nom;Email;Tél;Ville;Région;Catégorie;Prospecté;Notes",
      ...agencies.map(a => `${a.nom};${a.email};${a.tel};${a.ville};${a.region};${a.categorie};${a.prospecte ? "Oui" : "Non"};${a.notes}`),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows], { type: "text/csv" }));
    a.download = "locpro-agences.csv";
    a.click();
  };

  const improveAI = async () => {
    if (!aiPrompt.trim() || !hasClaude) return;
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-opus-4-5", max_tokens: 1000,
          system: "Tu es expert cold email B2B France. Tu écris des emails de prospection pour LocPro (SaaS contrats de location véhicules). Garde TOUJOURS {NOM_AGENCE}, {CATEGORIE}, {VILLE}. Retourne UNIQUEMENT le corps du mail.",
          messages: [{ role: "user", content: `Instruction: ${aiPrompt}\n\nMail actuel:\n${tpl}\n\nRéécris.` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || "";
      if (text) setTpl(text);
      else alert("Réponse vide de Claude.");
    } catch {
      alert("Erreur API Claude. Vérifiez votre clé.");
    }
    setAiLoading(false);
  };

  const sendViaBrevo = async (agency, subj, body) => {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": brevoKey },
      body: JSON.stringify({ sender: { name: senderName, email: senderEmail }, to: [{ email: agency.email, name: agency.nom }], subject: subj, textContent: body }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Erreur Brevo"); }
  };

  const sendViaResend = async (agency, subj, body) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: `${senderName} <${senderEmail}>`, to: [agency.email], subject: subj, text: body }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Erreur Resend"); }
  };

  const handleSend = async () => {
    if (!selAgencies.length || !hasKey) return;
    setSending(true); setDone(false); setLog([]); setProgress(0); abortRef.current = false;
    const newLog = [];
    let local = { ...sentToday };
    let idx = 0;

    for (const agency of selAgencies) {
      if (abortRef.current) { newLog.push({ nom: agency.nom, status: "annulé", provider: "-" }); continue; }
      const body = personalize(tpl, agency);
      let provider = null;

      if (mode === "brevo" && hasBrevo && local.brevo < QUOTAS.brevo) provider = "brevo";
      else if (mode === "resend" && hasResend && local.resend < QUOTAS.resend) provider = "resend";
      else if (mode === "auto") {
        if (hasBrevo && local.brevo < QUOTAS.brevo) provider = "brevo";
        else if (hasResend && local.resend < QUOTAS.resend) provider = "resend";
      }

      if (!provider) {
        newLog.push({ nom: agency.nom, email: agency.email, status: "quota_atteint", provider: "-" });
      } else {
        try {
          if (provider === "brevo") { await sendViaBrevo(agency, subject, body); local.brevo++; }
          else { await sendViaResend(agency, subject, body); local.resend++; }
          newLog.push({ nom: agency.nom, email: agency.email, status: "envoyé", provider });
          setAgencies(p => p.map(a => a.id === agency.id ? { ...a, prospecte: true } : a));
        } catch (err) {
          newLog.push({ nom: agency.nom, email: agency.email, status: "erreur", provider, error: err.message });
        }
      }
      idx++;
      setProgress(Math.round((idx / selAgencies.length) * 100));
      setLog([...newLog]);
      saveSent(local);
      setSentToday({ ...local });
      await new Promise(r => setTimeout(r, 250));
    }
    setSending(false); setDone(true); setSelected(new Set());
  };

  const stats = {
    total: agencies.length,
    done: agencies.filter(a => a.prospecte).length,
    todo: agencies.filter(a => !a.prospecte).length,
    sel: selected.size,
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", color: "#111827", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, textarea, select { outline: none; font-family: inherit; }
        button { cursor: pointer; font-family: inherit; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #f3f4f6; }
        ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        .row-hover:hover { background: #f9fafb !important; }
        .col-sort:hover { color: #6366f1; cursor: pointer; }
        .btn-hover:hover { opacity: 0.85; }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder, textarea::placeholder { color: #9ca3af; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 58 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #6366f1, #8b5cf6)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#111827", letterSpacing: "-0.02em" }}>LocPro CRM</div>
            <div style={{ fontSize: 11, color: "#9ca3af" }}>Prospection agences de location · France</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="btn-hover"
            style={{
              ...styles.btn,
              background: hasKey ? "#f0fdf4" : "#fef3c7",
              color: hasKey ? "#16a34a" : "#92400e",
              border: `1px solid ${hasKey ? "#bbf7d0" : "#fde68a"}`,
              fontSize: 12,
            }}
          >
            {hasKey ? "✓ APIs configurées" : "⚙ Configurer les APIs"}
          </button>
          <button onClick={exportCSV} className="btn-hover" style={{ ...styles.btn, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", fontSize: 12 }}>
            ↓ Export CSV
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-hover" style={{ ...styles.btn, background: "#6366f1", color: "#fff", fontSize: 12 }}>
            + Nouvelle agence
          </button>
        </div>
      </header>

      {/* ── PANEL CONFIG APIs ── */}
      {showConfig && (
        <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "20px 24px", animation: "fadeUp .18s ease" }}>
          <div style={{ maxWidth: 900 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 16 }}>Configuration des APIs</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={styles.label}>
                  Brevo — <span style={{ color: "#16a34a", fontWeight: 700 }}>300 emails/jour gratuit</span>
                  {" · "}<a href="https://app.brevo.com/settings/keys/api" target="_blank" style={{ color: "#6366f1" }}>Créer une clé ↗</a>
                </label>
                <input type="password" value={brevoKey} onChange={e => setBrevoKey(e.target.value)} placeholder="xkeysib-..." style={{ ...styles.input, borderColor: hasBrevo ? "#86efac" : "#d1d5db" }} />
              </div>
              <div>
                <label style={styles.label}>
                  Resend — <span style={{ color: "#6366f1", fontWeight: 700 }}>100 emails/jour gratuit</span>
                  {" · "}<a href="https://resend.com/api-keys" target="_blank" style={{ color: "#6366f1" }}>Créer une clé ↗</a>
                </label>
                <input type="password" value={resendKey} onChange={e => setResendKey(e.target.value)} placeholder="re_..." style={{ ...styles.input, borderColor: hasResend ? "#86efac" : "#d1d5db" }} />
              </div>
              <div>
                <label style={styles.label}>
                  Claude (Anthropic) — IA de réécriture
                  {" · "}<a href="https://console.anthropic.com/settings/keys" target="_blank" style={{ color: "#6366f1" }}>Créer une clé ↗</a>
                </label>
                <input type="password" value={claudeKey} onChange={e => setClaudeKey(e.target.value)} placeholder="sk-ant-..." style={{ ...styles.input, borderColor: hasClaude ? "#86efac" : "#d1d5db" }} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <div>
                <label style={styles.label}>Nom expéditeur</label>
                <input value={senderName} onChange={e => setSenderName(e.target.value)} style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Email expéditeur <span style={{ color: "#9ca3af" }}>(vérifié dans Brevo/Resend)</span></label>
                <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>Mode d'envoi</label>
                <select value={mode} onChange={e => setMode(e.target.value)} style={{ ...styles.select, width: "100%" }}>
                  <option value="auto">Rotation automatique (Brevo → Resend)</option>
                  <option value="brevo">Brevo uniquement</option>
                  <option value="resend">Resend uniquement</option>
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 20, alignItems: "end" }}>
              <QuotaBar label="Brevo" used={sentToday.brevo} max={QUOTAS.brevo} color="#16a34a" />
              <QuotaBar label="Resend" used={sentToday.resend} max={QUOTAS.resend} color="#6366f1" />
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 2 }}>Total disponible aujourd'hui</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: totalQ > 0 ? "#6366f1" : "#dc2626", lineHeight: 1 }}>
                  {totalQ} <span style={{ fontSize: 14, color: "#9ca3af", fontWeight: 400 }}>emails</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STAT PILLS ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 24px", display: "flex", gap: 20, alignItems: "center" }}>
        {[
          { label: "Total", value: stats.total, color: "#6b7280" },
          { label: "À contacter", value: stats.todo, color: "#dc2626" },
          { label: "Prospectés", value: stats.done, color: "#16a34a" },
          { label: "Sélectionnés", value: stats.sel, color: "#6366f1" },
        ].map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</span>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</span>
          </div>
        ))}
        {stats.total > 0 && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 100, height: 5, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${(stats.done / stats.total) * 100}%`, height: "100%", background: "#6366f1", borderRadius: 3, transition: "width .4s" }} />
            </div>
            <span style={{ fontSize: 12, color: "#6b7280" }}>{Math.round((stats.done / stats.total) * 100)}% prospecté</span>
          </div>
        )}
      </div>

      {/* ── TABS ── */}
      <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 24px", display: "flex", gap: 4 }}>
        {[["liste", "Base Agences"], ["mail", "Campagne Email"], ["import", "Import & Sources"]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              background: "none", border: "none", padding: "13px 14px", fontSize: 13, fontWeight: tab === k ? 700 : 500,
              color: tab === k ? "#6366f1" : "#6b7280",
              borderBottom: tab === k ? "2px solid #6366f1" : "2px solid transparent",
              transition: "all .15s",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {/* ══════════════════════ TAB: LISTE ══════════════════════ */}
      {tab === "liste" && (
        <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 185px)" }}>
          {/* Filtres */}
          <div style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "10px 24px", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une agence…"
              style={{ ...styles.input, width: 200 }}
            />
            <select value={fCat} onChange={e => setFCat(e.target.value)} style={styles.select}>
              {["Tout", ...CATEGORIES].map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={fReg} onChange={e => setFReg(e.target.value)} style={styles.select}>
              {["Toutes", ...REGIONS].map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={fSt} onChange={e => setFSt(e.target.value)} style={styles.select}>
              {["Tous", "Non prospecté", "Prospecté"].map(o => <option key={o}>{o}</option>)}
            </select>
            <button
              onClick={() => setSelected(new Set(filtered.filter(a => !a.prospecte).map(a => a.id)))}
              className="btn-hover"
              style={{ ...styles.btn, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151", fontSize: 12 }}
            >
              Sélect. non prospectés
            </button>
            {selected.size > 0 && (
              <button
                onClick={() => setTab("mail")}
                className="btn-hover"
                style={{ ...styles.btn, marginLeft: "auto", background: "#6366f1", color: "#fff", fontSize: 12 }}
              >
                ✉ Lancer une campagne ({selected.size})
              </button>
            )}
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: "auto", padding: "0 24px 24px" }}>
            {agencies.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, color: "#9ca3af" }}>
                <div style={{ fontSize: 48 }}>🏢</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "#374151" }}>Aucune agence pour l'instant</div>
                <div style={{ fontSize: 13 }}>Ajoutez une agence manuellement ou importez un fichier CSV.</div>
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button onClick={() => setShowAdd(true)} className="btn-hover" style={{ ...styles.btn, background: "#6366f1", color: "#fff" }}>+ Nouvelle agence</button>
                  <button onClick={() => setTab("import")} className="btn-hover" style={{ ...styles.btn, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151" }}>Importer un CSV</button>
                </div>
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                    <th style={{ padding: "8px 10px", width: 32 }}>
                      <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ accentColor: "#6366f1" }} />
                    </th>
                    {[["nom", "Agence"], ["categorie", "Type"], ["ville", "Ville"], ["region", "Région"], ["email", "Email"], ["tel", "Téléphone"]].map(([f, l]) => (
                      <th
                        key={f}
                        className="col-sort"
                        onClick={() => sortBy(f)}
                        style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12, whiteSpace: "nowrap" }}
                      >
                        {l} {sortF === f ? (sortD === "asc" ? "↑" : "↓") : ""}
                      </th>
                    ))}
                    <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12 }}>Statut</th>
                    <th style={{ width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr
                      key={a.id}
                      className="row-hover"
                      style={{ borderBottom: "1px solid #f3f4f6", background: selected.has(a.id) ? "#eef2ff" : "#fff" }}
                    >
                      <td style={{ padding: "10px 10px" }}>
                        <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSel(a.id)} style={{ accentColor: "#6366f1" }} />
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 600, color: "#111827" }}>{a.nom}</td>
                      <td style={{ padding: "10px 12px" }}><Badge cat={a.categorie} /></td>
                      <td style={{ padding: "10px 12px", color: "#374151" }}>{a.ville}</td>
                      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 12 }}>{a.region}</td>
                      <td style={{ padding: "10px 12px", color: "#6366f1", fontSize: 12 }}>{a.email}</td>
                      <td style={{ padding: "10px 12px", color: "#6b7280", fontSize: 12 }}>{a.tel}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <button
                          onClick={() => toggleProsp(a.id)}
                          style={{
                            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: "pointer",
                            background: a.prospecte ? "#f0fdf4" : "#fef2f2",
                            color: a.prospecte ? "#16a34a" : "#dc2626",
                            border: `1px solid ${a.prospecte ? "#bbf7d0" : "#fecaca"}`,
                          }}
                        >
                          {a.prospecte ? "✓ Prospecté" : "À contacter"}
                        </button>
                      </td>
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        <button
                          onClick={() => delAgency(a.id)}
                          style={{ background: "none", border: "none", color: "#d1d5db", fontSize: 14, cursor: "pointer" }}
                          onMouseEnter={e => e.target.style.color = "#dc2626"}
                          onMouseLeave={e => e.target.style.color = "#d1d5db"}
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {agencies.length > 0 && filtered.length === 0 && (
              <div style={{ textAlign: "center", color: "#9ca3af", padding: "48px 0", fontSize: 13 }}>
                Aucune agence ne correspond aux filtres.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════ TAB: MAIL ══════════════════════ */}
      {tab === "mail" && (
        <div style={{ flex: 1, overflow: "auto", padding: "20px 24px", display: "flex", gap: 20, height: "calc(100vh - 185px)" }}>
          {/* Colonne gauche */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 14, overflow: "auto" }}>
            <div style={styles.card}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 14 }}>Modèle d'email</div>
              <div style={{ marginBottom: 12 }}>
                <label style={styles.label}>Objet de l'email</label>
                <input value={subject} onChange={e => setSubject(e.target.value)} style={styles.input} />
              </div>
              <div>
                <label style={styles.label}>
                  Corps —{" "}
                  <span style={{ color: "#6366f1" }}>{"{NOM_AGENCE}"}</span>{" · "}
                  <span style={{ color: "#16a34a" }}>{"{CATEGORIE}"}</span>{" · "}
                  <span style={{ color: "#f59e0b" }}>{"{VILLE}"}</span>
                </label>
                <textarea
                  value={tpl} onChange={e => setTpl(e.target.value)}
                  rows={12}
                  style={{ ...styles.input, lineHeight: 1.7, resize: "vertical", fontFamily: "monospace", fontSize: 12 }}
                />
              </div>
            </div>

            {/* IA */}
            <div style={{ ...styles.card, borderColor: hasClaude ? "#e0e7ff" : "#e5e7eb" }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#111827", marginBottom: 10 }}>
                ✨ Réécrire avec l'IA (Claude)
                {!hasClaude && <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 400, marginLeft: 8 }}>— Clé API requise dans la config</span>}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  value={aiPrompt} onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && improveAI()}
                  placeholder='Ex : "plus court", "ton urgent", "ajouter une offre démo gratuite"…'
                  disabled={!hasClaude}
                  style={{ ...styles.input, flex: 1 }}
                />
                <button
                  onClick={improveAI}
                  disabled={aiLoading || !hasClaude || !aiPrompt.trim()}
                  className="btn-hover"
                  style={{ ...styles.btn, background: hasClaude && aiPrompt.trim() && !aiLoading ? "#6366f1" : "#e5e7eb", color: hasClaude && aiPrompt.trim() && !aiLoading ? "#fff" : "#9ca3af", whiteSpace: "nowrap" }}
                >
                  {aiLoading ? <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>↻</span> : "Générer"}
                </button>
              </div>
            </div>

            {selAgencies.length > 0 && (
              <div style={{ ...styles.card, borderColor: "#d1fae5", background: "#f0fdf4" }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 8 }}>Aperçu pour {selAgencies[0].nom}</div>
                <pre style={{ fontSize: 12, color: "#065f46", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 160, overflow: "auto", fontFamily: "system-ui, sans-serif" }}>
                  {personalize(tpl, selAgencies[0])}
                </pre>
              </div>
            )}
          </div>

          {/* Colonne droite */}
          <div style={{ width: 270, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={styles.card}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 12 }}>Quota aujourd'hui</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <QuotaBar label="Brevo" used={sentToday.brevo} max={QUOTAS.brevo} color="#16a34a" />
                <QuotaBar label="Resend" used={sentToday.resend} max={QUOTAS.resend} color="#6366f1" />
              </div>
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "#6b7280" }}>Total restant</span>
                <span style={{ fontSize: 28, fontWeight: 800, color: totalQ > 0 ? "#6366f1" : "#dc2626" }}>{totalQ}</span>
              </div>
            </div>

            <div style={{ ...styles.card, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#374151", marginBottom: 10 }}>
                Destinataires {selected.size > 0 ? `(${selected.size})` : ""}
              </div>
              {!selected.size ? (
                <div style={{ color: "#9ca3af", fontSize: 12, textAlign: "center", padding: "20px 0", lineHeight: 1.7 }}>
                  Aucune agence sélectionnée.<br />
                  <span style={{ color: "#6366f1", cursor: "pointer" }} onClick={() => setTab("liste")}>→ Aller à la liste</span>
                </div>
              ) : (
                <div style={{ maxHeight: 200, overflow: "auto", display: "flex", flexDirection: "column", gap: 5 }}>
                  {selAgencies.map(a => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "#f9fafb", borderRadius: 6 }}>
                      <Badge cat={a.categorie} />
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#111827", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nom}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !selected.size || !hasKey}
              className="btn-hover"
              style={{
                ...styles.btn, padding: "13px", fontSize: 14, fontWeight: 700,
                background: selected.size && hasKey && !sending ? "#6366f1" : "#e5e7eb",
                color: selected.size && hasKey && !sending ? "#fff" : "#9ca3af",
              }}
            >
              {sending ? `Envoi en cours… ${progress}%` : `Envoyer${selected.size ? ` (${selected.size})` : ""}`}
            </button>

            {sending && (
              <div style={{ height: 6, background: "#e5e7eb", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: progress + "%", height: "100%", background: "#6366f1", borderRadius: 4, transition: "width .3s" }} />
              </div>
            )}

            {log.length > 0 && (
              <div style={{ ...styles.card, maxHeight: 220, overflow: "auto" }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: "#374151", marginBottom: 8 }}>
                  {done ? "Résultats" : "En cours…"}
                </div>
                {log.map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 0", borderBottom: "1px solid #f3f4f6", fontSize: 12 }}>
                    <span style={{ color: l.status === "envoyé" ? "#16a34a" : l.status === "quota_atteint" ? "#f59e0b" : "#dc2626", fontWeight: 700 }}>
                      {l.status === "envoyé" ? "✓" : l.status === "quota_atteint" ? "⏸" : "✕"}
                    </span>
                    <span style={{ flex: 1, color: "#374151", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.nom}</span>
                    <span style={{ fontSize: 10, color: "#9ca3af" }}>{l.provider !== "-" ? l.provider : l.status}</span>
                  </div>
                ))}
                {done && (
                  <div style={{ marginTop: 8, fontSize: 11, color: "#6b7280", display: "flex", gap: 10 }}>
                    <span style={{ color: "#16a34a" }}>{log.filter(l => l.status === "envoyé").length} envoyés</span>
                    <span style={{ color: "#dc2626" }}>{log.filter(l => l.status === "erreur").length} erreurs</span>
                    <span style={{ color: "#f59e0b" }}>{log.filter(l => l.status === "quota_atteint").length} quota</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════ TAB: IMPORT ══════════════════════ */}
      {tab === "import" && (
        <div style={{ overflow: "auto", padding: "20px 24px", height: "calc(100vh - 185px)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 960 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 14 }}>Importer un CSV</div>
              <div style={{ ...styles.card, marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#374151", marginBottom: 8, fontWeight: 600 }}>Format attendu (séparateur <code style={{ background: "#f3f4f6", padding: "1px 4px", borderRadius: 3 }}>;</code>)</div>
                <code style={{ display: "block", background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 6, padding: "10px 12px", fontSize: 11, color: "#374151", lineHeight: 1.8 }}>
                  Nom;email;téléphone;ville;région;catégorie<br />
                  <span style={{ color: "#9ca3af" }}>AutoLoc Paris;contact@autoloc.fr;01 42 00 00 00;Paris;Île-de-France;Voiture</span>
                </code>
                <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                  Catégories acceptées : {CATEGORIES.join(", ")}
                </div>
              </div>
              <textarea
                value={importText} onChange={e => setImportText(e.target.value)}
                rows={10}
                placeholder={"AutoLoc Paris;contact@autoloc.fr;01 42 00 00 00;Paris;Île-de-France;Voiture\nLuxury Drive Cannes;booking@luxurydrive.com;04 93 12 34 56;Cannes;PACA;Luxe"}
                style={{ ...styles.input, lineHeight: 1.7, resize: "vertical", fontFamily: "monospace", fontSize: 12, marginBottom: 10 }}
              />
              <button
                onClick={doImport}
                disabled={!importText.trim()}
                className="btn-hover"
                style={{ ...styles.btn, background: importText.trim() ? "#6366f1" : "#e5e7eb", color: importText.trim() ? "#fff" : "#9ca3af" }}
              >
                Importer les agences
              </button>
            </div>

            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#111827", marginBottom: 14 }}>Où trouver des agences</div>
              {[
                { t: "Pappers.fr / Societe.com", d: "Code NAF 7711Z (voitures), 7712Z (utilitaires) → export CSV gratuit avec emails.", color: "#16a34a" },
                { t: "Google Maps + Outscraper", d: '"agence location voiture [ville]" → Outscraper.com extrait nom / tél / email automatiquement.', color: "#6366f1" },
                { t: "Pages Jaunes + Apify", d: '"Location de véhicules" → acteur Apify Pages Jaunes → export CSV/Excel direct.', color: "#f59e0b" },
                { t: "LinkedIn Sales Navigator", d: '"Location de véhicules" + France → export via Phantombuster ou Evaboot.', color: "#8b5cf6" },
                { t: "INPI / Data.gouv.fr (SIRENE)", d: "Base officielle de toutes les entreprises françaises, filtrable par code NAF — 100% gratuit.", color: "#dc2626" },
              ].map(s => (
                <div key={s.t} style={{ ...styles.card, marginBottom: 10, borderLeft: `4px solid ${s.color}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", marginBottom: 4 }}>{s.t}</div>
                  <div style={{ fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════ MODAL: AJOUT ══════════════════════ */}
      {showAdd && (
        <Modal title="Nouvelle agence" onClose={() => setShowAdd(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["nom", "Nom *"], ["email", "Email *"], ["tel", "Téléphone"], ["ville", "Ville"]].map(([f, l]) => (
              <div key={f}>
                <label style={styles.label}>{l}</label>
                <input
                  value={newA[f]}
                  onChange={e => setNewA(p => ({ ...p, [f]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addAgency()}
                  style={styles.input}
                />
              </div>
            ))}
            {[["region", "Région", REGIONS], ["categorie", "Catégorie", CATEGORIES]].map(([f, l, opts]) => (
              <div key={f}>
                <label style={styles.label}>{l}</label>
                <select value={newA[f]} onChange={e => setNewA(p => ({ ...p, [f]: e.target.value }))} style={{ ...styles.select, width: "100%" }}>
                  {opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={styles.label}>Notes</label>
            <textarea
              value={newA.notes}
              onChange={e => setNewA(p => ({ ...p, notes: e.target.value }))}
              rows={2}
              style={{ ...styles.input, resize: "none" }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
            <button onClick={() => setShowAdd(false)} className="btn-hover" style={{ ...styles.btn, background: "#f9fafb", border: "1px solid #e5e7eb", color: "#374151" }}>
              Annuler
            </button>
            <button onClick={addAgency} disabled={!newA.nom || !newA.email} className="btn-hover" style={{ ...styles.btn, background: newA.nom && newA.email ? "#6366f1" : "#e5e7eb", color: newA.nom && newA.email ? "#fff" : "#9ca3af" }}>
              Ajouter l'agence
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

import { useState, useMemo, useRef } from "react";

const CATEGORIES = ["Voiture", "Luxe", "Utilitaire", "Minibus", "Moto"];
const REGIONS = ["Île-de-France", "PACA", "Auvergne-Rhône-Alpes", "Occitanie", "Nouvelle-Aquitaine", "Bretagne", "Normandie", "Grand Est", "Hauts-de-France", "Pays de la Loire"];
const QUOTAS = { brevo: 300, resend: 100 };

const SAMPLE = [
  { id: 1, nom: "AutoLoc Paris 8", email: "contact@autoloc-paris8.fr", tel: "01 42 56 78 90", ville: "Paris", region: "Île-de-France", categorie: "Voiture", prospecte: false, notes: "" },
  { id: 2, nom: "Luxury Drive Cannes", email: "booking@luxurydrive-cannes.com", tel: "04 93 12 34 56", ville: "Cannes", region: "PACA", categorie: "Luxe", prospecte: false, notes: "" },
  { id: 3, nom: "UtilPro Lyon", email: "info@utilpro-lyon.fr", tel: "04 72 33 44 55", ville: "Lyon", region: "Auvergne-Rhône-Alpes", categorie: "Utilitaire", prospecte: true, notes: "Intéressé" },
  { id: 4, nom: "TransVan Marseille", email: "contact@transvan13.fr", tel: "04 91 22 33 44", ville: "Marseille", region: "PACA", categorie: "Minibus", prospecte: false, notes: "" },
  { id: 5, nom: "Elite Cars Monaco", email: "reservation@elitecars.mc", tel: "04 93 98 00 11", ville: "Monaco", region: "PACA", categorie: "Luxe", prospecte: false, notes: "" },
  { id: 6, nom: "RentEasy Toulouse", email: "hello@renteasy-tlse.fr", tel: "05 61 77 88 99", ville: "Toulouse", region: "Occitanie", categorie: "Voiture", prospecte: true, notes: "" },
  { id: 7, nom: "MegaLoc Bordeaux", email: "pro@megaloc33.com", tel: "05 56 12 23 34", ville: "Bordeaux", region: "Nouvelle-Aquitaine", categorie: "Utilitaire", prospecte: false, notes: "" },
  { id: 8, nom: "Prestige Drive Paris", email: "vip@prestige-drive.fr", tel: "01 44 55 66 77", ville: "Paris", region: "Île-de-France", categorie: "Luxe", prospecte: false, notes: "" },
  { id: 9, nom: "BusLoc Lille", email: "contact@busloc59.fr", tel: "03 20 11 22 33", ville: "Lille", region: "Hauts-de-France", categorie: "Minibus", prospecte: false, notes: "" },
  { id: 10, nom: "CarGo Nantes", email: "devis@cargo-nantes.fr", tel: "02 40 88 77 66", ville: "Nantes", region: "Pays de la Loire", categorie: "Utilitaire", prospecte: false, notes: "" },
];

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
  tpl.replace(/\{NOM_AGENCE\}/g, a.nom).replace(/\{CATEGORIE\}/g, a.categorie.toLowerCase()).replace(/\{VILLE\}/g, a.ville).replace(/\{REGION\}/g, a.region);

const todayKey = () => new Date().toISOString().slice(0, 10);
const loadSent = () => { try { const r = localStorage.getItem("lp_" + todayKey()); return r ? JSON.parse(r) : { brevo: 0, resend: 0 }; } catch { return { brevo: 0, resend: 0 }; } };
const saveSent = (c) => { try { localStorage.setItem("lp_" + todayKey(), JSON.stringify(c)); } catch {} };

const Badge = ({ cat }) => {
  const C = { Voiture: "#3b82f6", Luxe: "#d4a853", Utilitaire: "#10b981", Minibus: "#8b5cf6", Moto: "#ef4444" }[cat] || "#666";
  return <span style={{ background: C + "20", color: C, border: `1px solid ${C}40`, padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", whiteSpace: "nowrap" }}>{cat}</span>;
};

const QBar = ({ label, used, max, color }) => {
  const pct = Math.min(100, (used / max) * 100);
  return (
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: "#666" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: used >= max ? "#ef4444" : color }}>{used >= max ? "PLEIN" : `${max - used} dispo`}</span>
      </div>
      <div style={{ height: 5, background: "#1a1a28", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: pct + "%", height: "100%", background: pct >= 100 ? "#ef4444" : color, borderRadius: 3, transition: "width .4s" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
        <span style={{ fontSize: 9, color: "#2a2a38" }}>{used} envoyés</span>
        <span style={{ fontSize: 9, color: "#2a2a38" }}>{max}/jour</span>
      </div>
    </div>
  );
};

export default function App() {
  const [agencies, setAgencies] = useState(SAMPLE);
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
  const [showKeys, setShowKeys] = useState(false);
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
  const hasKey = hasBrevo || hasResend;
  const qBrevo = Math.max(0, QUOTAS.brevo - sentToday.brevo);
  const qResend = Math.max(0, QUOTAS.resend - sentToday.resend);
  const totalQ = (hasBrevo ? qBrevo : 0) + (hasResend ? qResend : 0);

  const filtered = useMemo(() => {
    let list = agencies.filter(a => {
      const q = search.toLowerCase();
      return (!q || a.nom.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.ville.toLowerCase().includes(q))
        && (fCat === "Tout" || a.categorie === fCat)
        && (fReg === "Toutes" || a.region === fReg)
        && (fSt === "Tous" || (fSt === "Prospecté" ? a.prospecte : !a.prospecte));
    });
    return [...list].sort((a, b) => {
      const va = (a[sortF] || "").toString().toLowerCase(), vb = (b[sortF] || "").toString().toLowerCase();
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
      return p.length >= 2 ? { id: Date.now() + Math.random(), nom: p[0], email: p[1], tel: p[2] || "", ville: p[3] || "", region: p[4] || REGIONS[0], categorie: CATEGORIES.includes(p[5]) ? p[5] : "Voiture", prospecte: false, notes: p[6] || "" } : null;
    }).filter(Boolean);
    if (added.length) { setAgencies(p => [...p, ...added]); setImportText(""); alert(`✅ ${added.length} agences importées !`); }
  };

  const exportCSV = () => {
    const rows = ["Nom;Email;Tél;Ville;Région;Catégorie;Prospecté;Notes", ...agencies.map(a => `${a.nom};${a.email};${a.tel};${a.ville};${a.region};${a.categorie};${a.prospecte ? "Oui" : "Non"};${a.notes}`)].join("\n");
    const link = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([rows], { type: "text/csv" })), download: "locpro-agences.csv" });
    link.click();
  };

  const improveAI = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: "Tu es expert cold email B2B France. Tu écris des emails de prospection pour LocPro (SaaS contrats de location véhicules). Garde TOUJOURS {NOM_AGENCE}, {CATEGORIE}, {VILLE}. Retourne UNIQUEMENT le corps du mail.",
          messages: [{ role: "user", content: `Instruction: ${aiPrompt}\n\nMail actuel:\n${tpl}\n\nRéécris.` }],
        }),
      });
      const data = await res.json();
      const text = data.content?.map(c => c.text || "").join("") || "";
      if (text) setTpl(text);
    } catch { alert("Erreur API Claude"); }
    setAiLoading(false);
  };

  const sendViaBrevo = async (agency, subj, body) => {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": brevoKey },
      body: JSON.stringify({ sender: { name: senderName, email: senderEmail }, to: [{ email: agency.email, name: agency.nom }], subject: subj, textContent: body }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Brevo error"); }
  };

  const sendViaResend = async (agency, subj, body) => {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
      body: JSON.stringify({ from: `${senderName} <${senderEmail}>`, to: [agency.email], subject: subj, text: body }),
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.message || "Resend error"); }
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

  const stats = { total: agencies.length, done: agencies.filter(a => a.prospecte).length, todo: agencies.filter(a => !a.prospecte).length, sel: selected.size };

  return (
    <div style={{ minHeight: "100vh", background: "#080810", color: "#e0dbd2", fontFamily: "'DM Mono',monospace", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Syne:wght@700;800&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#0c0c16}::-webkit-scrollbar-thumb{background:#22222e;border-radius:3px}
        input,textarea,select{outline:none;font-family:inherit}button{cursor:pointer;font-family:inherit}
        .rh:hover{background:#0f0f1c!important}.th:hover{color:#d4a853;cursor:pointer}.ab:hover{opacity:.75}
        @keyframes slideIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
        input::placeholder,textarea::placeholder{color:#25252e}
      `}</style>

      {/* HEADER */}
      <div style={{ background: "#0b0b14", borderBottom: "1px solid #16162a", padding: "13px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 32, height: 32, background: "linear-gradient(135deg,#d4a853,#7a5215)", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}>⚡</div>
          <div>
            <div style={{ fontFamily: "Syne,sans-serif", fontWeight: 800, fontSize: 16, color: "#d4a853", letterSpacing: "-0.02em" }}>LOCPRO</div>
            <div style={{ fontSize: 9, color: "#2a2a3a", letterSpacing: "0.12em", textTransform: "uppercase" }}>CRM · Prospection Agences France</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowKeys(!showKeys)} className="ab" style={{ background: hasKey ? "#0a160a" : "#160a0a", border: `1px solid ${hasKey ? "#10b98133" : "#ef444433"}`, color: hasKey ? "#10b981" : "#ef4444", padding: "5px 12px", borderRadius: 6, fontSize: 10 }}>
            {hasKey ? "🔑 APIs OK" : "⚠️ Config APIs"}
          </button>
          <button onClick={exportCSV} className="ab" style={{ background: "#111", border: "1px solid #1c1c28", color: "#777", padding: "5px 11px", borderRadius: 6, fontSize: 10 }}>↓ CSV</button>
          <button onClick={() => setShowAdd(true)} className="ab" style={{ background: "#d4a853", border: "none", color: "#080810", padding: "5px 14px", borderRadius: 6, fontSize: 10, fontWeight: 700 }}>+ Agence</button>
        </div>
      </div>

      {/* PANEL APIS */}
      {showKeys && (
        <div style={{ background: "#0a0a16", borderBottom: "1px solid #16162a", padding: "16px 22px", animation: "slideIn .2s ease" }}>
          <div style={{ fontSize: 10, color: "#d4a853", fontWeight: 600, marginBottom: 12, letterSpacing: "0.08em" }}>🔑 CONFIGURATION APIS</div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 5 }}>
                BREVO · <span style={{ color: "#10b981" }}>300/jour gratuit</span> · <a href="https://app.brevo.com/settings/keys/api" target="_blank" style={{ color: "#5a8fd4", textDecoration: "none" }}>Créer clé ↗</a>
              </div>
              <input type="password" value={brevoKey} onChange={e => setBrevoKey(e.target.value)} placeholder="xkeysib-..." style={{ width: "100%", background: "#0d0d18", border: `1px solid ${hasBrevo ? "#10b98155" : "#1c1c28"}`, color: "#ddd", padding: "7px 11px", borderRadius: 6, fontSize: 11 }} />
            </div>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 5 }}>
                RESEND · <span style={{ color: "#5a8fd4" }}>100/jour gratuit</span> · <a href="https://resend.com/api-keys" target="_blank" style={{ color: "#5a8fd4", textDecoration: "none" }}>Créer clé ↗</a>
              </div>
              <input type="password" value={resendKey} onChange={e => setResendKey(e.target.value)} placeholder="re_..." style={{ width: "100%", background: "#0d0d18", border: `1px solid ${hasResend ? "#5a8fd455" : "#1c1c28"}`, color: "#ddd", padding: "7px 11px", borderRadius: 6, fontSize: 11 }} />
            </div>
            <div style={{ minWidth: 170 }}>
              <div style={{ fontSize: 9, color: "#444", letterSpacing: "0.1em", marginBottom: 5 }}>MODE D'ENVOI</div>
              <select value={mode} onChange={e => setMode(e.target.value)} style={{ width: "100%", background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "7px 10px", borderRadius: 6, fontSize: 11 }}>
                <option value="auto">🔄 Rotation auto (Brevo→Resend)</option>
                <option value="brevo">Brevo uniquement</option>
                <option value="resend">Resend uniquement</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#444", marginBottom: 5, letterSpacing: "0.1em" }}>NOM EXPÉDITEUR</div>
              <input value={senderName} onChange={e => setSenderName(e.target.value)} style={{ width: "100%", background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "6px 11px", borderRadius: 6, fontSize: 11 }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: "#444", marginBottom: 5, letterSpacing: "0.1em" }}>EMAIL EXPÉDITEUR <span style={{ color: "#333" }}>(vérifié dans Brevo/Resend)</span></div>
              <input value={senderEmail} onChange={e => setSenderEmail(e.target.value)} style={{ width: "100%", background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "6px 11px", borderRadius: 6, fontSize: 11 }} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 14, alignItems: "center" }}>
            <QBar label="BREVO" used={sentToday.brevo} max={QUOTAS.brevo} color="#10b981" />
            <QBar label="RESEND" used={sentToday.resend} max={QUOTAS.resend} color="#5a8fd4" />
            <div style={{ minWidth: 150, textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#555" }}>Total disponible aujourd'hui</div>
              <div style={{ fontSize: 26, fontFamily: "Syne,sans-serif", fontWeight: 800, color: totalQ > 0 ? "#d4a853" : "#ef4444", lineHeight: 1.1 }}>{totalQ} <span style={{ fontSize: 11, color: "#444" }}>mails</span></div>
              <div style={{ fontSize: 9, color: "#2a2a38", marginTop: 2 }}>Plans payants → jusqu'à 20k/mois</div>
            </div>
          </div>
        </div>
      )}

      {/* STATS */}
      <div style={{ background: "#0b0b14", borderBottom: "1px solid #12122a", padding: "8px 22px", display: "flex", gap: 22, alignItems: "center" }}>
        {[{ l: "Total", v: stats.total, c: "#777" }, { l: "À prospecter", v: stats.todo, c: "#ef4444" }, { l: "Prospecté", v: stats.done, c: "#10b981" }, { l: "Sélectionné", v: stats.sel, c: "#d4a853" }].map(s => (
          <div key={s.l} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 18, fontFamily: "Syne,sans-serif", fontWeight: 800, color: s.c }}>{s.v}</span>
            <span style={{ fontSize: 9, color: "#2a2a38", textTransform: "uppercase", letterSpacing: "0.09em" }}>{s.l}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 7, alignItems: "center" }}>
          <div style={{ width: 90, height: 3, background: "#121220", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ width: `${stats.total ? (stats.done / stats.total) * 100 : 0}%`, height: "100%", background: "linear-gradient(90deg,#d4a853,#10b981)", transition: "width .4s" }} />
          </div>
          <span style={{ fontSize: 9, color: "#333" }}>{stats.total ? Math.round((stats.done / stats.total) * 100) : 0}%</span>
        </div>
      </div>

      {/* TABS */}
      <div style={{ borderBottom: "1px solid #12122a", padding: "0 22px", display: "flex" }}>
        {[["liste", "📋 Base Agences"], ["mail", "✉️ Campagne Mail"], ["import", "📥 Import / Guide"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ background: "transparent", border: "none", color: tab === k ? "#d4a853" : "#333", padding: "10px 15px", fontSize: 10, letterSpacing: "0.06em", borderBottom: tab === k ? "2px solid #d4a853" : "2px solid transparent", transition: "all .15s" }}>{l}</button>
        ))}
      </div>

      {/* ══ LISTE ══ */}
      {tab === "liste" && (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "9px 22px", background: "#0b0b14", borderBottom: "1px solid #12122a", display: "flex", gap: 7, flexWrap: "wrap", alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..." style={{ background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "5px 10px", borderRadius: 5, fontSize: 10, width: 170 }} />
            <select value={fCat} onChange={e => setFCat(e.target.value)} style={{ background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "5px 8px", borderRadius: 5, fontSize: 10 }}>
              {["Tout", ...CATEGORIES].map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={fReg} onChange={e => setFReg(e.target.value)} style={{ background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "5px 8px", borderRadius: 5, fontSize: 10 }}>
              {["Toutes", ...REGIONS].map(o => <option key={o}>{o}</option>)}
            </select>
            <select value={fSt} onChange={e => setFSt(e.target.value)} style={{ background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "5px 8px", borderRadius: 5, fontSize: 10 }}>
              {["Tous", "Non prospecté", "Prospecté"].map(o => <option key={o}>{o}</option>)}
            </select>
            <button onClick={() => setSelected(new Set(filtered.filter(a => !a.prospecte).map(a => a.id)))} className="ab" style={{ background: "#141420", border: "1px solid #22222e", color: "#777", padding: "5px 10px", borderRadius: 5, fontSize: 9 }}>Sélect. non prospecté</button>
            {selected.size > 0 && (
              <button onClick={() => setTab("mail")} style={{ marginLeft: "auto", background: "#d4a853", border: "none", color: "#080810", padding: "5px 14px", borderRadius: 5, fontSize: 10, fontWeight: 700, animation: "pulse 2s infinite" }}>
                ✉️ Campagne → {selected.size} agences
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflow: "auto", padding: "0 22px 20px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11, marginTop: 10 }}>
              <thead>
                <tr style={{ color: "#2a2a38", borderBottom: "1px solid #12122a" }}>
                  <th style={{ padding: "7px 8px", width: 28 }}><input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ accentColor: "#d4a853" }} /></th>
                  {[["nom", "Agence"], ["categorie", "Type"], ["ville", "Ville"], ["region", "Région"], ["email", "Email"], ["tel", "Tél"]].map(([f, l]) => (
                    <th key={f} className="th" onClick={() => sortBy(f)} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 500, textTransform: "uppercase", fontSize: 9, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
                      {l}{sortF === f ? (sortD === "asc" ? " ↑" : " ↓") : ""}
                    </th>
                  ))}
                  <th style={{ padding: "7px 10px", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.1em" }}>Statut</th>
                  <th style={{ width: 36 }} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} className="rh" style={{ borderBottom: "1px solid #0e0e1c", background: selected.has(a.id) ? "#0e0e1c" : "transparent" }}>
                    <td style={{ padding: "9px 8px" }}><input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSel(a.id)} style={{ accentColor: "#d4a853" }} /></td>
                    <td style={{ padding: "9px 10px", color: "#ddd", fontWeight: 500 }}>{a.nom}</td>
                    <td style={{ padding: "9px 10px" }}><Badge cat={a.categorie} /></td>
                    <td style={{ padding: "9px 10px", color: "#666" }}>{a.ville}</td>
                    <td style={{ padding: "9px 10px", color: "#444" }}>{a.region}</td>
                    <td style={{ padding: "9px 10px", color: "#4a7abd", fontSize: 10 }}>{a.email}</td>
                    <td style={{ padding: "9px 10px", color: "#444" }}>{a.tel}</td>
                    <td style={{ padding: "9px 10px" }}>
                      <button onClick={() => toggleProsp(a.id)} style={{ background: a.prospecte ? "#0a160a" : "#141420", border: `1px solid ${a.prospecte ? "#10b98144" : "#22222e"}`, color: a.prospecte ? "#10b981" : "#333", padding: "2px 10px", borderRadius: 20, fontSize: 9, fontWeight: 600 }}>
                        {a.prospecte ? "✓ Fait" : "À faire"}
                      </button>
                    </td>
                    <td style={{ padding: "9px 8px", textAlign: "right" }}>
                      <button onClick={() => delAgency(a.id)} style={{ background: "transparent", border: "none", color: "#1e1e28", fontSize: 12 }} onMouseEnter={e => e.target.style.color = "#ef4444"} onMouseLeave={e => e.target.style.color = "#1e1e28"}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filtered.length && <div style={{ textAlign: "center", color: "#1e1e28", padding: "50px 0", fontSize: 11 }}>Aucune agence</div>}
          </div>
        </div>
      )}

      {/* ══ MAIL ══ */}
      {tab === "mail" && (
        <div style={{ flex: 1, overflow: "auto", padding: "18px 22px", display: "flex", gap: 18 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ color: "#d4a853", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13 }}>✉️ Template Personnalisé</div>
            <div>
              <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>Objet</div>
              <input value={subject} onChange={e => setSubject(e.target.value)} style={{ width: "100%", background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "7px 11px", borderRadius: 5, fontSize: 11 }} />
            </div>
            <div>
              <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 5 }}>
                Corps — <span style={{ color: "#d4a853" }}>{"{NOM_AGENCE}"}</span> · <span style={{ color: "#5a8fd4" }}>{"{CATEGORIE}"}</span> · <span style={{ color: "#10b981" }}>{"{VILLE}"}</span>
              </div>
              <textarea value={tpl} onChange={e => setTpl(e.target.value)} rows={12} style={{ width: "100%", background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "10px 11px", borderRadius: 5, fontSize: 11, lineHeight: 1.7, resize: "vertical" }} />
            </div>
            <div style={{ background: "#0d0d1c", border: "1px solid #1c1c2c", borderRadius: 7, padding: 11 }}>
              <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>⚡ Réécrire avec l'IA</div>
              <div style={{ display: "flex", gap: 7 }}>
                <input value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} onKeyDown={e => e.key === "Enter" && improveAI()} placeholder='Ex: "plus court et percutant", "offre démo gratuite", "ton urgent"...' style={{ flex: 1, background: "#080810", border: "1px solid #1c1c28", color: "#ddd", padding: "6px 11px", borderRadius: 5, fontSize: 10 }} />
                <button onClick={improveAI} disabled={aiLoading} className="ab" style={{ background: aiLoading ? "#141420" : "#d4a853", border: "none", color: aiLoading ? "#444" : "#080810", padding: "6px 14px", borderRadius: 5, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>
                  {aiLoading ? <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⌛</span> : "Générer"}
                </button>
              </div>
            </div>
            {selAgencies.length > 0 && (
              <div style={{ background: "#0a100a", border: "1px solid #142014", borderRadius: 7, padding: 11 }}>
                <div style={{ fontSize: 9, color: "#3a5a3a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>👁 Aperçu → {selAgencies[0].nom}</div>
                <div style={{ fontSize: 10, color: "#5a8a5a", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 130, overflow: "auto" }}>{personalize(tpl, selAgencies[0])}</div>
              </div>
            )}
          </div>

          {/* Panel droite */}
          <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ background: "#0d0d1c", border: "1px solid #1c1c2c", borderRadius: 7, padding: 13 }}>
              <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Quota aujourd'hui</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                <QBar label="BREVO" used={sentToday.brevo} max={QUOTAS.brevo} color="#10b981" />
                <QBar label="RESEND" used={sentToday.resend} max={QUOTAS.resend} color="#5a8fd4" />
              </div>
              <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid #12122a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "#444" }}>Total restant</span>
                <span style={{ fontSize: 22, fontFamily: "Syne,sans-serif", fontWeight: 800, color: totalQ > 0 ? "#d4a853" : "#ef4444" }}>{totalQ}</span>
              </div>
              {!hasKey && <div style={{ fontSize: 9, color: "#ef444466", textAlign: "center", marginTop: 6 }}>⚠️ Config APIs requis</div>}
            </div>

            <div style={{ background: "#0d0d1c", border: "1px solid #1c1c2c", borderRadius: 7, padding: 13, flex: 1 }}>
              <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 9 }}>Destinataires {selected.size > 0 ? `(${selected.size})` : ""}</div>
              {!selected.size ? (
                <div style={{ color: "#1e1e28", fontSize: 10, textAlign: "center", padding: "18px 0" }}>Aucune agence sélectionnée<br /><span style={{ fontSize: 9 }}>→ Onglet "Base Agences"</span></div>
              ) : (
                <div style={{ maxHeight: 180, overflow: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                  {selAgencies.map(a => (
                    <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 7px", background: "#0a0a14", borderRadius: 4 }}>
                      <Badge cat={a.categorie} />
                      <div style={{ flex: 1, overflow: "hidden" }}>
                        <div style={{ fontSize: 10, color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nom}</div>
                        <div style={{ fontSize: 9, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.email}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleSend} disabled={sending || !selected.size || !hasKey} style={{ background: (selected.size && hasKey && !sending) ? "linear-gradient(135deg,#d4a853,#7a5215)" : "#111", border: "none", color: (selected.size && hasKey) ? "#080810" : "#2a2a38", padding: "13px", borderRadius: 7, fontSize: 12, fontWeight: 700, fontFamily: "Syne,sans-serif" }}>
              {sending ? `⏳ ${progress}%` : `🚀 Envoyer${selected.size ? ` (${selected.size})` : ""}`}
            </button>

            {sending && (
              <div style={{ height: 3, background: "#141420", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: progress + "%", height: "100%", background: "linear-gradient(90deg,#d4a853,#10b981)", transition: "width .3s" }} />
              </div>
            )}

            {log.length > 0 && (
              <div style={{ background: "#0a0a14", border: "1px solid #12122a", borderRadius: 7, padding: 11, maxHeight: 200, overflow: "auto" }}>
                <div style={{ fontSize: 9, color: "#444", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 7 }}>{done ? "✅ Résultats" : "⏳ En cours"}</div>
                {log.map((l, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 0", borderBottom: "1px solid #0c0c18", fontSize: 10 }}>
                    <span style={{ color: l.status === "envoyé" ? "#10b981" : l.status === "quota_atteint" ? "#d4a853" : "#ef4444", fontSize: 11 }}>
                      {l.status === "envoyé" ? "✓" : l.status === "quota_atteint" ? "⏸" : "✕"}
                    </span>
                    <span style={{ flex: 1, color: "#777", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10 }}>{l.nom}</span>
                    <span style={{ fontSize: 9, color: l.provider === "brevo" ? "#10b98166" : l.provider === "resend" ? "#5a8fd466" : "#333" }}>{l.provider !== "-" ? l.provider : l.status}</span>
                  </div>
                ))}
                {done && (
                  <div style={{ marginTop: 7, fontSize: 9, color: "#444", textAlign: "center" }}>
                    {log.filter(l => l.status === "envoyé").length} ✓ · {log.filter(l => l.status === "erreur").length} ✕ · {log.filter(l => l.status === "quota_atteint").length} quota
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ IMPORT ══ */}
      {tab === "import" && (
        <div style={{ flex: 1, overflow: "auto", padding: "18px 22px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, maxWidth: 900 }}>
            <div>
              <div style={{ color: "#d4a853", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>📥 Import CSV</div>
              <div style={{ background: "#0d0d1c", border: "1px solid #1c1c2c", borderRadius: 7, padding: 11, marginBottom: 11 }}>
                <div style={{ fontSize: 10, color: "#666", marginBottom: 6 }}>Format (séparateur <span style={{ color: "#d4a853" }}>;</span>) :</div>
                <div style={{ background: "#080810", borderRadius: 4, padding: 8, fontSize: 10, color: "#333", fontFamily: "monospace", lineHeight: 1.6 }}>Nom;email;tél;ville;région;catégorie</div>
                <div style={{ fontSize: 9, color: "#222", marginTop: 5 }}>Catégories : {CATEGORIES.join(", ")}</div>
              </div>
              <textarea value={importText} onChange={e => setImportText(e.target.value)} rows={9} placeholder={"AutoLoc Paris;contact@autoloc.fr;01 42 00 00 00;Paris;Île-de-France;Voiture"} style={{ width: "100%", background: "#0d0d18", border: "1px solid #1c1c28", color: "#ddd", padding: "9px 11px", borderRadius: 5, fontSize: 10, lineHeight: 1.7, resize: "vertical", marginBottom: 9 }} />
              <button onClick={doImport} disabled={!importText.trim()} className="ab" style={{ background: importText.trim() ? "#d4a853" : "#111", border: "none", color: importText.trim() ? "#080810" : "#2a2a38", padding: "8px 18px", borderRadius: 5, fontSize: 10, fontWeight: 700 }}>Importer</button>
            </div>
            <div>
              <div style={{ color: "#d4a853", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔎 Où trouver les agences</div>
              {[
                { t: "Pappers.fr / Societe.com", d: "Code NAF 7711Z (voitures), 7712Z (utilitaires) → export CSV gratuit avec emails", c: "#10b981" },
                { t: "Google Maps + Outscraper", d: '"agence location voiture [ville]" → Outscraper.com extrait nom/tel/email auto', c: "#5a8fd4" },
                { t: "Pages Jaunes + Apify", d: '"Location de véhicules" → acteur Apify Pages Jaunes → export CSV/Excel', c: "#d4a853" },
                { t: "LinkedIn Sales Navigator", d: '"Location de véhicules" + France → export via Phantombuster ou Evaboot', c: "#8b5cf6" },
                { t: "INPI / Data.gouv.fr", d: "Base SIRENE officielle filtrable par NAF — 100% des entreprises françaises", c: "#ef4444" },
              ].map(s => (
                <div key={s.t} style={{ background: "#0d0d1c", border: `1px solid ${s.c}1a`, borderRadius: 6, padding: 9, marginBottom: 7 }}>
                  <div style={{ fontSize: 11, color: s.c, fontWeight: 600, marginBottom: 3 }}>{s.t}</div>
                  <div style={{ fontSize: 10, color: "#444", lineHeight: 1.5 }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL AJOUT ══ */}
      {showAdd && (
        <div style={{ position: "fixed", inset: 0, background: "#000000bb", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }} onClick={() => setShowAdd(false)}>
          <div style={{ background: "#0d0d1c", border: "1px solid #22223a", borderRadius: 10, padding: 20, width: 400, animation: "slideIn .2s ease" }} onClick={e => e.stopPropagation()}>
            <div style={{ color: "#d4a853", fontFamily: "Syne,sans-serif", fontWeight: 700, fontSize: 13, marginBottom: 13 }}>+ Nouvelle Agence</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
              {[["nom", "Nom *"], ["email", "Email *"], ["tel", "Téléphone"], ["ville", "Ville"]].map(([f, l]) => (
                <div key={f}>
                  <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{l}</div>
                  <input value={newA[f]} onChange={e => setNewA(p => ({ ...p, [f]: e.target.value }))} style={{ width: "100%", background: "#080810", border: "1px solid #1c1c28", color: "#ddd", padding: "6px 9px", borderRadius: 4, fontSize: 10 }} />
                </div>
              ))}
              {[["region", "Région", REGIONS], ["categorie", "Catégorie", CATEGORIES]].map(([f, l, opts]) => (
                <div key={f}>
                  <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{l}</div>
                  <select value={newA[f]} onChange={e => setNewA(p => ({ ...p, [f]: e.target.value }))} style={{ width: "100%", background: "#080810", border: "1px solid #1c1c28", color: "#ddd", padding: "6px 9px", borderRadius: 4, fontSize: 10 }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 9 }}>
              <div style={{ fontSize: 9, color: "#333", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>Notes</div>
              <textarea value={newA.notes} onChange={e => setNewA(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ width: "100%", background: "#080810", border: "1px solid #1c1c28", color: "#ddd", padding: "6px 9px", borderRadius: 4, fontSize: 10, resize: "none" }} />
            </div>
            <div style={{ display: "flex", gap: 7, marginTop: 13, justifyContent: "flex-end" }}>
              <button onClick={() => setShowAdd(false)} style={{ background: "#141420", border: "1px solid #22222e", color: "#666", padding: "6px 13px", borderRadius: 5, fontSize: 10 }}>Annuler</button>
              <button onClick={addAgency} style={{ background: "#d4a853", border: "none", color: "#080810", padding: "6px 16px", borderRadius: 5, fontSize: 10, fontWeight: 700 }}>Ajouter</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

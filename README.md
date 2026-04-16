# ⚡ LocPro CRM — Prospection Agences de Location

CRM de prospection B2B pour les agences de location de véhicules en France.  
Construit avec React + Vite. Design dark premium obsidian & gold.

---

## 🚀 Fonctionnalités

- **Base de données agences** — tableau complet avec nom, email, tél, ville, région, catégorie (Voiture / Luxe / Utilitaire / Minibus / Moto)
- **Filtres avancés** — par catégorie, région, statut prospecté
- **Campagne email** — template personnalisé avec variables `{NOM_AGENCE}`, `{CATEGORIE}`, `{VILLE}`
- **Envoi réel** via **Brevo** (300/jour gratuit) et/ou **Resend** (100/jour gratuit)
- **Rotation automatique** Brevo → Resend pour maximiser le quota (400 mails/jour gratuits)
- **IA Claude** — réécriture du template email à la demande
- **Quota tracker** — suivi en temps réel des envois par provider
- **Log d'envoi** — statut mail par mail (envoyé / erreur / quota atteint)
- **Import CSV** — format `Nom;Email;Tél;Ville;Région;Catégorie`
- **Export CSV** — export complet de la base
- **Cases à cocher "Prospecté"** — marquage automatique après envoi

---

## 📦 Installation

```bash
# Cloner le repo
git clone https://github.com/TON_USERNAME/locpro-crm.git
cd locpro-crm

# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Builder pour la production
npm run build
```

---

## 🔑 Configuration des APIs

### Brevo (300 mails/jour gratuits)
1. Créer un compte sur [brevo.com](https://brevo.com)
2. Aller dans **Paramètres → Clés API → Générer une clé**
3. Copier la clé `xkeysib-...`
4. Vérifier votre email expéditeur dans **Paramètres → Expéditeurs**

### Resend (100 mails/jour gratuits)
1. Créer un compte sur [resend.com](https://resend.com)
2. Aller dans **API Keys → Create API Key**
3. Copier la clé `re_...`
4. Vérifier votre domaine dans **Domains**

### Dans l'application
1. Cliquer sur **"Config APIs"** en haut à droite
2. Coller les clés Brevo et/ou Resend
3. Renseigner le nom et email expéditeur (doit être vérifié)
4. Choisir le mode : **Rotation auto** (recommandé) = 400 mails/jour gratuits

---

## 📥 Format Import CSV

```
Nom Agence;email@domaine.fr;01 23 45 67 89;Paris;Île-de-France;Voiture
Drive Luxe;info@driveluxe.fr;04 93 00 00 00;Cannes;PACA;Luxe
```

**Catégories valides :** Voiture, Luxe, Utilitaire, Minibus, Moto

---

## 🔎 Sources pour trouver des agences

| Source | Code NAF | Notes |
|--------|----------|-------|
| [Pappers.fr](https://pappers.fr) | 7711Z, 7712Z, 7730Z | Export CSV gratuit avec emails |
| [Outscraper.com](https://outscraper.com) | — | Scraping Google Maps |
| [Apify.com](https://apify.com) | — | Scraping Pages Jaunes |
| [LinkedIn Sales Navigator](https://linkedin.com/sales) | — | Export via Phantombuster |
| [Data.gouv.fr](https://data.gouv.fr) | — | Base SIRENE officielle |

---

## 🛠 Stack technique

- **React 18** + **Vite 5**
- **Brevo API** — `api.brevo.com/v3/smtp/email`
- **Resend API** — `api.resend.com/emails`
- **Claude API** (Anthropic) — réécriture IA du template
- Zéro dépendance UI (CSS inline pur)

---

## 📈 Augmenter les quotas

| Plan | Provider | Mails/mois | Prix |
|------|----------|-----------|------|
| Gratuit | Brevo + Resend | ~12 000 | 0€ |
| Starter | Brevo | 20 000 | 7€/mois |
| Pro | Resend | 50 000 | 20$/mois |

---

## 📄 Licence

MIT — Projet LocPro

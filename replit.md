# LocPro CRM

A B2B prospecting tool for vehicle rental agencies in France. Manages leads and automates email outreach campaigns.

## Tech Stack
- **Frontend**: React 18 + Vite 5
- **Language**: JavaScript (JSX)
- **Styling**: Inline CSS (Dark Premium Obsidian & Gold theme)
- **Package Manager**: npm

## Key Features
- Lead management database for rental agencies (Car, Luxury, Utility, etc.)
- Filter leads by region or status
- Automated email campaigns via Brevo and Resend APIs
- Smart quota rotation between providers (up to 400 emails/day)
- AI-powered email template optimization via Anthropic Claude API
- CSV import/export for lead lists
- Auto-prospection: Pappers.fr → Hunter.io → Resend → Brevo
- **Persistance Supabase** pour la table `prospects` (avec RLS + policies anon)

## Project Structure
```
src/
  main.jsx                    # Entry point
  App.jsx                     # Core logic: tabs, Brevo/Resend/Claude, campagnes
  pages/
    Prospects.jsx             # Onglet Prospection (Supabase-backed)
  services/
    supabaseClient.js         # Client Supabase + mappers camelCase ↔ snake_case
    pappersService.js         # Pappers API + CRUD prospects (Supabase)
    prospectionAuto.js        # Orchestrateur auto-prospection
public/
index.html
vite.config.js
supabase_schema.sql           # SQL à exécuter dans Supabase SQL Editor
package.json
```

## Supabase
- Tables : `agences`, `prospects` (créées via `supabase_schema.sql`)
- RLS activé avec policies "all access" pour la clé anon
- Le client utilise upsert atomique avec onConflict='siren' pour éviter les races
- Toutes les erreurs sont propagées via throw → toast UI

## Development
- `npm run dev` — starts dev server on port 5000
- `npm run build` — production build
- `npm run preview` — preview production build

## Environment Variables
- `VITE_SUPABASE_URL` — URL projet Supabase
- `VITE_SUPABASE_ANON_KEY` — clé anon publique Supabase
- `VITE_PAPPERS_API_KEY` — Pappers.fr (recherche d'agences)
- `VITE_HUNTER_API_KEY` — Hunter.io (recherche d'emails)
- `VITE_BREVO_API_KEY` — Brevo (envoi + relances)
- `VITE_RESEND_API_KEY` — Resend (envoi)
- `VITE_ANTHROPIC_API_KEY` — Anthropic Claude (réécriture IA, optionnel)

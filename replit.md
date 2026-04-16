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
- localStorage-based email tracking and quota management

## Project Structure
```
src/
  main.jsx    # Entry point
  App.jsx     # Core logic: state, UI, API calls, styles
public/       # Static assets
index.html    # HTML entry
vite.config.js
package.json
```

## Development
- `npm run dev` — starts dev server on port 5000
- `npm run build` — production build
- `npm run preview` — preview production build

## Environment Variables
- `VITE_BREVO_API_KEY` — Brevo API key for email sending
- `VITE_RESEND_API_KEY` — Resend API key for email sending
- `VITE_ANTHROPIC_API_KEY` — Anthropic Claude API key for AI rewriting

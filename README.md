# TCS-Webseite

Unternehmenswebseite der TCS AG. React 18, Vite, TypeScript, Tailwind, shadcn/ui.
Redaktionelle Inhalte kommen aus Storyblok (Space 296152904149561), Produktdaten aus der
TCS-Produktdatenbank (Supabase, read-only). Das fruehere CMS-Light (Supabase) ist als
Uebergangsquelle ueber `VITE_CONTENT_SOURCE=supabase` weiter ansprechbar.

## Entwicklung

```bash
cp .env.example .env.local   # Werte eintragen
npm install
npm run dev                  # http://localhost:8080
npm run typecheck
npm test
npm run build
```

## Deployment

Vercel, Konfiguration in `vercel.json` (SPA-Rewrite). Umgebungsvariablen siehe `.env.example`;
Preview-Deployments bekommen den Storyblok-Preview-Token, Production den Public-Token.
Veroeffentlichen in Storyblok loest ueber einen Webhook den Vercel Deploy Hook aus.

## Herkunft

Der Code wurde am 28.10.2026 aus dem Lovable-Projekt `TCS-webseite_db_cms` exportiert.
Die Lovable-spezifischen Bestandteile (Vite-Plugins, MCP-Server, Audit-CI gegen die CMS-Light-DB)
wurden entfernt. Die Migrationsdokumentation liegt im Claude-Dokument
„Migration CMS-Light → Storyblok".

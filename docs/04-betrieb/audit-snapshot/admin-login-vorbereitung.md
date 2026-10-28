# Admin-Login — Vorbereitung (Plan, nicht aktiv)

Stand: 2026-06-04. **Dies ist ein reines Markdown-Artefakt.** Es wurden **keine** Code-Änderungen vorgenommen: keine `ProtectedRoute`, kein `useAuth`-Hook, keine Auth-Komponenten, keine `user_roles`-Tabelle, keine Migration. Die Core-Regel „Admin-Bereich (/admin) läuft in Prototyp-Phase ohne Login" bleibt bis zur expliziten Freigabe gültig.

Vor jeder Aktivierung: erneuter Stopp + Freigabe durch Thomas.

## 1. Welche Auth-Lösung?

- **Lovable Cloud / Supabase Auth**, dasselbe Projekt wie das CMS (`uvkubrrljyzfvbvejepl`). Keine externe Auth-Lösung.
- **Email + Passwort** als Default. **Google** zusätzlich, weil firmenseitig vorhanden (Workspace-Konten).
- Kein anonymes Signup, kein offenes Self-Service-Signup. Redaktionskonten werden im Backend manuell angelegt.
- Leaked-Password-Check (HIBP) aktivieren.

## 2. Welche Rolle braucht die Redaktion?

Eine einzige Rolle reicht für Phase 1:

- `editor` — darf alle `rpc_admin_*` ausführen, darf den Admin-Baum sehen.

Optional in Phase 2:

- `admin` — zusätzlich destruktive Operationen (Section löschen, Navigation umbauen).
- `viewer` — nur lesender Admin-Zugriff (z. B. für Geschäftsführung).

**Rollen-Speicherung**: separate Tabelle `public.user_roles` mit `app_role`-Enum, wie in der Lovable-Vorlage. Niemals Rollen am Profil oder in `auth.users` ablegen.

## 3. Welche Routen müssen geschützt werden?

Geschützt:

- `/admin` und alles darunter (Live-Vorschau, Section-Editor, Navigationstree, Asset-Manager, Wahrheits-Check-Tab).
- `/api/admin/*` falls vorhanden (aktuell nicht, alles läuft über RPCs).

**Öffentlich bleibt**:

- Die gesamte Public-Site (`/`, `/produkte/*`, `/service/*`, `/serviceportal`, `/ich-bin/*`, …).
- Eventuelle Preview-Links der Marketing-Vorschau, falls noch genutzt.

## 4. Welche RPCs bleiben erlaubt?

- **Heute**: alle `rpc_admin_*` sind RLS-mäßig offen genug, dass der Prototyp ohne Login schreibt (über den Anon-Key + permissive Policies auf den RPCs).
- **Nach Login**: RPCs müssen `auth.uid()` prüfen und über `public.has_role(auth.uid(), 'editor')` gaten. Lese-RPCs (`rpc_admin_read_*`) dürfen `editor` UND `viewer` erlauben. Schreib-RPCs nur `editor`/`admin`.
- **Niemals**: direkter `.insert/.update/.delete` aus dem Frontend. Bleibt verboten, auch nach Login.

## 5. Wie bleibt die Preview nutzbar?

- Die Lovable-Preview muss auch nach Login funktionieren, sonst können Marketing/Thomas nichts mehr abnehmen.
- Lösung: Login-Seite unter `/admin/login`, Session via Lovable Cloud (Cookie/LocalStorage). Beim ersten Aufruf im Preview-Iframe wird zum Login redirected, danach merkt sich die Session den Status.
- Alternative für reine Preview-Demos: ein zweiter Account-Typ `preview-viewer` mit nur Lese-Rechten — optional, nicht zwingend.

## 6. Welche Env-Variablen werden gebraucht?

Keine neuen. `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY` sind bereits gesetzt und reichen für Auth + Datenzugriff. Google-OAuth wird über Lovable Cloud Managed OAuth gehandhabt — kein Client-ID/Secret im Repo nötig.

## 7. Wie wird der No-Login-Workspace entfernt?

Reihenfolge, in genau dieser Sequenz und mit Stopp nach jedem Schritt:

1. **Schritt A — Plan freigeben** (= dieses Dokument).
2. **Schritt B — DB-Setup**: `app_role`-Enum + `user_roles`-Tabelle + `has_role`-Function + RLS-Policies + GRANT. **Eine** Migration. Idempotent.
3. **Schritt C — RPC-Härtung**: alle `rpc_admin_*` um `has_role`-Check ergänzen. **Eine** Migration, getrennt von Schritt B, damit ein Rollback einfach ist.
4. **Schritt D — Erst-Editor anlegen**: ein Account für Thomas + ein Account für die Marketing-Redaktion. Manuell, dokumentiert.
5. **Schritt E — Auth-UI**: `/admin/login`-Seite, `signInWithPassword`, `signInWithOAuth("google")`, Session-Listener (`onAuthStateChange` zuerst registrieren, dann `getSession`), Logout. Erst dann `<ProtectedRoute>` um den Admin-Bereich.
6. **Schritt F — Preview-Test**: Login im Preview-Iframe, alle Admin-Funktionen durchklicken, dann Public-Site testen (darf nicht von Auth abhängig sein).
7. **Schritt G — Core-Regel umschreiben**: `mem://index.md` aktualisieren („Admin-Bereich ist hinter Login. Inhalts-Prompts wechseln auf Editor-Workflow.").

Vor Schritt B: **expliziter Stopp und Freigabe**.

## 8. Risiken

- **RPC-Härtung kaputt machen**: Wenn Schritt C eine Rolle in einem RPC vergisst, ist das Admin-UI nach Login tot. Mitigation: Migration mit Test gegen alle 33 `rpc_admin_*`.
- **Preview-Iframe-Cookies**: Drittanbieter-Cookies können in iframes blockiert sein. Mitigation: vor Schritt E im Preview verifizieren.
- **Inhalts-Prompt-Workflow ändert sich**: Aktuell darf Lovable Inhalte per Prompt direkt schreiben. Nach Login muss klar geregelt sein, ob Lovable als Service-Account schreibt oder ob Inhalts-Prompts an Editor übergeben werden. Entscheidung gehört in Schritt G.

## Status

**Plan: bereit.** Keine Code-Änderung erfolgt. Wartet auf Freigabe.

# Produktbereich Routing-Map (Clickdummy → bestehende TCS-Architektur)

**Status:** Analyse/Entscheidungsvorlage · keine Code-, Navigations-, DB- oder CMS-Änderungen.
**Quelle:** Clickdummy „Website-Struktur" von Florian Duffner (politisches/strukturelles Signal, kein Umsetzungsvorbild).
**Zweck:** Den produktorientierten Einstieg aus dem Clickdummy fachlich auf unsere drei Wahrheiten abbilden:
externe **Produktdatenbank** (BMEcat, Katalog, PDP), **CMS-Light** (redaktionelle Einstiege) und **externe Tools/Shops/Konfiguratoren**.

---

## 0. Zwei Datenbanken, eine Trennlinie (Pflicht-Vorab)

Im Projekt laufen **zwei getrennte Supabase-Instanzen**. Das ist die wichtigste Regel für den Produktbereich:

| Datenquelle | Inhalt | Client | Schreibweg |
|---|---|---|---|
| **Externe Produkt-DB** (migrierte Supabase, BMEcat-Spiegel) | echte Produkte mit Artikelnummer: Außen-/Innenstationen, Packs, Steuer-/Netzgeräte, Systemkomponenten, Karten/Transponder/Halter usw. | `src/lib/supabase/client.ts` | nicht über CMS-Light; **tabu** für Admin-UI |
| **Interne CMS-Light-DB** (Lovable Cloud) | Hubs, Erklärseiten, Texte, Bilder, Navigation, Asset-Slots | `src/lib/cmsSupabase/client.ts` | ausschließlich über `rpc_admin_*` |

Daraus folgt für jeden Zieltyp:

- `catalog_filter` → **Externe Produkt-DB**. CMS-Light hält nur Label, Subline, Vorfilter-Parameter und Linkziel. **Keine Produktdaten spiegeln, kopieren oder cachen.**
- `content_page` → **CMS-Light**. Darf auf die Produkt-DB verlinken (z. B. „diese Außenstation im Katalog ansehen"), aber nichts daraus persistieren.
- `external_url` / `configurator` → außerhalb beider DBs; CMS-Light hält nur die Brückenseite mit Link.
- Im **Admin-Code** wird der Produkt-DB-Client `src/lib/supabase/client.ts` **nicht importiert** (siehe `.lovable/always-follow.md` §3).

---

## 1. Leitregel (entscheidet den Zieltyp)

| Bedingung | Zieltyp |
|---|---|
| Artikelnummern / BMEcat / Produktdaten sauber vorhanden | `catalog_filter` |
| Erklärungsbedürftig, systemisch, projektartig, ohne saubere Artikelnummern | `content_page` |
| Eigener Shop, eigene Webseite, eigenes Tool vorhanden | `external_url` |
| Konfigurator/Anfragestrecke statt Katalog | `configurator` |
| Fachlich/politisch unklar, ob TCS das so anbietet/zeigt | `needs_decision` |
| Geplant, aber Datenlage heute nicht tragfähig | `not_available_yet` |

**Wichtig:** Produktdaten gehören niemals ins CMS-Light. CMS-Light hält nur redaktionelle Einstiege, Labels, Beschreibungstexte, Zielverweise.

---

## 2. Empfehlung Navigationsname

| Variante | Vorteil | Nachteil |
|---|---|---|
| **Produkte** | knapp, vertraut, entspricht Florians Wording | suggeriert klassischen Artikelbaum, den wir bei Architektur Entry / Signage / Metallbau fachlich nicht haben |
| **Produkte & Systeme** ⭐ | nimmt Produktwunsch auf, deckt aber Systeme/Lösungen ehrlich mit ab | etwas länger |
| **Produktwelt** | marketingnah | wirkt unscharf, weniger seriös im B2B-Umfeld |
| **Lösungen & Produkte** | passt zur bestehenden Anwendungs-/Persona-Logik | dreht Florians Botschaft zurück, Produktbereich wirkt sekundär |

**Empfehlung:** **„Produkte & Systeme"**. Politisch anschlussfähig (Florian sieht „Produkte"), fachlich ehrlich (Architektur Entry, Eingangslösungen, Signage, Software werden nicht zu Pseudo-Produkten degradiert).

---

## 3. Mapping-Tabelle

Quelle Original-Labels und Sublines: `docs/archiv/referenzen/clickdummy-florian-duffner-v1.html` (Mega-Menü „01 / Produkte").

Spalten:
- **Label (Clickdummy)** – Originalbezeichnung im Klickdummy
- **Subline (Clickdummy)** – Originaler Untertitel, wie Florian ihn formuliert hat (wichtig für Begriffsabgleich)
- **Öffentlicher Name (Empfehlung)** – wie es im Menü/Hub heißen sollte
- **Zieltyp** – siehe Leitregel
- **Empfohlene Route** – Vorschlag, an bestehende URL-Struktur angelehnt
- **Datenquelle** – Produktdatenbank / CMS-Light / extern / Konfigurator / offen
- **Begründung** – kurz
- **Offene Entscheidung** – was Mensch klären muss

### 3.1 Türkommunikation

| Label (Clickdummy) | Subline (Clickdummy) | Öffentlicher Name | Zieltyp | Empfohlene Route | Datenquelle | Begründung | Offene Entscheidung |
|---|---|---|---|---|---|---|---|
| Außenstationen | Aufputz, Unterputz, Einbau Display | Außenstationen | `catalog_filter` | `/produkte/tuerkommunikation/aussenstationen` → Katalog mit Vorfilter | Produktdatenbank | klassische Artikel mit Artikelnummer, Subline ist bereits eine Filterachse (Montageart) | Direkteinstieg in Katalog oder kurze Content-Bridge davor? |
| Innenstationen | Audio- & Video-Geräte | Innenstationen | `catalog_filter` | `/produkte/tuerkommunikation/innenstationen` | Produktdatenbank | echte Produktkategorie, „Audio/Video" als zweite Filterachse | dito |
| Packs | Vorkonfigurierte Sets | TCS:PACKS | `catalog_filter` | `/produkte/tuerkommunikation/packs` | Produktdatenbank | bestehende Marke, BMEcat-fähig | Bleibt „TCS:PACKS" als Brand sichtbar? |
| Steuer- & Netzgeräte | Verteiler, Trafos, Module | Steuer- & Netzgeräte | `catalog_filter` | `/produkte/tuerkommunikation/steuer-netzgeraete` | Produktdatenbank | katalogfähig | gemeinsamer Filter oder zwei getrennte? |
| Systemkomponenten | Verkabelung, Schnittstellen | Systemkomponenten | `catalog_filter` *(bevorzugt)* / sonst `content_page` | `/produkte/tuerkommunikation/systemkomponenten` | Produktdatenbank, sonst CMS-Light | abhängig von Datenqualität BMEcat | Sind Verkabelung/Schnittstellen sauber in BMEcat? |
| Smarte Erweiterungen | App-Anbindung, IoT, Gateways | Smarte Erweiterungen (snipdoo®, App, IP) | `content_page` *(heute)*, später `catalog_filter` ergänzen | `/gebaeudekommunikation/snipdoo-ip` (existiert) + Hub-Seite | CMS-Light + Produktdatenbank | App/IP/Gateway brauchen Story, nicht nur Filter | Eigene Hub-Seite „Smarte Erweiterungen" anlegen? |
| Serviceprodukte | Wartung, Ersatzteile, Zubehör | *(Begriff aufsplitten)* | `needs_decision` | offen | offen | Subline mischt drei Welten: Wartung (Service), Ersatzteile (Shop existiert bereits), Zubehör (Katalog) | Aufsplitten in „Wartung" (Content), „Ersatzteile" (bestehender Shop) und „Zubehör" (Katalog)? |

### 3.2 Zutrittskontrolle

| Label (Clickdummy) | Subline (Clickdummy) | Öffentlicher Name | Zieltyp | Empfohlene Route | Datenquelle | Begründung | Offene Entscheidung |
|---|---|---|---|---|---|---|---|
| Online Leser | Vernetzt & live verwaltbar | BCM Online-Leser | `content_page` heute, `catalog_filter` später | `/zutrittskontrolle/bcm-online-leser` (existiert als CMS) | CMS-Light, später + Produktdatenbank | BMEcat-Abdeckung heute unvollständig | Wann ist BMEcat tragfähig? |
| Offline Leser | Standalone, ohne Netzwerk | Funkvernetzte Offline-Leser | `content_page` heute, `catalog_filter` später | `/zutrittskontrolle/funkvernetzte-offline-leser` (existiert) | CMS-Light, später + Produktdatenbank | dito | dito |
| Biometrische Leser | Fingerprint & Gesichtserkennung | Biometrie | `needs_decision` | `/zutrittskontrolle/biometrie` (existiert als CMS) | CMS-Light | unklar, ob TCS Biometrie aktiv als Produktbereich führt oder nur Reseller | Vertrieb/Produktmanagement: aktiv oder Reseller-Thema? |
| Zentralen | Steuerung & Hardware-Hubs | Steuerzentralen / BCM | `content_page` heute, ggf. `catalog_filter` später | `/zutrittskontrolle/zentralen` *(neu, CMS-only Shell möglich)* | CMS-Light | erklärungsbedürftig, hängt an Software | Eigene Seite oder Teil von „Zutrittssoftware"? |
| Software | Verwaltung, Logging, Rechte | Zutrittssoftware | `content_page` | `/zutrittskontrolle/zutrittssoftware` (existiert als CMS-only Shell) | CMS-Light | keine BMEcat-Artikel, reine Plattform | Demo-/Anfrageweg klären |
| Zubehör | Karten, Transponder, Halter | Zubehör (Karten, Transponder) | `catalog_filter` | `/produkte/zutrittskontrolle/zubehoer` | Produktdatenbank | Subline beschreibt klassische Katalogartikel — sehr gut filterfähig | Sind Karten/Transponder/Halter sauber im BMEcat? Falls nein vorerst `content_page`. |

### 3.3 Eingangslösungen

| Label (Clickdummy) | Subline (Clickdummy) | Öffentlicher Name | Zieltyp | Empfohlene Route | Datenquelle | Begründung | Offene Entscheidung |
|---|---|---|---|---|---|---|---|
| Standard Briefkästen | Norm- & Serienlösungen | Standard-Briefkästen | `content_page` + `configurator` | Contentseite: `/gebaeudekommunikation/briefkastenanlagen` · Tool-Link: <https://tcs-box-builder.lovable.app/> (separate Lovable-App, neuer Tab) | CMS-Light + externer Konfigurator | kein vollständiger Online-Produktkatalog; Konfigurator dient als Visualisierungs-/Anfrageeinstieg. CTA-Text bewusst „Anlage konfigurieren" (kein „Jetzt kaufen", kein „Alle Produkte anzeigen") | Owner des Konfigurators dauerhaft festlegen |
| Architektur Entry | Designorientierte Eingangsensembles | Architektur Entry | `content_page` | `/eingangssysteme/architektur-entry` (bestehende Eingangssysteme-Struktur nutzen) | CMS-Light | Projekt-/Systemgeschäft, keine Artikelnummern | Anfrage-CTA + Referenzen anbinden |
| Individueller Metallbau | Maßanfertigung nach Plan | Individueller Metallbau | `content_page` (mit Anfrage-CTA) | `/eingangssysteme/individueller-metallbau` | CMS-Light | reines Projektgeschäft, „Maßanfertigung" = keine Produktstruktur möglich | Anfrageformular-Ziel klären |
| Signage | Beschriftung, Hausnummern, Leitsysteme | Signage | `external_url` *(bevorzugt mit Brückenseite)* | `/eingangssysteme/signage` als Brücke → externer Shop/Webseite | CMS-Light (Bridge) + extern | bestehende Signage-Welt + Shop nicht duplizieren | Externe URL final benennen, ggf. Co-Branding |

---

## 4. Was bedeutet das für Navigation und Hubs (nur Beobachtung, keine Umsetzung)

- **Kein Mega-Menü** wie im Clickdummy. Stattdessen klassisches Dropdown mit drei Säulen: Türkommunikation, Zutrittskontrolle, Eingangslösungen.
- **Zieltyp steuert das Klickverhalten**, nicht das Aussehen: `catalog_filter` springt direkt in den Online-Katalog mit Vorfilter, `content_page` bleibt im CMS-Renderer, `external_url`/`configurator` öffnen Bridge oder externe Strecke.
- **Hub-Seiten** („Türkommunikation", „Zutrittskontrolle", „Eingangslösungen") bleiben CMS-Light und erklären die Säule, bevor in Katalog/Content abgesprungen wird.
- **Anwendungen, Lösungen, Personas bleiben unberührt.** „Produkte & Systeme" wird ein zusätzlicher Einstieg, kein Ersatz.

---

## 5. Offene politische/fachliche Entscheidungen (vor Umsetzung zu klären)

1. **Begriff im Menü:** „Produkte & Systeme" (Empfehlung) vs. „Produkte" (Florians Linie).
2. **Türkommunikation:** Direkter Sprung in Online-Katalog oder zuerst Content-Hub mit Erklärung?
3. **Zutrittskontrolle:** Wann ist BMEcat-Datenlage tragfähig genug, um Online-/Offline-Leser auf `catalog_filter` umzustellen?
4. **Biometrie:** Aktiver Produktbereich oder nur erwähnen?
5. **Türkommunikation → „Serviceprodukte":** Begriff definieren oder streichen.
6. **Signage:** Brückenseite + externer Link, oder voller eigener Bereich?
7. **Standard-Briefkästen Konfigurator:** wo lebt der, wer pflegt ihn?
8. **Architektur Entry / Metallbau:** gemeinsame Anfragestrecke oder getrennt?

---

## 6. Was dieses Dokument bewusst NICHT tut

- Keine Codeänderung.
- Keine neue Navigation.
- Kein Mega-Menü.
- Keine Änderung an der Produktdatenbank.
- Keine CMS-Migration.
- Keine neue RPC.
- Kein Design aus dem Clickdummy übernommen.

Nächster Schritt nach Freigabe: Mensch entscheidet die offenen Punkte aus Abschnitt 5, danach eigene Etappe für (a) Navigationspunkt „Produkte & Systeme" als zusätzlicher Einstieg und (b) Hub-Seiten + Routing-Adapter (`catalog_filter` / `content_page` / `external_url` / `configurator`).

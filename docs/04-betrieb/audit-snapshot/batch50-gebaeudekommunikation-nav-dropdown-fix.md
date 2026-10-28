# Batch 50 — Hauptnavigation „Gebäudekommunikation" Dropdown-Fix

**Stand:** 2026-06-05
**Status:** ✅ erledigt. Eine DB-Daten-Migration auf `cms_navigation_nodes` (zwei UPDATEs), keine Strukturänderung, kein Code-Änderung, keine neue Seite.

---

## 1. Befund

Im Dropdown „Gebäudekommunikation" (`nav_area='main'`, Parent `gebaeudekommunikation`) fehlten bei zwei Einträgen die Unterzeilen, und „Mobile Türkommunikation" hatte keinen funktionierenden Link:

| Node | label_de | description_de (vorher) | route_path (vorher) |
|---|---|---|---|
| `gk.mobile-tuerkommunikation` (node_no 133) | Mobile Türkommunikation | — (leer) | — (leer) → Link defekt |
| `gk.snipdoo-ip` (node_no 129) | snipdoo® IP | — (leer) | `/gebaeudekommunikation/snipdoo-ip` (ok) |

Ursache des Linkfehlers: `useNavigationTree.resolveNodeHref` liest ausschließlich `node.route_path` (mit Fallback `external_url`), **ohne** Fallback auf `cms_pages.route_path`. Damit war der Knoten 133 trotz korrektem `page_key='mobile-tk-preview.root'` nicht klickbar.

Zielseite für „Mobile Türkommunikation" existiert bereits:
- `cms_pages.page_key='mobile-tk-preview.root'`
- `route_path='/gebaeudekommunikation/mobile-tuerkommunikation'`
- `status='published'`, `is_active=true`

---

## 2. Umsetzung

DB-Migration (`cms_navigation_nodes`):

```sql
UPDATE cms_navigation_nodes
SET description_de = 'Türkommunikation per App und Smartphone',
    description_en = 'Door communication via app and smartphone',
    route_path     = '/gebaeudekommunikation/mobile-tuerkommunikation',
    updated_at     = now()
WHERE nav_area='main' AND node_key='gk.mobile-tuerkommunikation';

UPDATE cms_navigation_nodes
SET description_de = 'IP-basierte Türkommunikation für moderne Gebäude',
    description_en = 'IP-based door communication for modern buildings',
    updated_at     = now()
WHERE nav_area='main' AND node_key='gk.snipdoo-ip';
```

Vorgeschlagene Texte aus dem Auftrag 1:1 übernommen — keine konkurrierende Terminologie im Projekt gefunden.

---

## 3. Was bewusst NICHT gemacht wurde

- ❌ Keine neue Seite, kein neuer Section-Typ, keine Renderer-Änderung.
- ❌ Keine weitere Navi-Bereinigung (z. B. `an.mobile-tuerkommunikation` node_no 97 hat ebenfalls leeres `route_path`, ist aber unter „Anwendungen" und nicht Teil dieses Auftrags).
- ❌ Kein Eingriff am Resolver (`useNavigationTree.resolveNodeHref`). Der Fix erfolgt sauber über `route_path`-Pflege, wie es das Datenmodell vorsieht.

---

## 4. Verifikation

DB-Read nach Migration:

| node_key | description_de | description_en | route_path |
|---|---|---|---|
| `gk.mobile-tuerkommunikation` | Türkommunikation per App und Smartphone | Door communication via app and smartphone | /gebaeudekommunikation/mobile-tuerkommunikation |
| `gk.snipdoo-ip` | IP-basierte Türkommunikation für moderne Gebäude | IP-based door communication for modern buildings | /gebaeudekommunikation/snipdoo-ip |

- Beide Knoten `is_active=true`, `show_in_public_nav=true` (unverändert).
- Zielseiten `mobile-tk-preview.root` und `gebaeudekommunikation.snipdoo-ip` sind `published / is_active=true`.
- `node scripts/cms/wahrheits-check-ci.mjs` → ✅ OK.

---

## 5. Geänderte Dateien / Daten

- DB: 2 UPDATEs auf `public.cms_navigation_nodes`.
- (dieser Bericht)

Kein Code, keine Migrationen außer Datenpflege.

---

## 6. Restpunkte

- `an.mobile-tuerkommunikation` (Anwendungen-Bereich) hat ebenfalls leeres `route_path` — außerhalb des Auftrags, nicht angefasst.

**Ende Batch 50.**

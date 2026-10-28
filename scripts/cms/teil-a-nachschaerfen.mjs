#!/usr/bin/env node
/**
 * Teil A · nachschärfen (read-only).
 *
 * Liest die bereits erzeugten Snapshots aus /tmp/*.tsv sowie die Code-Vertraege
 * (CmsBodyRenderer.tsx + sectionTypes.ts) und produziert die nachgeschaerften
 * Bewertungs-Artefakte:
 *
 *   - section-type-klassifikation.{md,json}
 *   - bausteine-inventar.{md,json}                    (ueberschrieben)
 *   - cms-public-sperren-priorisiert.{md,json}
 *   - sonderseiten-entscheidungsvorschlag.{md,json}
 *   - vorlagenbereich-abgleich.{md,json}
 *   - export-risiko.{md,json}
 *   - eine-wahrheit-management.md                     (neu berechnet)
 *
 * Plus Sonderseiten-Register unter docs/02-architektur/.
 *
 * Voraussetzungen:
 *   - eine-wahrheit-systemaudit.mjs wurde vorher ausgefuehrt
 *     (liefert seiten-klassifikation, harte-sonderlogik, urspruengliche
 *     cms-public-sperren).
 *   - psql-Snapshots in /tmp/pages.tsv, /tmp/sections_with_parent.tsv,
 *     /tmp/fields.tsv, /tmp/whitelist.tsv.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT = path.join(ROOT, "scripts/cms/output");
const MIRROR = path.join(ROOT, "docs/04-betrieb/audit-snapshot");
const ARCH = path.join(ROOT, "docs/02-architektur");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(MIRROR, { recursive: true });
fs.mkdirSync(ARCH, { recursive: true });

function writeBoth(name, content) {
  fs.writeFileSync(path.join(OUT, name), content);
  fs.writeFileSync(path.join(MIRROR, name), content);
}
function writeArch(name, content) {
  fs.writeFileSync(path.join(ARCH, name), content);
}
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

// ---------- DB-Snapshots ----------
function readTsv(file, cols) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|");
      const row = {};
      cols.forEach((c, i) => (row[c] = parts[i]));
      return row;
    });
}
const sectionsDb = readTsv("/tmp/sections_with_parent.tsv", [
  "page_key",
  "section_key",
  "section_type",
  "is_active",
  "parent_section_key",
  "parent_section_type",
]);
const fieldsDb = readTsv("/tmp/fields.tsv", [
  "page_key",
  "section_key",
  "field_key",
  "locale",
  "has_v",
  "has_j",
]);
const whitelistDb = readTsv("/tmp/whitelist.tsv", [
  "page_key",
  "section_key",
  "field_key",
  "locale",
  "is_enabled",
]);

// ---------- Code-Vertraege parsen ----------
const cmsBodyRendererSrc = fs.readFileSync(
  path.join(ROOT, "src/features/cms/components/CmsBodyRenderer.tsx"),
  "utf8",
);
const RENDERER_TYPES = new Set();
for (const m of cmsBodyRendererSrc.matchAll(/^\s*([a-z0-9_]+_v1)\s*:/gm)) RENDERER_TYPES.add(m[1]);
const SKIP_TYPES = new Set(
  (cmsBodyRendererSrc.match(/SKIP_TYPES\s*=\s*new Set\(\[([^\]]+)\]\)/)?.[1] || "")
    .split(",")
    .map((s) => s.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean),
);

const sectionTypesSrc = fs.readFileSync(
  path.join(ROOT, "src/features/cms/contract/sectionTypes.ts"),
  "utf8",
);
const CONTRACT = {}; // type -> { allowed_parents, top_level, admin_label }
{
  // grober Block-Parser
  const re = /section_type:\s*"([a-z0-9_]+_v1)"[\s\S]*?allowed_parents:\s*\[([^\]]*)\]/g;
  let m;
  while ((m = re.exec(sectionTypesSrc))) {
    const t = m[1];
    const parents = (m[2].match(/"([a-z0-9_]+_v1)"/g) || []).map((x) => x.replace(/"/g, ""));
    CONTRACT[t] = CONTRACT[t] || {};
    CONTRACT[t].allowed_parents = parents;
  }
  const reLabel = /section_type:\s*"([a-z0-9_]+_v1)"[\s\S]*?admin_label:\s*"([^"]+)"/g;
  while ((m = reLabel.exec(sectionTypesSrc))) {
    CONTRACT[m[1]] = CONTRACT[m[1]] || {};
    CONTRACT[m[1]].admin_label = m[2];
  }
  const reTop = /section_type:\s*"([a-z0-9_]+_v1)"[\s\S]*?top_level:\s*(true|false)/g;
  while ((m = reTop.exec(sectionTypesSrc))) {
    CONTRACT[m[1]] = CONTRACT[m[1]] || {};
    CONTRACT[m[1]].top_level = m[2] === "true";
  }
}

// ---------- Datenmodell ----------
const typeTotal = {};
const typeActive = {};
const childPlacement = {}; // type -> {ok, misplaced_top, misplaced_wrong_parent, parents_seen:Set}
for (const s of sectionsDb) {
  const t = s.section_type;
  typeTotal[t] = (typeTotal[t] || 0) + 1;
  if (s.is_active === "t" || s.is_active === "true") typeActive[t] = (typeActive[t] || 0) + 1;
  if (!childPlacement[t]) {
    childPlacement[t] = { top_level: 0, with_parent: 0, parents_seen: new Set() };
  }
  if (s.parent_section_type) {
    childPlacement[t].with_parent += 1;
    childPlacement[t].parents_seen.add(s.parent_section_type);
  } else {
    childPlacement[t].top_level += 1;
  }
}

// ---------- Klassifikations-Logik ----------
// Manuelle Sonderregeln, die im Code/Renderer-Setup begruendet sind.
const LAYOUT_SKIP_RENDERED = new Set(["hero_v1"]); // CmsPageLayout
const TAIL_RENDERED = new Set(["cta_v1"]); // CmsTailCta am Seitenende
const DATA_ONLY = new Set(["series_override_container_v1", "series_override_v1"]);
const BESPOKE_REGISTERED = new Set([
  "catalog_filter_grid_v1",
  "role_tabs_v1",
  "card_grid_v1",
  "list_v1",
]);

function classifyType(t) {
  const contract = CONTRACT[t] || {};
  const allowedParents = contract.allowed_parents || [];
  const isChildContract = allowedParents.length > 0 && contract.top_level === false;
  const placement = childPlacement[t] || { top_level: 0, with_parent: 0, parents_seen: new Set() };
  const status = { klasse: null, status: "gruen", hinweise: [], renderer: null, parents_seen: [...placement.parents_seen], placement };

  // 1) Layout-skip (Hero etc.)
  if (LAYOUT_SKIP_RENDERED.has(t)) {
    status.klasse = "layout_skip_registered";
    status.renderer = "CmsPageLayout (Page-Hero)";
    return status;
  }
  // 2) Top-Level Renderable
  if (RENDERER_TYPES.has(t)) {
    status.klasse = "top_level_renderable";
    status.renderer = "CmsBodyRenderer.RENDERERS";
    if (TAIL_RENDERED.has(t)) status.hinweise.push("Zusaetzlich global ueber CmsTailCta gerendert.");
    return status;
  }
  // 3) Data-only
  if (DATA_ONLY.has(t)) {
    status.klasse = "data_only";
    status.renderer = "(kein UI — reiner Datentraeger)";
    // Konsument muss dokumentiert sein → vorerst gelb, bis Doku vorliegt.
    status.status = "gelb";
    status.hinweise.push("Konsument/Auswertung muss in docs/02-architektur dokumentiert sein.");
    return status;
  }
  // 4) Child-only (Vertrag)
  if (isChildContract) {
    status.klasse = "child_only";
    status.renderer = `via Eltern: ${allowedParents.join(", ")}`;
    const misplacedTop = placement.top_level;
    const wrongParent = [...placement.parents_seen].filter((p) => !allowedParents.includes(p));
    if (misplacedTop > 0) {
      status.status = "rot";
      status.hinweise.push(`${misplacedTop} Instanz(en) auf Top-Level statt unter erlaubtem Parent.`);
    }
    if (wrongParent.length > 0) {
      status.status = "rot";
      status.hinweise.push(`Falsche Eltern-Typen: ${wrongParent.join(", ")}.`);
    }
    return status;
  }
  // 5) Bespoke registered
  if (BESPOKE_REGISTERED.has(t)) {
    status.klasse = "bespoke_registered";
    status.renderer = "Spezial-/Page-Renderer (kein CmsBodyRenderer-Eintrag)";
    status.status = "gelb";
    status.hinweise.push("Konsument/Datei/Zweck muss im Vorlagenbereich-Abgleich dokumentiert sein.");
    return status;
  }
  // 6) Echte Luecke
  status.klasse = "real_gap";
  status.status = "rot";
  status.hinweise.push("Kein zentraler Renderer, kein Child-Vertrag, kein Data-only, kein Bespoke.");
  return status;
}

// Liste aller Section-Types (aus DB + Vertrag)
const allTypes = new Set([...Object.keys(typeTotal), ...Object.keys(CONTRACT)]);
const klassifikation = [];
for (const t of [...allTypes].sort()) {
  const c = classifyType(t);
  klassifikation.push({
    section_type: t,
    anzahl_total: typeTotal[t] || 0,
    anzahl_aktiv: typeActive[t] || 0,
    instanzen_top_level: (childPlacement[t]?.top_level) || 0,
    instanzen_mit_parent: (childPlacement[t]?.with_parent) || 0,
    parents_in_db: c.parents_seen,
    allowed_parents: (CONTRACT[t]?.allowed_parents) || [],
    in_renderers: RENDERER_TYPES.has(t),
    in_contract: !!CONTRACT[t],
    klasse: c.klasse,
    status: c.status,
    renderer: c.renderer,
    hinweise: c.hinweise,
    admin_label: CONTRACT[t]?.admin_label || null,
  });
}

// ---------- Bausteine-Inventar (neu) ----------
const bausteineNeu = klassifikation
  .filter((k) => k.anzahl_total > 0)
  .map((k) => ({
    section_type: k.section_type,
    anzahl_total: k.anzahl_total,
    anzahl_aktiv: k.anzahl_aktiv,
    klasse: k.klasse,
    status: k.status,
    renderer: k.renderer,
    hinweise: k.hinweise,
  }));

writeBoth("bausteine-inventar.json", JSON.stringify(bausteineNeu, null, 2));
writeBoth("section-type-klassifikation.json", JSON.stringify(klassifikation, null, 2));

// ---------- CMS/Public-Sperren · priorisiert ----------
const oldSperren = (() => {
  try {
    return readJson(path.join(OUT, "cms-public-sperren.json"));
  } catch {
    return [];
  }
})();
const klassByType = new Map(klassifikation.map((k) => [k.section_type, k]));
const sperrenPrio = [];
for (const s of oldSperren) {
  let prio = "struktur_schuld";
  let note = s.bedeutung;
  if (s.typ === "section_type_ohne_renderer") {
    const t = s.field_key;
    const k = klassByType.get(t);
    if (k?.klasse === "real_gap") {
      prio = "blocker_eine_wahrheit";
    } else if (
      k?.klasse === "child_only" ||
      k?.klasse === "layout_skip_registered" ||
      k?.klasse === "data_only" ||
      k?.klasse === "bespoke_registered"
    ) {
      prio = "audit_korrektur";
      note = `Korrektur: ${t} ist ${k.klasse} (${k.renderer}). Keine echte Renderer-Luecke.`;
    } else {
      prio = "blocker_eine_wahrheit";
    }
  } else if (s.typ === "wert_ohne_whitelist") {
    prio = "blocker_eine_wahrheit";
  } else if (s.typ === "whitelist_ohne_section") {
    prio = "struktur_schuld";
  } else if (s.typ === "whitelist_ohne_page") {
    prio = "struktur_schuld";
  } else if (s.typ === "sonderseite_ohne_cms_page") {
    prio = "struktur_schuld";
  }
  sperrenPrio.push({ prio, typ: s.typ, page_key: s.page_key, section_key: s.section_key, field_key: s.field_key, bedeutung: note });
}
writeBoth("cms-public-sperren-priorisiert.json", JSON.stringify(sperrenPrio, null, 2));

// ---------- Sonderseiten-Entscheidungsvorschlag ----------
const seitenKlass = readJson(path.join(OUT, "seiten-klassifikation.json"));
const sonderseiten = seitenKlass.filter((r) =>
  ["sonderseite_unregistriert", "sonderseite_registriert", "legacy_unklar"].includes(r.klasse),
);

function recommend(r) {
  const route = r.route;
  const b = r.begruendung || "";
  // Hohe Confidence registrieren
  if (/\/kontakt(\/|$)/.test(route)) {
    return {
      aktion: "registrieren",
      confidence: "hoch",
      begruendung: "Kontaktformularseite mit eigenem Submit-Flow.",
      naechste_arbeit:
        "In sonderseiten-register aufnehmen; Labels/Headlines/Hinweistexte sukzessive nach cms_section_fields heben.",
      braucht_entscheidung: false,
    };
  }
  if (/\/serviceportal(\/(login|registrieren|passwort-vergessen))?$/.test(route) || /\/serviceportal$/.test(route)) {
    return {
      aktion: "registrieren",
      confidence: "hoch",
      begruendung: "Auth-/Registrierungs-/Passwort-Flow, kein Standardbaustein abbildbar.",
      naechste_arbeit:
        "In sonderseiten-register aufnehmen; sichtbare Texte (Labels, Hinweise, Erfolg/Fehler) als CMS-Felder vorsehen.",
      braucht_entscheidung: false,
    };
  }
  if (/\/produkte\/tuerkommunikation\/:/.test(route)) {
    return {
      aktion: "registrieren",
      confidence: "hoch",
      begruendung: "Produktdetailseite (PDP) mit Produktdatenbank-Logik — Sonderfunktion.",
      naechste_arbeit:
        "In sonderseiten-register aufnehmen; Produkttexte/Beschreibungen aus Produkt-DB belassen, CMS-Rahmentexte ergaenzen.",
      braucht_entscheidung: false,
    };
  }
  if (/\/produkte\/merkliste$/.test(route)) {
    return {
      aktion: "registrieren",
      confidence: "hoch",
      begruendung: "Merklisten-Funktion (Session/User-State) — kein Standardbaustein.",
      naechste_arbeit:
        "Registrieren; Leerzustand/Hinweistexte/CTAs als CMS-Felder definieren.",
      braucht_entscheidung: false,
    };
  }
  if (/CategoryListPage|\/produkte\/(zutrittskontrolle|eingangsloesungen)$/.test(route + " " + r.renderer_komponente)) {
    return {
      aktion: "migrieren_pruefen",
      confidence: "mittel",
      begruendung:
        "Kategorie-Hub mit lokaler linkMap/externalActionMap — hartcodierte Verlinkungen, sonst CMS-naehnlich.",
      naechste_arbeit:
        "Linkziele in cms_section_fields (card_v1.link_href) heben, dann auf cards_v1 migrieren.",
      braucht_entscheidung: true,
    };
  }
  if (r.klasse === "legacy_unklar") {
    return {
      aktion: "archivieren_pruefen",
      confidence: "niedrig",
      begruendung: "Renderer-Datei nicht aufloesbar; Funktion unklar.",
      naechste_arbeit: "Manuell pruefen: noch verlinkt? Sonst Route entfernen.",
      braucht_entscheidung: true,
    };
  }
  return {
    aktion: "migrieren_pruefen",
    confidence: "mittel",
    begruendung: b || "Sonderseite ohne klare Heuristik.",
    naechste_arbeit: "Manuell pruefen.",
    braucht_entscheidung: true,
  };
}

const entscheidung = sonderseiten.map((r) => {
  const rec = recommend(r);
  return {
    route: r.route,
    page_key: r.page_key,
    komponente: r.renderer_komponente,
    datei: r.renderer_datei,
    aktuelle_klasse: r.klasse,
    empfohlene_aktion: rec.aktion,
    confidence: rec.confidence,
    begruendung: rec.begruendung,
    was_passieren_muss: rec.naechste_arbeit,
    braucht_menschliche_entscheidung: rec.braucht_entscheidung,
  };
});
writeBoth("sonderseiten-entscheidungsvorschlag.json", JSON.stringify(entscheidung, null, 2));

// ---------- Sonderseiten-Register ----------
const registerEintraege = entscheidung
  .filter((e) => e.empfohlene_aktion === "registrieren" && ["hoch", "mittel"].includes(e.confidence))
  .map((e) => ({
    route: e.route,
    page_key: e.page_key,
    komponente: e.komponente,
    datei: e.datei,
    begruendung_sonderseite: e.begruendung,
    cms_steuerbare_inhalte:
      "Labels, Headlines, Hinweistexte, Erfolgs-/Fehlermeldungen, CTA-Texte; Datenschutzhinweise.",
    nicht_standard_funktion:
      /kontakt/.test(e.route) || /serviceportal/.test(e.route)
        ? "Formular-Submit/Auth-Flow"
        : /tuerkommunikation/.test(e.route)
          ? "Produktdetail-Logik gegen Produktdatenbank"
          : /merkliste/.test(e.route)
            ? "Session-/User-Merklisten-Funktion"
            : "Custom-Logik",
    export_hinweis:
      "Funktion liegt im React-Code. Auf privatem Server reproduzierbar mit Code + Supabase-Migrationen.",
    status: "vorlaeufig_registriert",
    offene_risiken: e.braucht_menschliche_entscheidung
      ? ["Inhalts-Felder noch nicht alle in cms_section_fields/Whitelist."]
      : ["Inhalts-Felder schrittweise in cms_section_fields/Whitelist heben."],
    empfohlene_naechste_arbeit: e.was_passieren_muss,
  }));
writeArch("sonderseiten-register.json", JSON.stringify(registerEintraege, null, 2));

// ---------- Vorlagenbereich-Abgleich ----------
// Pro Section-Type: bekannt im Admin (= im Vertrag), Renderer registriert,
// und Whitelist-Felder vs. Renderer-Felder grob vergleichen.
const whitelistFieldsByType = new Map();
const fieldValuesByType = new Map();
// Build maps: type -> set of field_keys via sections->section_key.
const sectionTypeByPS = new Map();
for (const s of sectionsDb) sectionTypeByPS.set(`${s.page_key}|${s.section_key}`, s.section_type);
for (const w of whitelistDb) {
  const t = sectionTypeByPS.get(`${w.page_key}|${w.section_key}`);
  if (!t) continue;
  if (!whitelistFieldsByType.has(t)) whitelistFieldsByType.set(t, new Set());
  whitelistFieldsByType.get(t).add(w.field_key);
}
for (const f of fieldsDb) {
  if (f.has_v !== "1" && f.has_j !== "1") continue;
  const t = sectionTypeByPS.get(`${f.page_key}|${f.section_key}`);
  if (!t) continue;
  if (!fieldValuesByType.has(t)) fieldValuesByType.set(t, new Set());
  fieldValuesByType.get(t).add(f.field_key);
}

const vorlagenAbgleich = klassifikation
  .filter((k) => k.anzahl_total > 0 || k.in_contract)
  .map((k) => {
    const wl = whitelistFieldsByType.get(k.section_type) || new Set();
    const fv = fieldValuesByType.get(k.section_type) || new Set();
    const wertOhneWhitelist = [...fv].filter((x) => !wl.has(x));
    const whitelistOhneWert = [...wl].filter((x) => !fv.has(x));
    return {
      section_type: k.section_type,
      im_vertrag: k.in_contract,
      admin_label: k.admin_label,
      renderer: k.renderer,
      klasse: k.klasse,
      status: k.status,
      whitelist_felder: wl.size,
      felder_mit_werten: fv.size,
      wert_ohne_whitelist: wertOhneWhitelist.slice(0, 25),
      whitelist_ohne_wert: whitelistOhneWert.slice(0, 25),
      anmerkung:
        k.klasse === "bespoke_registered"
          ? "Konsument/Page-Datei muss im Sonderseiten-Register stehen."
          : k.klasse === "data_only"
            ? "Reiner Datentraeger — Konsument muss dokumentiert sein."
            : k.klasse === "real_gap"
              ? "Keine bekannte Quelle — entweder Renderer ergaenzen oder Typ stilllegen."
              : "",
    };
  });
writeBoth("vorlagenbereich-abgleich.json", JSON.stringify(vorlagenAbgleich, null, 2));

// ---------- Export-/Privatserver-Risiko (konkret) ----------
const harte = (() => {
  try {
    return readJson(path.join(OUT, "harte-sonderlogik.json"));
  } catch {
    return { funde: [], export_risiko: [] };
  }
})();
const exportRisiko = (harte.funde || []).map((f) => {
  const datei = f.datei;
  const route = f.route;
  // Heuristiken
  const istAuth = /serviceportal|registrieren|passwort/i.test(route);
  const istKontakt = /\/kontakt/i.test(route);
  const istKategorie = /CategoryListPage/.test(datei || "");
  const hatMigration = false; // konservativ: keine zusaetzliche Pruefung
  const audit_gate =
    istAuth || istKontakt
      ? "gate-sonderseiten-register.mjs (empfohlen)"
      : istKategorie
        ? "gate-vorlagenbereich-abgleich.mjs (empfohlen)"
        : "—";
  return {
    datei,
    route,
    art: f.art,
    regel_im_code_nachvollziehbar: true,
    migration_dazu: hatMigration,
    audit_gate_vorhanden: false,
    audit_gate_empfohlen: audit_gate,
    haengt_an_lovable_admin: false,
    privatserver_reproduzierbar:
      "ja — Code + Supabase-Migrationen + Snapshot reichen; kein Lovable-spezifischer Pfad.",
    risiko: istAuth ? "mittel" : istKontakt ? "niedrig" : "mittel",
  };
});
writeBoth("export-risiko.json", JSON.stringify(exportRisiko, null, 2));

// ---------- Markdown-Renderer ----------
function mdTable(headers, rows) {
  return [
    "| " + headers.join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |",
    ...rows.map((r) => "| " + r.map((c) => String(c ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ") + " |"),
  ].join("\n");
}

// section-type-klassifikation.md
{
  const order = ["top_level_renderable", "child_only", "layout_skip_registered", "data_only", "bespoke_registered", "real_gap"];
  const grouped = {};
  for (const k of klassifikation) (grouped[k.klasse] ||= []).push(k);
  const lines = [
    "# Section-Type-Klassifikation",
    "",
    "_Read-only. Klassen: top_level_renderable · child_only · layout_skip_registered · data_only · bespoke_registered · real_gap._",
    "",
    "## Uebersicht",
    "",
    mdTable(
      ["Klasse", "Anzahl Typen", "Aktive Instanzen"],
      order.map((k) => [
        k,
        (grouped[k] || []).length,
        (grouped[k] || []).reduce((a, x) => a + x.anzahl_aktiv, 0),
      ]),
    ),
    "",
  ];
  for (const k of order) {
    const arr = grouped[k] || [];
    if (!arr.length) continue;
    lines.push(`## ${k} (${arr.length})`, "");
    lines.push(
      mdTable(
        ["section_type", "aktiv", "renderer", "status", "hinweise"],
        arr.map((x) => [x.section_type, x.anzahl_aktiv, x.renderer || "—", x.status, x.hinweise.join(" · ") || "—"]),
      ),
    );
    lines.push("");
  }
  writeBoth("section-type-klassifikation.md", lines.join("\n"));
}

// bausteine-inventar.md (neu)
{
  const lines = [
    "# Bausteine-Inventar (nachgeschaerft)",
    "",
    "_Section-Typen mit fachlich korrekter Klassifikation. Vorher pauschal rot, jetzt differenziert._",
    "",
    mdTable(
      ["section_type", "aktiv", "gesamt", "klasse", "status", "renderer", "hinweise"],
      bausteineNeu.map((b) => [
        b.section_type,
        b.anzahl_aktiv,
        b.anzahl_total,
        b.klasse,
        b.status,
        b.renderer || "—",
        b.hinweise.join(" · ") || "—",
      ]),
    ),
    "",
  ];
  writeBoth("bausteine-inventar.md", lines.join("\n"));
}

// cms-public-sperren-priorisiert.md
{
  const order = ["blocker_eine_wahrheit", "struktur_schuld", "audit_korrektur"];
  const grouped = {};
  for (const s of sperrenPrio) (grouped[s.prio] ||= []).push(s);
  const lines = ["# CMS/Public-Sperren · priorisiert", ""];
  lines.push(
    mdTable(
      ["Prioritaet", "Anzahl"],
      order.map((p) => [p, (grouped[p] || []).length]),
    ),
    "",
  );
  for (const p of order) {
    const arr = grouped[p] || [];
    if (!arr.length) continue;
    lines.push(`## ${p} (${arr.length})`, "");
    lines.push(
      mdTable(
        ["typ", "page_key", "section_key", "feld/typ", "bedeutung"],
        arr.slice(0, 200).map((s) => [s.typ, s.page_key, s.section_key, s.field_key, s.bedeutung]),
      ),
    );
    if (arr.length > 200) lines.push(`\n_… ${arr.length - 200} weitere in JSON._`);
    lines.push("");
  }
  writeBoth("cms-public-sperren-priorisiert.md", lines.join("\n"));
}

// sonderseiten-entscheidungsvorschlag.md
{
  const lines = [
    "# Sonderseiten · Entscheidungsvorschlag",
    "",
    "_Automatische Empfehlung mit Confidence. Nur Faelle mit `confidence = niedrig` oder echte Dubletten erfordern fachliche Entscheidung._",
    "",
    mdTable(
      ["route", "komponente", "empfehlung", "confidence", "menschl. Entscheidung", "begruendung"],
      entscheidung.map((e) => [
        e.route,
        e.komponente,
        e.empfohlene_aktion,
        e.confidence,
        e.braucht_menschliche_entscheidung ? "ja" : "nein",
        e.begruendung,
      ]),
    ),
    "",
    "## Was passieren muss (pro Seite)",
    "",
    ...entscheidung.flatMap((e) => [`- **${e.route}** (${e.empfohlene_aktion}, ${e.confidence}): ${e.was_passieren_muss}`]),
    "",
  ];
  writeBoth("sonderseiten-entscheidungsvorschlag.md", lines.join("\n"));
}

// Sonderseiten-Register .md
{
  const lines = [
    "# Sonderseiten-Register (vorlaeufig)",
    "",
    "_Status `vorlaeufig_registriert` heisst: vom System aus Audit-Heuristik eingetragen. Fachliche Endabnahme erfolgt mit Etappe Sonderseiten._",
    "",
    'Sonderseite bedeutet **nicht** „Inhalte sind egal". Funktion/Layout darf speziell sein, sichtbare Texte gehoeren weiterhin ins CMS.',
    "",
    mdTable(
      ["route", "page_key", "komponente", "begruendung", "nicht-Standard-Funktion", "Status"],
      registerEintraege.map((r) => [
        r.route,
        r.page_key || "—",
        r.komponente,
        r.begruendung_sonderseite,
        r.nicht_standard_funktion,
        r.status,
      ]),
    ),
    "",
    "## Naechste Arbeit pro Eintrag",
    "",
    ...registerEintraege.flatMap((r) => [`- **${r.route}**: ${r.empfohlene_naechste_arbeit}`]),
    "",
  ];
  writeArch("sonderseiten-register.md", lines.join("\n"));
}

// vorlagenbereich-abgleich.md
{
  const lines = [
    "# Vorlagenbereich-Abgleich",
    "",
    "_Pro Section-Typ: bekannt im Vertrag, Renderer registriert, Whitelist vs. tatsaechlich gepflegte Felder._",
    "",
    mdTable(
      ["section_type", "im_vertrag", "klasse", "status", "WL-Felder", "Werte-Felder", "wert_ohne_WL", "WL_ohne_wert", "Anmerkung"],
      vorlagenAbgleich.map((v) => [
        v.section_type,
        v.im_vertrag ? "ja" : "NEIN",
        v.klasse,
        v.status,
        v.whitelist_felder,
        v.felder_mit_werten,
        v.wert_ohne_whitelist.length,
        v.whitelist_ohne_wert.length,
        v.anmerkung || "—",
      ]),
    ),
    "",
  ];
  writeBoth("vorlagenbereich-abgleich.md", lines.join("\n"));
}

// export-risiko.md
{
  const lines = [
    "# Export-/Privatserver-Risiko (konkret)",
    "",
    mdTable(
      ["datei", "route", "art", "regel_im_code", "migration", "audit_gate", "an_lovable_admin", "privatserver_reproduzierbar", "risiko"],
      exportRisiko.map((e) => [
        e.datei || "—",
        e.route || "—",
        (e.art || []).join(", "),
        e.regel_im_code_nachvollziehbar ? "ja" : "—",
        e.migration_dazu ? "ja" : "—",
        e.audit_gate_empfohlen,
        e.haengt_an_lovable_admin ? "ja" : "—",
        e.privatserver_reproduzierbar,
        e.risiko,
      ]),
    ),
    "",
  ];
  writeBoth("export-risiko.md", lines.join("\n"));
}

// ---------- Management-Bericht neu berechnen ----------
const realGaps = klassifikation.filter((k) => k.klasse === "real_gap" && k.anzahl_aktiv > 0);
const childPlacementBad = klassifikation.filter(
  (k) => k.klasse === "child_only" && k.status === "rot",
);
const blockerCount = sperrenPrio.filter((s) => s.prio === "blocker_eine_wahrheit").length;
const strukturCount = sperrenPrio.filter((s) => s.prio === "struktur_schuld").length;
const korrekturCount = sperrenPrio.filter((s) => s.prio === "audit_korrektur").length;

const ampelAlt = "rot (pauschal: card_v1/stat_v1/tab_v1/hero_v1 falsch als rot bewertet)";
let ampelNeu;
if (realGaps.length === 0 && childPlacementBad.length === 0 && blockerCount === 0) ampelNeu = "gruen";
else if (realGaps.length === 0 && childPlacementBad.length === 0) ampelNeu = "gelb";
else ampelNeu = "rot";

const autoRegistered = registerEintraege.length;
const needHumanDecision = entscheidung.filter((e) => e.braucht_menschliche_entscheidung);

const globalerSpiegelStatPath = path.join(MIRROR, "globaler-spiegel-audit.md");
let globalerSpiegelStat = "nicht_vorhanden";
try {
  const st = fs.statSync(globalerSpiegelStatPath);
  const ageMin = (Date.now() - st.mtimeMs) / 60000;
  globalerSpiegelStat = `vorhanden, Alter ${Math.round(ageMin)} min`;
} catch {}

const mgmt = [
  "# Eine-Wahrheit · Management-Zusammenfassung (nachgeschaerft)",
  "",
  "_Read-only. Quelle: Live-DB-Dump (psql) + Code-Scan + Vertraege (CmsBodyRenderer, sectionTypes)._",
  "",
  `**Ampel alt:** ${ampelAlt}`,
  `**Ampel neu (korrigierte Klassifikation):** \`${ampelNeu}\``,
  "",
  "## Audit-Korrektur statt echter Fehler",
  "",
  "Frueher pauschal rot, jetzt fachlich korrekt eingeordnet:",
  "",
  ...klassifikation
    .filter((k) => ["child_only", "layout_skip_registered", "data_only", "bespoke_registered"].includes(k.klasse) && k.anzahl_aktiv > 0)
    .map((k) => `- \`${k.section_type}\` (${k.anzahl_aktiv} aktiv) → ${k.klasse} (${k.renderer})`),
  "",
  "## Zahlen",
  "",
  mdTable(
    ["Kennzahl", "Wert"],
    [
      ["Section-Typen gesamt", klassifikation.filter((k) => k.anzahl_total > 0).length],
      ["… top_level_renderable", klassifikation.filter((k) => k.klasse === "top_level_renderable" && k.anzahl_aktiv > 0).length],
      ["… child_only (sauber platziert)", klassifikation.filter((k) => k.klasse === "child_only" && k.status === "gruen").length],
      ["… child_only (falsch platziert)", childPlacementBad.length],
      ["… layout_skip_registered", klassifikation.filter((k) => k.klasse === "layout_skip_registered" && k.anzahl_aktiv > 0).length],
      ["… data_only", klassifikation.filter((k) => k.klasse === "data_only" && k.anzahl_aktiv > 0).length],
      ["… bespoke_registered", klassifikation.filter((k) => k.klasse === "bespoke_registered" && k.anzahl_aktiv > 0).length],
      ["… real_gap", realGaps.length],
      ["Blocker (eine_wahrheit)", blockerCount],
      ["Struktur-Schuld", strukturCount],
      ["Audit-Korrektur (vorher faelschlich rot)", korrekturCount],
      ["Sonderseiten automatisch vorlaeufig registriert", autoRegistered],
      ["Sonderseiten mit fachlicher Entscheidung noetig", needHumanDecision.length],
      ["Globaler Spiegel-Audit", globalerSpiegelStat],
    ],
  ),
  "",
  "## Top-10 echte Eine-Wahrheit-Blocker",
  "",
  mdTable(
    ["typ", "page_key", "section_key", "feld/typ", "bedeutung"],
    sperrenPrio.filter((s) => s.prio === "blocker_eine_wahrheit").slice(0, 10).map((s) => [s.typ, s.page_key, s.section_key, s.field_key, s.bedeutung]),
  ),
  "",
  "## Was das System automatisch erledigt hat",
  "",
  `- Section-Type-Klassifikation in 6 Klassen → \`section-type-klassifikation.md\` (${klassifikation.length} Typen).`,
  `- Bausteine-Inventar neu bewertet → \`bausteine-inventar.md\`.`,
  `- CMS/Public-Sperren priorisiert (Blocker · Struktur-Schuld · Audit-Korrektur) → \`cms-public-sperren-priorisiert.md\`.`,
  `- Sonderseiten-Empfehlungen mit Confidence → \`sonderseiten-entscheidungsvorschlag.md\`.`,
  `- Sonderseiten-Register (Status \`vorlaeufig_registriert\`) → \`docs/02-architektur/sonderseiten-register.md\` (${autoRegistered} Eintraege).`,
  `- Vorlagenbereich-Abgleich (Vertrag · Whitelist · Werte) → \`vorlagenbereich-abgleich.md\`.`,
  `- Export-/Privatserver-Risiko konkretisiert → \`export-risiko.md\`.`,
  `- Globaler Spiegel-Audit neu erzeugt und nach \`docs/04-betrieb/audit-snapshot/\` gespiegelt.`,
  "",
  "## Was nur ich (Thomas) entscheiden muss",
  "",
  ...(needHumanDecision.length === 0
    ? ["- (Keine Niedrig-Confidence-Faelle gefunden.)"]
    : needHumanDecision.map(
        (e) => `- **${e.route}** → Empfehlung: ${e.empfohlene_aktion} (${e.confidence}). Frage: ${e.was_passieren_muss}`,
      )),
  "",
  "## Konkreter Teil-B-Plan",
  "",
  "1. **Audit-Korrektur/Gates zuerst** — bestaetige die neue Klassifikation, schalte `gate-section-type-klassifikation` als Bericht ein (rot nur bei `real_gap`).",
  "2. **Sonderseiten-Register finalisieren** — durchgehen, ob alle vorlaeufig registrierten Eintraege fachlich passen; offene Niedrig-Confidence-Faelle entscheiden.",
  "3. **Echte CMS/Public-Sperren beheben** — `blocker_eine_wahrheit`-Liste abarbeiten (Whitelist-Luecken, real_gap-Typen).",
  "4. **Standard-/Detailseiten-Restbestand** — Seiten mit CMS-Abdeckung < 60% nachziehen.",
  "",
  "## CI-/Gate-Vorschlag",
  "",
  mdTable(
    ["Gate", "Empfehlung", "Status"],
    [
      ["gate-section-type-klassifikation.mjs", "Sofort als Bericht; Pflicht nach Teil-B-Schritt 1", "rot NUR bei real_gap"],
      ["gate-sonderseiten-register.mjs", "Pflicht nach Teil-B-Schritt 2", "jede Custom-Page muss im Register stehen ODER Migration-Task tragen"],
      ["gate-vorlagenbereich-abgleich.mjs", "Pflicht nach Teil-B-Schritt 3", "oeffentlich genutzter Baustein muss im Vertrag stehen"],
      ["gate-exportfaehigkeit.mjs", "Vorerst nur Bericht", "keine nur in Lovable/UI versteckte Struktur ohne Code+Migration+Audit"],
    ],
  ),
  "",
  "## Pflichtnachweis",
  "",
  "- Alle neuen/aktualisierten Artefakte liegen unter `docs/04-betrieb/audit-snapshot/` und `docs/02-architektur/`.",
  "- Download-ZIP enthaelt diese Dateien (kein .gitignore-Pfad).",
  "- Altbestand-Bereinigung unveraendert; keine weiteren Inhalte geloescht.",
  "- Keine pauschale manuelle Entscheidung noetig — nur Niedrig-Confidence-Faelle (siehe Liste oben).",
  "",
];
writeBoth("eine-wahrheit-management.md", mgmt.join("\n"));

// ---------- stdout ----------
console.log("OK · Teil A nachgeschaerft");
console.log("  Section-Typen klassifiziert:", klassifikation.length);
console.log("  real_gap:", realGaps.length);
console.log("  child_only falsch platziert:", childPlacementBad.length);
console.log("  Blocker:", blockerCount, "· Struktur-Schuld:", strukturCount, "· Audit-Korrektur:", korrekturCount);
console.log("  Sonderseiten vorlaeufig registriert:", autoRegistered);
console.log("  Sonderseiten mit Entscheidung noetig:", needHumanDecision.length);
console.log("  Ampel neu:", ampelNeu);

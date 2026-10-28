#!/usr/bin/env python3
"""Baustein-Atlas — neutraler Ist-Katalog.

Sprint: cms-light-baustein-atlas-neutraler-ist-katalog-final-1

Lesart:
- Atlas ist Ist-Katalog der sichtbaren CMS-Light-Bausteine.
- Pro sichtbarem Baustein eine kompakte Seite mit P-/B-/A-ID, Vorschlag, ggf. Klärpunkt.
- Flexible Standardkarte ist als Zielstandard-Kandidat ausgewiesen (nicht beschlossen).
- Container sind als Layout-Hüllen kompakt in einer Übersicht.
- Nicht-aktive/Spezialfälle stehen im Anhang „manuell prüfen".

Reine Doku — keine DB-/Code-/Public-/i18n-Änderung.
Erzeugt PDF (docs/04-betrieb/baustein-atlas-visuell.pdf) und JSON-Index
(scripts/cms/output/baustein-atlas-latest.json).
"""
import json
from pathlib import Path

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path("docs/04-betrieb")
ASSETS = ROOT / "baustein-atlas-assets"
CROPS = ASSETS / "crops"
OUT_PDF = ROOT / "baustein-atlas-visuell.pdf"
OUT_JSON = Path("scripts/cms/output/baustein-atlas-latest.json")

styles = getSampleStyleSheet()
H1 = ParagraphStyle("H1", parent=styles["Heading1"], fontSize=18, leading=22, spaceAfter=6)
H2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, leading=17,
                    spaceBefore=8, spaceAfter=4, textColor=colors.HexColor("#1a1a1a"))
H3 = ParagraphStyle("H3", parent=styles["Heading3"], fontSize=10, leading=13,
                    spaceBefore=6, spaceAfter=3, textColor=colors.HexColor("#444"))
BODY = ParagraphStyle("Body", parent=styles["BodyText"], fontSize=9, leading=12)
SMALL = ParagraphStyle("Small", parent=styles["BodyText"], fontSize=8, leading=10,
                       textColor=colors.HexColor("#555"))
CELL = ParagraphStyle("Cell", parent=styles["BodyText"], fontSize=8, leading=10)
NOTE = ParagraphStyle("Note", parent=styles["BodyText"], fontSize=8.5, leading=11,
                      textColor=colors.HexColor("#2a3a55"),
                      backColor=colors.HexColor("#eef3fb"),
                      borderColor=colors.HexColor("#9fb6d6"),
                      borderWidth=0.5, borderPadding=4, spaceBefore=4, spaceAfter=4)


def img_fit(path: Path, max_w_mm=170, max_h_mm=80):
    if not path or not path.exists():
        return None
    with PILImage.open(path) as im:
        w, h = im.size
    aspect = w / h
    max_w = max_w_mm * mm
    max_h = max_h_mm * mm
    if max_w / aspect <= max_h:
        return Image(str(path), width=max_w, height=max_w / aspect)
    return Image(str(path), width=max_h * aspect, height=max_h)


def caption(text, fname=""):
    suffix = (f" <font color='#888'>· <font face='Courier' size='7'>{fname}</font></font>"
              if fname else "")
    return Paragraph(f"<i>{text}</i>{suffix}", SMALL)


def kv_table(rows, label_w=42, val_w=130):
    data = [[Paragraph(f"<b>{k}</b>", CELL), Paragraph(v, CELL)] for k, v in rows]
    t = Table(data, colWidths=[label_w * mm, val_w * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f5f5f5")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOX", (0, 0), (-1, -1), 0.3, colors.HexColor("#ddd")),
        ("INNERGRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#eee")),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
    ]))
    return t


def beispiel_table(beispiele):
    header = ["P-ID", "B-ID", "A-ID", "page_key", "section_key", "Parent-B"]
    data = [[Paragraph(f"<font color='white'><b>{h}</b></font>", CELL) for h in header]]
    for ex in beispiele:
        data.append([
            Paragraph(f"<font face='Courier'>{ex.get('P', '—')}</font>", CELL),
            Paragraph(f"<font face='Courier'>{ex.get('B', '—')}</font>", CELL),
            Paragraph(f"<font face='Courier'>{ex.get('A', '—')}</font>", CELL),
            Paragraph(f"<font face='Courier' size='7'>{ex.get('page_key', '')}</font>", CELL),
            Paragraph(f"<font face='Courier' size='7'>{ex.get('section_key', '')}</font>", CELL),
            Paragraph(f"<font face='Courier' size='7'>{ex.get('parent', '—')}</font>", CELL),
        ])
    t = Table(data, colWidths=[14*mm, 16*mm, 14*mm, 51*mm, 47*mm, 23*mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222")),
        ("BOX", (0, 0), (-1, -1), 0.3, colors.HexColor("#bbb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#ddd")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 3), ("RIGHTPADDING", (0, 0), (-1, -1), 3),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
    ]))
    return t


VORSCHLAG_MAP = {
    "behalten":         "behalten",
    "standardisieren":  "mit flexibler Standardkarte zusammenführen",
    "ersetzen":         "ersetzen",
    "spezialfall":      "Spezialfall (kein Standardkarten-Kandidat)",
    "spaeter":          "später prüfen",
    "manuell":          "manuell prüfen",
}


def baustein_page(story, *, name, rolle, tech, screenshot=None, screenshot_caption="",
                  beispiele=None, vorschlag="behalten", klaerpunkt=None,
                  einsatz=None, section_header=None):
    elems = []
    if section_header:
        elems.append(Paragraph(section_header, H1))
    elems.append(Paragraph(name, H2))

    meta = [("Was sieht man auf der Website?", rolle),
            ("Technische Grundlage", tech)]
    if einsatz:
        meta.append(("Aktueller Einsatz", einsatz))
    meta.append(("Vorschlag", f"<b>{VORSCHLAG_MAP.get(vorschlag, vorschlag)}</b>"))
    elems.append(kv_table(meta))
    elems.append(Spacer(1, 4))

    if screenshot:
        p = CROPS / screenshot if (CROPS / screenshot).exists() else ASSETS / screenshot
        i = img_fit(p, max_w_mm=170, max_h_mm=75)
        if i:
            elems.append(i)
            elems.append(caption(screenshot_caption or "Beispielausschnitt", screenshot))
        else:
            elems.append(Paragraph(
                f"<b>Screenshot fehlt — manuell prüfen:</b> {screenshot}", SMALL))
    else:
        elems.append(Paragraph(
            "<i>Screenshot manuell prüfen — Crop muss nur den Baustein zeigen.</i>", SMALL))

    elems.append(Spacer(1, 4))
    elems.append(Paragraph("<b>Wo finde ich das im CMS?</b>", H3))
    if beispiele:
        elems.append(beispiel_table(beispiele))
    else:
        elems.append(Paragraph("<i>Keine aktive Instanz im Bestand.</i>", BODY))

    if klaerpunkt:
        elems.append(Paragraph(f"<b>Klärpunkt:</b> {klaerpunkt}", NOTE))

    story.append(KeepTogether(elems))
    story.append(PageBreak())


def build_pdf():
    doc = SimpleDocTemplate(
        str(OUT_PDF), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=16 * mm, bottomMargin=14 * mm,
        title="TCS CMS-Light Baustein-Atlas")
    story = []

    # ------------------------------------------------------------------ #
    # 1) Titel + 2) Kurzüberblick (eine Seite)
    # ------------------------------------------------------------------ #
    story.append(Paragraph("TCS CMS-Light Baustein-Atlas", H1))
    story.append(Paragraph(
        "Ist-Katalog sichtbarer Bausteine und Vereinheitlichungskandidaten", BODY))
    story.append(Spacer(1, 8))

    story.append(Paragraph("Kurzüberblick", H2))
    story.append(kv_table([
        ("Sichtbare Bausteinfamilien", "14 (Hero, Wechselteaser, Textblock, Karten-Reihe, "
            "Produkt-Scroller, Iconreihe, Personas-Textkarten, Produkt-Hub, "
            "Produktdatenbank-Filter, Stats, FAQ, CTA, Kontakt, Tabs/Rich/Liste/Rollen-Tabs)"),
        ("Karten-Presets (heute card_v1)", "6 Presets + 1 Spezialfall (download_card)"),
        ("IDs im Atlas",
            'P-ID = Seite (cms_pages.page_no), B-ID = Block (cms_sections.section_uid), '
            'A-ID = Asset (cms_assets.asset_no). Eingabe im Admin akzeptiert „B-538" und „B538" '
            'und führt zum Objekt im Editor — auch zu Kind-Karten in Scrollern/Grids.'),
        ("Ziel dieses Katalogs",
            "Aktuelle Bausteine erkennen, Vereinheitlichung vorbereiten. "
            "Keine fertige Entscheidung, kein Prozessbericht."),
        ("Scope",
            "Read-only. Keine DB-/Migrations-/RPC-/Inhalts-/Bild-/Whitelist-/i18n-/"
            "Public-Renderer-/Routen-/Navigation-/Footer-/Produktdatenbank-Änderung."),
    ]))
    story.append(PageBreak())

    # ------------------------------------------------------------------ #
    # 3) Sichtbare Bausteine
    # ------------------------------------------------------------------ #
    baustein_page(story,
        section_header="Sichtbare Bausteine",
        name="Hero",
        rolle="Eröffnungs-Banner mit Bild, Eyebrow (kleine Zeile über der Headline), Headline, "
              "Subline (Untertitel) und CTA. Pro Seite genau einer.",
        tech="Section-Typ <font face='Courier'>hero_v1</font>",
        einsatz="92 aktive Instanzen",
        screenshot="hero_home.png",
        screenshot_caption="Hero auf der Startseite",
        beispiele=[
            {"P": "P-001", "B": "B-008", "A": "A-493", "page_key": "home.start",
             "section_key": "hero", "parent": "—"},
            {"P": "P-027", "B": "B-149", "A": "A-494", "page_key": "gebaeudekommunikation.root",
             "section_key": "hero", "parent": "—"},
            {"P": "P-004", "B": "B-024", "A": "A-049",
             "page_key": "gebaeudekommunikation.tuersprechanlagen",
             "section_key": "hero", "parent": "—"},
        ],
        vorschlag="behalten",
        klaerpunkt="Auf einem Teil der Seiten kommen Eyebrow/Subline noch aus i18n statt aus "
                   "der DB. Nachziehen, damit Hero-Inhalte durchgehend im Admin gepflegt werden.")

    baustein_page(story,
        name="Wechselteaser",
        rolle="Bild links/rechts, Text und CTA daneben. Klassischer Bereichs-Teaser.",
        tech="Section-Typ <font face='Courier'>teaser_2col_v1</font>",
        einsatz="66 aktive Instanzen",
        screenshot="teaser_gk.png",
        screenshot_caption="Wechselteaser auf /gebaeudekommunikation",
        beispiele=[
            {"P": "P-027", "B": "B-1610", "A": "A-582",
             "page_key": "gebaeudekommunikation.root",
             "section_key": "bereich_tuersprechanlagen", "parent": "—"},
            {"P": "P-001", "B": "B-015", "page_key": "home.start",
             "section_key": "block_communication", "parent": "—"},
            {"P": "P-109", "B": "B-1635", "page_key": "personas.architekt",
             "section_key": "solution_teaser_entry", "parent": "—"},
        ],
        vorschlag="behalten")

    baustein_page(story,
        name="Textblock / Intro",
        rolle="Kurzer Text mit Eyebrow, Titel und Absatz. Steht oft zwischen zwei größeren "
              "Bausteinen als Überleitung.",
        tech="Section-Typ <font face='Courier'>content_v1</font>",
        einsatz="224 aktive Instanzen",
        screenshot="intro_tk.png",
        screenshot_caption="Intro auf /tuersprechanlagen",
        beispiele=[
            {"P": "P-004", "B": "B-025",
             "page_key": "gebaeudekommunikation.tuersprechanlagen",
             "section_key": "ueberblick", "parent": "—"},
            {"P": "P-027", "B": "B-1609", "page_key": "gebaeudekommunikation.root",
             "section_key": "bereiche_intro", "parent": "—"},
        ],
        vorschlag="standardisieren",
        klaerpunkt="Im Renderer werden Aliase content / intro / content_block_v1 / "
                   "content_blocks_intro_v1 abgefangen. Zielzustand: nur "
                   "<font face='Courier'>content_v1</font>.")

    baustein_page(story,
        name="Karten-Reihe (Bildkarten)",
        rolle="2–4 gleichartige Bildkarten nebeneinander. Jede Karte = Bild + Titel + "
              "Beschreibung, oft mit Link.",
        tech="Container <font face='Courier'>cards_v1</font> mit Kindern "
             "<font face='Courier'>card_v1</font> (Preset Bildkarte)",
        einsatz="127 Container-Instanzen, viele Kindkarten",
        screenshot="cards_image_tk.png",
        screenshot_caption="Karten-Reihe „Anwendungsumfelder“ auf /tuersprechanlagen",
        beispiele=[
            {"P": "P-027", "B": "B-151", "page_key": "gebaeudekommunikation.root",
             "section_key": "anwendungsumfelder", "parent": "—"},
            {"P": "P-004", "B": "B-680",
             "page_key": "gebaeudekommunikation.tuersprechanlagen",
             "section_key": "anwendungsumfelder", "parent": "—"},
        ],
        vorschlag="standardisieren",
        klaerpunkt='Die sichtbare Karte ist fachlich eine flexible Standardkarte ohne Toggles. '
                   'Konsolidierungs-Kandidat (siehe Abschnitt „Flexible Standardkarte“).')

    baustein_page(story,
        name="Produkt-Scroller (horizontal)",
        rolle="Horizontal scrollbare Karten-Reihe. Heute Türsprechanlagen Aussen-/Innenstationen.",
        tech="Container <font face='Courier'>product_scroller_v1</font> mit Kindern "
             "<font face='Courier'>card_v1</font>",
        einsatz="8 aktive Scroller",
        screenshot="scroller_tk.png",
        screenshot_caption="Produkt-Scroller Außenstationen auf /tuersprechanlagen",
        beispiele=[
            {"P": "P-004", "B": "B-026",
             "page_key": "gebaeudekommunikation.tuersprechanlagen",
             "section_key": "aussenstationen", "parent": "—"},
            {"P": "P-004", "B": "B-027",
             "page_key": "gebaeudekommunikation.tuersprechanlagen",
             "section_key": "innenstationen", "parent": "—"},
        ],
        vorschlag="standardisieren",
        klaerpunkt="Die Karten im Außenstationen-Scroller tragen die Toggle-Felder, die als "
                   "Basis der flexiblen Standardkarte vorgeschlagen werden.")

    baustein_page(story,
        name="Iconreihe (Lucide-Icons)",
        rolle="Reihe mit Iconkarten — typisch „Warum TCS?“ oder Vorteile.",
        tech="Container <font face='Courier'>feature_grid_v1</font> mit Kindern "
             "<font face='Courier'>card_v1</font> (Preset Iconkarte Lucide)",
        einsatz="1 Container-Instanz, 51 Iconkarten",
        screenshot=None,
        beispiele=[
            {"P": "P-004", "B": "B-028",
             "page_key": "gebaeudekommunikation.tuersprechanlagen",
             "section_key": "vorteile", "parent": "—"},
            {"P": "P-004", "B": "B-2002",
             "page_key": "gebaeudekommunikation.tuersprechanlagen",
             "section_key": "vorteile__barrierefrei", "parent": "B-028"},
            {"P": "P-004", "B": "B-2003",
             "page_key": "gebaeudekommunikation.tuersprechanlagen",
             "section_key": "vorteile__mobil", "parent": "B-028"},
        ],
        vorschlag="standardisieren",
        klaerpunkt="Crop manuell prüfen — bisheriges Bild zeigte zu viel Umfeld inkl. Footer.")

    baustein_page(story,
        name="Personas-Textkarten",
        rolle="Karten ohne Bild und Icon — nur Titel, Text und optional Link. "
              "Persona-Kurzpaneele auf der Startseite.",
        tech="Container <font face='Courier'>cards_v1</font> mit Kindern "
             "<font face='Courier'>card_v1</font> (Preset Textkarte)",
        einsatz="mehrere Container-Instanzen",
        screenshot="personas_home.png",
        screenshot_caption="Personas-Karten auf der Startseite",
        beispiele=[
            {"P": "P-001", "B": "B-1893", "page_key": "home.start",
             "section_key": "personas_item_architekten", "parent": "B-660"},
            {"P": "P-001", "B": "B-1894", "page_key": "home.start",
             "section_key": "personas_item_bauherren", "parent": "B-660"},
            {"P": "P-001", "B": "B-1895", "page_key": "home.start",
             "section_key": "personas_item_fachhandel", "parent": "B-660"},
        ],
        vorschlag="standardisieren")

    baustein_page(story,
        name="Produkt-Hub (/produkte)",
        rolle="Übersichts-Seite mit 3 großen Produktbereich-Karten: Türkommunikation, "
              "Zutrittskontrolle, Eingangslösungen.",
        tech="Container <font face='Courier'>card_grid_v1</font> (Layout-Hülle) mit "
             "3 CMS-Kindkarten <font face='Courier'>card_v1</font> (Preset Thumbnail)",
        einsatz="1 Hülle (B-1176), 3 Kindkarten",
        screenshot="produkte-hub.png",
        screenshot_caption="Produkt-Hub /produkte mit 3 Produktbereich-Karten",
        beispiele=[
            {"P": "P-253", "B": "B-1176", "page_key": "produkte.hub",
             "section_key": "cards", "parent": "—"},
            {"P": "P-253", "B": "B-1177", "page_key": "produkte.hub",
             "section_key": "cards.tuerkommunikation", "parent": "B-1176"},
            {"P": "P-253", "B": "B-1178", "page_key": "produkte.hub",
             "section_key": "cards.zutrittskontrolle", "parent": "B-1176"},
            {"P": "P-253", "B": "B-1179", "page_key": "produkte.hub",
             "section_key": "cards.eingangsloesungen", "parent": "B-1176"},
        ],
        vorschlag="standardisieren",
        klaerpunkt="Hülle B-1176 enthält genau 3 CMS-Karten. Die Kacheln auf den darunter "
                   "liegenden Produktbereichs-Seiten kommen dagegen live aus der "
                   "Produktdatenbank — siehe nächster Eintrag.")

    baustein_page(story,
        name="Produktbereichs-Filter (live aus Produktdatenbank)",
        rolle="Filterbare Produktkachel-Liste pro Produktbereich. Kacheln werden live aus der "
              "Produktdatenbank gespeist, nicht aus dem CMS.",
        tech="Container <font face='Courier'>catalog_filter_grid_v1</font> · 0 CMS-Kinder",
        einsatz="4 Hüllen (eine pro Produktbereichs-Seite)",
        screenshot=None,
        beispiele=[
            {"P": "P-254", "B": "B-1167", "page_key": "produkte.tuerkommunikation",
             "section_key": "filter-grid", "parent": "—"},
            {"P": "P-255", "B": "B-1180", "page_key": "produkte.zutrittskontrolle",
             "section_key": "category-grid", "parent": "—"},
            {"P": "P-256", "B": "B-1187", "page_key": "produkte.eingangsloesungen",
             "section_key": "category-grid", "parent": "—"},
        ],
        vorschlag="spezialfall",
        klaerpunkt="Kachel-Form wird von der Produktdatenbank vorgegeben — kein Kandidat für "
                   "die flexible Standardkarte. Eine zusätzliche Kopie-/Preview-Hülle "
                   "(B-1198) ist im Anhang gelistet.")

    baustein_page(story,
        name="Stats-Band",
        rolle="Band mit 3–4 großen Kennzahlen (z. B. Persona-Stats).",
        tech="Section-Typ <font face='Courier'>stats_v1</font> mit Kindern "
             "<font face='Courier'>stat_v1</font>",
        einsatz="8 aktive Stats-Bänder, 32 aktive Stat-Kinder",
        screenshot=None,
        beispiele=[
            {"P": "P-001", "B": "B-009", "page_key": "home.start",
             "section_key": "stats", "parent": "—"},
            {"P": "P-109", "B": "B-462", "page_key": "personas.architekt",
             "section_key": "stats", "parent": "—"},
        ],
        vorschlag="behalten",
        klaerpunkt="Crop manuell prüfen — bisherige Vorschau zeigte nicht das echte Stats-Band.")

    baustein_page(story,
        name="FAQ",
        rolle="Akkordeon-Liste mit Frage/Antwort-Paaren.",
        tech="Section-Typ <font face='Courier'>faq_v1</font>",
        einsatz="3 aktive Instanzen",
        screenshot=None,
        beispiele=[
            {"P": "P-081", "B": "B-342", "page_key": "service.downloads",
             "section_key": "faq", "parent": "—"},
        ],
        vorschlag="behalten",
        klaerpunkt="In der DB existieren 3 unterschiedliche Item-Schemata. Empfehlung: "
                   "einheitlich <font face='Courier'>items.&lt;slug&gt;.frage|antwort</font>.")

    baustein_page(story,
        name="CTA-Banner",
        rolle="Großer Call-To-Action am Seitenende.",
        tech="Section-Typ <font face='Courier'>cta_v1</font>",
        einsatz="1 aktive Instanz (viele weitere CTAs kommen heute aus Layout/Renderer)",
        screenshot="cta_tk.png",
        screenshot_caption="CTA-Banner auf /tuersprechanlagen",
        beispiele=[
            {"P": "P-001", "B": "B-007", "page_key": "home.start",
             "section_key": "cta", "parent": "—"},
        ],
        vorschlag="standardisieren",
        klaerpunkt="Wiederkehrende Footer-/Layout-CTAs als eigene Sections in die DB heben, "
                   "damit sie redaktionell pflegbar werden.")

    baustein_page(story,
        name="Kontaktblock",
        rolle="Kontakt-Sektion mit Telefon, E-Mail, Kontaktkarten und Formular.",
        tech="Section-Typ <font face='Courier'>contact_block_v1</font> "
             "(Vertrag steht, derzeit über <font face='Courier'>content_v1</font> + "
             "Hardcoding gelöst)",
        einsatz="0 aktive Instanzen des Vertrags; /kontakt heute via content_v1",
        screenshot="contact_block.png",
        screenshot_caption="Kontakt-Sektion auf /kontakt",
        beispiele=[
            {"P": "P-128", "B": "B-550", "page_key": "kontakt.root",
             "section_key": "sections", "parent": "—"},
            {"P": "P-128", "B": "B-551", "page_key": "kontakt.root",
             "section_key": "cards", "parent": "—"},
            {"P": "P-128", "B": "B-552", "page_key": "kontakt.root",
             "section_key": "form", "parent": "—"},
        ],
        vorschlag="spaeter",
        klaerpunkt="Entweder Hardcoding ablösen (DB-first) oder Vertrag streichen.")

    baustein_page(story,
        name="Tabs · Rollen-Tabs · Rich Text · Referenz-Liste",
        rolle="Restliche Spezialbausteine, die nicht zur Standardkarten-Frage gehören. "
              "Bleiben in ihrer heutigen Form.",
        tech="<font face='Courier'>tabs_v1</font> · "
             "<font face='Courier'>role_tabs_v1</font> · "
             "<font face='Courier'>rich_v1</font> · "
             "<font face='Courier'>list_v1</font>",
        einsatz="1 / 1 / 2 / 24 aktive Instanzen",
        screenshot=None,
        beispiele=[
            {"P": "P-009", "B": "B-1166",
             "page_key": "gebaeudekommunikation.snipdoo-ip",
             "section_key": "role_tabs", "parent": "role_tabs_v1"},
            {"P": "P-001", "B": "B-020", "page_key": "home.start",
             "section_key": "personas_intro", "parent": "rich_v1"},
            {"P": "(div)", "B": "B-1120",
             "page_key": "anwendungen.referenzprojekte.pulse-berlin",
             "section_key": "highlights", "parent": "list_v1"},
        ],
        vorschlag="behalten")

    # ------------------------------------------------------------------ #
    # 4) Flexible Standardkarte
    # ------------------------------------------------------------------ #
    story.append(Paragraph("Flexible Standardkarte (Zielstandard-Kandidat)", H1))
    story.append(Paragraph(
        "Die Karten im Außenstationen-Scroller tragen Toggle-Felder pro Zone "
        "(Eyebrow, Bild, Icon, Features, Links). Über diese Toggles lassen sich die "
        "heutigen Karten-Varianten als Presets einer einzigen flexiblen Standardkarte "
        "abbilden. Dieser Atlas markiert das als <b>Vorschlag</b>, nicht als Entscheidung.",
        BODY))
    story.append(Spacer(1, 4))
    story.append(kv_table([
        ("Parent (Scroller-Hülle)",
            "B-026 · <font face='Courier'>aussenstationen</font> "
            "(<font face='Courier'>product_scroller_v1</font>) auf P-004 "
            "<font face='Courier'>gebaeudekommunikation.tuersprechanlagen</font>"),
        ("Schwester-Scroller",
            "B-027 · <font face='Courier'>innenstationen</font> (gleiche Kartenfamilie)"),
        ("Karten mit Toggles",
            "B-538 · B-539 · B-540 · B-2195 "
            "(alle <font face='Courier'>card_v1</font>, Kinder von B-026)"),
        ("Verifizierte Toggle-Felder",
            "<font face='Courier' size='7'>eyebrow_enabled, image_enabled, icon_enabled, "
            "features_0_enabled .. features_4_enabled, "
            "link_1_enabled .. link_3_enabled</font>"),
        ("Was die Toggles bewirken",
            "Jede Zone der Karte (Eyebrow / Bild / Icon / einzelne Features / einzelne Links) "
            "kann pro Karte ein- oder ausgeblendet werden, ohne dass die Karte einen anderen "
            "Section-Typ braucht."),
        ("Heute abgedeckte Karten/Presets",
            "Bildkarte · Produktbereich-Karte (Thumbnail) · Scroller-Karte · "
            "Textkarte · Iconkarte Lucide · Iconkarte Bildicon · Multi-Link-/Feature-Karte"),
        ("Vorschlag",
            "<b>Zielstandard-Kandidat</b> — als <font face='Courier'>standard_card_v1</font> "
            "zum Vertrag erheben und die heutigen Variant-Keys als Presets abbilden. "
            "Nicht beschlossen."),
    ]))
    story.append(Spacer(1, 6))
    p = CROPS / "scroller_tk.png"
    img = img_fit(p, max_w_mm=170, max_h_mm=70)
    if img:
        story.append(img)
        story.append(caption(
            "Sichtbarer Scrollerbereich auf /tuersprechanlagen — Karten B-538/539/540/2195",
            "scroller_tk.png"))
    story.append(PageBreak())

    # ------------------------------------------------------------------ #
    # 5) Karten-Presets
    # ------------------------------------------------------------------ #
    story.append(Paragraph("Karten-Presets (heute card_v1-Varianten)", H1))
    story.append(Paragraph(
        "Technisch ist all das <font face='Courier'>card_v1</font>. Fachlich sind es "
        "Presets/Varianten derselben Karte. <font face='Courier'>download_card</font> ist "
        "der einzige echte Spezialfall (eigene Dateifelder) und steht im Anhang.", BODY))
    story.append(Spacer(1, 4))

    preset_rows = [
        ["Bildkarte",                "image_card",          "Bild oben, Titel, Beschreibung",                  "Bild an, Icon/Features/Links aus"],
        ["Produktbereich-Karte",     "thumbnail_card",      "Hub-Kachel mit Vorschaubild und Titel",           "Bild an (Slot thumbnail), ein Link"],
        ["Scroller-Karte (Pilot)",   "image_card + toggles","Karte mit Toggles pro Zone (Eyebrow/Bild/…)",     "Toggles pro Zone — Basis der Standardkarte"],
        ["Textkarte",                "text_card",           "Nur Titel und Text, kein Bild, kein Icon",        "Bild/Icon/Features aus"],
        ["Iconkarte Lucide",         "icon_card_lucide",    "Lucide-Icon oben, Titel, kurzer Text",            "Icon an, Bild aus"],
        ["Iconkarte Bildicon",       "icon_card_image",     "Wie Iconkarte Lucide, mit Bild-Icon",             "Icon an (Slot icon_image), Bild aus"],
        ["Multi-Link-/Feature-Karte","multi_link_card",     "Karte mit bis zu 3 sekundären Links/Features",    "Links/Features an"],
    ]
    header = ["Preset (fachlich)", "Variant-Key (heute)", "Sichtbares Ergebnis", "Zonen-Belegung"]
    data = [[Paragraph(f"<font color='white'><b>{h}</b></font>", CELL) for h in header]]
    for r in preset_rows:
        data.append([
            Paragraph(r[0], CELL),
            Paragraph(f"<font face='Courier' size='8'>{r[1]}</font>", CELL),
            Paragraph(r[2], CELL),
            Paragraph(r[3], CELL),
        ])
    t = Table(data, colWidths=[36*mm, 36*mm, 55*mm, 47*mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222")),
        ("BOX", (0, 0), (-1, -1), 0.3, colors.HexColor("#bbb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#ddd")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
    ]))
    story.append(t)
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "<b>Vorschlag:</b> 6 Presets unter einem gemeinsamen "
        "<font face='Courier'>standard_card_v1</font>-Vertrag konsolidieren. "
        "<font face='Courier'>download_card</font> bleibt Spezialfall (siehe Anhang).", NOTE))
    story.append(PageBreak())

    # ------------------------------------------------------------------ #
    # 6) Container als Layout-Hüllen
    # ------------------------------------------------------------------ #
    story.append(Paragraph("Container als Layout-Hüllen", H1))
    story.append(Paragraph(
        "Container bestimmen die Anordnung. Der sichtbare Baustein ist meist die Karte darin. "
        "Container sind deshalb keine eigenen sichtbaren Bausteine, sondern Layout-Hüllen.",
        BODY))
    story.append(Spacer(1, 4))

    container_rows = [
        ["cards_v1",               "Grid-Hülle für 2–4 Karten",        "card_v1 (Bild-/Text-/Iconkarte)", "127"],
        ["product_scroller_v1",    "Horizontaler Scroller",            "card_v1 (Pilot mit Toggles)",     "8"],
        ["feature_grid_v1",        "Icongrid-Hülle",                   "card_v1 (Preset Iconkarte)",       "1"],
        ["card_grid_v1",           "Hub-Hülle /produkte (B-1176)",     "card_v1 (Preset Thumbnail) · 3 Kinder", "1"],
        ["catalog_filter_grid_v1", "Produktbereichs-Filter (live)",    "Kacheln aus Produktdatenbank · 0 CMS-Kinder", "4"],
    ]
    header = ["Container-Typ", "Rolle (Layout)", "Was lebt darin?", "Aktiv"]
    data = [[Paragraph(f"<font color='white'><b>{h}</b></font>", CELL) for h in header]]
    for r in container_rows:
        data.append([
            Paragraph(f"<font face='Courier' size='8'>{r[0]}</font>", CELL),
            Paragraph(r[1], CELL),
            Paragraph(r[2], CELL),
            Paragraph(r[3], CELL),
        ])
    t = Table(data, colWidths=[42*mm, 45*mm, 70*mm, 17*mm], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#222")),
        ("BOX", (0, 0), (-1, -1), 0.3, colors.HexColor("#bbb")),
        ("INNERGRID", (0, 0), (-1, -1), 0.2, colors.HexColor("#ddd")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#fafafa")]),
    ]))
    story.append(t)
    story.append(PageBreak())

    # ------------------------------------------------------------------ #
    # 8) Anhang — manuell prüfen / nicht aktiv
    # ------------------------------------------------------------------ #
    story.append(Paragraph("Anhang — manuell prüfen / nicht aktiv belegt", H1))
    story.append(Paragraph(
        "Hier stehen Einträge, die heute keine eindeutige aktive Instanz haben oder "
        "Spezialfälle sind. Sie gehören nicht in den Hauptkatalog der sichtbaren Bausteine, "
        "sind aber für die Vereinheitlichungs-Diskussion relevant.", BODY))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Iconkarte Bildicon (icon_card_image)", H2))
    story.append(kv_table([
        ("Status", "Vertrag vorhanden, keine eindeutige aktive Instanz"),
        ("Technische Grundlage", "<font face='Courier'>card_v1 · icon_card_image</font> · "
                                 "Asset-Slot <font face='Courier'>icon_image</font>"),
        ("Vorschlag", "manuell prüfen — bei Bedarf als Preset der flexiblen Standardkarte abbilden"),
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Download-Karte (download_card)", H2))
    story.append(kv_table([
        ("Status", "Vertrag vorhanden, keine aktive Instanz"),
        ("Technische Grundlage", "<font face='Courier'>card_v1 · download_card</font> · "
                                 "harte Felder <font face='Courier'>file_label / file_href</font>"),
        ("Heute genutzt von", "/service/downloads (P-081) — heute via "
                              "<font face='Courier'>cards_v1</font> + Textkarten"),
        ("Vorschlag", "Spezialfall — eigener Vertrag, <b>nicht</b> als Preset der "
                      "Standardkarte modellieren"),
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Download-Liste (download_list_v1)", H2))
    story.append(kv_table([
        ("Status", "Vertrag vorhanden, keine aktive Instanz"),
        ("Technische Grundlage", "Hülle für <font face='Courier'>download_card</font>"),
        ("Vorschlag", "manuell prüfen — entweder mit echter Instanz seeden oder Vertrag streichen"),
    ]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Kopie-/Preview-Seite produkte.eingangsloesungen.kopie", H2))
    story.append(kv_table([
        ("Status", "B-1198 — vierte Instanz von "
                   "<font face='Courier'>catalog_filter_grid_v1</font>; nicht regulär public/auffindbar"),
        ("Vorschlag", "manuell prüfen — entweder als Vorschau dokumentieren oder entfernen"),
    ]))
    story.append(Spacer(1, 8))

    story.append(Paragraph(
        "Scope: Read-only. Keine DB-, Migrations-, RPC-, Inhalts-, Bild-, Feldwert-, "
        "Whitelist-, i18n-, Public-Renderer-, Routen-, Navigations-, Footer-, "
        "Breadcrumb- oder Produktdatenbank-Änderung.",
        SMALL))

    doc.build(story)
    print(f"OK: {OUT_PDF}")


def build_json():
    data = {
        "generated_at": "2026-05-29",
        "sprint": "cms-light-baustein-atlas-neutraler-ist-katalog-final-1",
        "scope": "read-only neutraler Ist-Katalog; keine DB-/Code-/Public-/i18n-/Whitelist-Änderung",
        "id_format": {
            "P": "cms_pages.page_no",
            "B": "cms_sections.section_uid",
            "A": "cms_assets.asset_no",
            "N": "cms_navigation_nodes.node_no",
        },
        "sichtbare_bausteine": [
            {"name": "Hero", "section_type": "hero_v1", "count": 92,
             "vorschlag": "behalten"},
            {"name": "Wechselteaser", "section_type": "teaser_2col_v1", "count": 66,
             "vorschlag": "behalten"},
            {"name": "Textblock / Intro", "section_type": "content_v1", "count": 224,
             "vorschlag": "standardisieren"},
            {"name": "Karten-Reihe (Bildkarten)",
             "container": "cards_v1", "child": "card_v1 (Preset Bildkarte)",
             "count_container": 127, "vorschlag": "standardisieren"},
            {"name": "Produkt-Scroller", "container": "product_scroller_v1",
             "child": "card_v1", "count_container": 8,
             "vorschlag": "standardisieren",
             "pilot_toggles": ["B-538", "B-539", "B-540", "B-2195"]},
            {"name": "Iconreihe (Lucide)", "container": "feature_grid_v1",
             "child": "card_v1 (Preset Iconkarte Lucide)",
             "count_container": 1, "count_children": 51,
             "vorschlag": "standardisieren"},
            {"name": "Personas-Textkarten", "container": "cards_v1",
             "child": "card_v1 (Preset Textkarte)", "vorschlag": "standardisieren"},
            {"name": "Produkt-Hub /produkte", "container": "card_grid_v1",
             "child": "card_v1 (Preset Thumbnail)",
             "count_container": 1, "count_children": 3,
             "vorschlag": "standardisieren"},
            {"name": "Produktbereichs-Filter (live)",
             "container": "catalog_filter_grid_v1", "count_container": 4,
             "count_children": 0, "vorschlag": "spezialfall"},
            {"name": "Stats-Band", "section_type": "stats_v1", "count": 8,
             "vorschlag": "behalten"},
            {"name": "FAQ", "section_type": "faq_v1", "count": 3,
             "vorschlag": "behalten"},
            {"name": "CTA-Banner", "section_type": "cta_v1", "count": 1,
             "vorschlag": "standardisieren"},
            {"name": "Kontaktblock", "section_type": "contact_block_v1",
             "count": 0, "vorschlag": "spaeter"},
            {"name": "Tabs / Rollen-Tabs / Rich Text / Referenz-Liste",
             "section_types": ["tabs_v1", "role_tabs_v1", "rich_v1", "list_v1"],
             "vorschlag": "behalten"},
        ],
        "flexible_standardkarte": {
            "vorschlag": "Zielstandard-Kandidat (nicht beschlossen)",
            "vertrag_name": "standard_card_v1",
            "parent": {"B": "B-026", "section_key": "aussenstationen",
                       "section_type": "product_scroller_v1",
                       "page_key": "gebaeudekommunikation.tuersprechanlagen"},
            "schwester_scroller": {"B": "B-027", "section_key": "innenstationen"},
            "karten_mit_toggles": ["B-538", "B-539", "B-540", "B-2195"],
            "toggle_felder": [
                "eyebrow_enabled", "image_enabled", "icon_enabled",
                "features_0_enabled..features_4_enabled",
                "link_1_enabled..link_3_enabled",
            ],
        },
        "karten_presets": [
            {"preset": "Bildkarte",                "variant_key": "image_card"},
            {"preset": "Produktbereich-Karte",     "variant_key": "thumbnail_card"},
            {"preset": "Scroller-Karte (Pilot)",   "variant_key": "image_card + toggles"},
            {"preset": "Textkarte",                "variant_key": "text_card"},
            {"preset": "Iconkarte Lucide",         "variant_key": "icon_card_lucide"},
            {"preset": "Iconkarte Bildicon",       "variant_key": "icon_card_image"},
            {"preset": "Multi-Link-/Feature-Karte","variant_key": "multi_link_card"},
        ],
        "container_layout_huellen": [
            {"type": "cards_v1",               "rolle": "Grid-Hülle 2–4 Karten",   "aktiv": 127},
            {"type": "product_scroller_v1",    "rolle": "Horizontaler Scroller",   "aktiv": 8},
            {"type": "feature_grid_v1",        "rolle": "Icongrid-Hülle",          "aktiv": 1},
            {"type": "card_grid_v1",           "rolle": "Hub-Hülle /produkte",     "aktiv": 1,
             "instanz": "B-1176"},
            {"type": "catalog_filter_grid_v1", "rolle": "Produktbereichs-Filter (live)",
             "aktiv": 4, "kinder_cms": 0},
        ],
        "anhang_manuell_pruefen": [
            {"name": "Iconkarte Bildicon (icon_card_image)",
             "grund": "Kein eindeutiges aktives Beispiel im Bestand"},
            {"name": "Download-Karte (download_card)",
             "grund": "Vertrag vorhanden, 0 Instanzen; Spezialfall (harte Dateifelder)"},
            {"name": "Download-Liste (download_list_v1)",
             "grund": "Vertrag vorhanden, 0 Instanzen"},
            {"name": "produkte.eingangsloesungen.kopie (B-1198)",
             "grund": "Kopie-/Preview-Seite, nicht regulär public"},
        ],
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(data, indent=2, ensure_ascii=False))
    print(f"OK: {OUT_JSON}")


if __name__ == "__main__":
    build_json()
    build_pdf()

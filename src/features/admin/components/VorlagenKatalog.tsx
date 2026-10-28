/**
 * VorlagenKatalog — Nachschlagewerk für alle CMS-Light-Vorlagen.
 *
 * Read-only Übersicht über:
 *   - Seitentypen (aus `pageTypeMatrix.ts`)
 *   - Container/Bausteine (aus `blockTemplates.ts`)
 *   - Standardkarte (eingebettete Blueprint-Werkstatt)
 *
 * Pro Eintrag werden Beschreibung, Felder, Asset-Slots, Layout-Regeln und
 * echte Beispielseiten aus dem CMS gezeigt. Beispielseiten lassen sich
 * direkt in den Inhalte-Tab springen (`onJump`) oder auf der öffentlichen
 * Website öffnen.
 *
 * Bewusst nicht enthalten: keine RPCs, keine Schreibwege, kein Renderer-
 * Eingriff, keine Migration.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, ExternalLink, Loader2 } from "lucide-react";
import {
  BLOCK_TEMPLATE_REGISTRY,
  loadBlockTemplateOccurrences,
  loadCardOccurrencesGrouped,
  type BlockTemplateDefinition,
  type BlockTemplateOccurrence,
  type CardOccurrence,
  type CardOccurrenceGroup,
} from "@/features/admin/lib/blockTemplates";
import {
  SEITENTYPEN,
  PAGE_TYPE_CODE_MAP,
  type SeitentypDefinition,
  type SeitentypId,
  bausteinLabel,
} from "@/features/admin/lib/pageTypeMatrix";
import { resolveShortId } from "@/features/admin/api/cmsAdminResolve";
import { readPagesWithNav, type CmsPageRow } from "@/features/admin/api/cmsAdminPages";
import CardBlueprintWorkshop from "@/features/admin/components/CardBlueprintWorkshop";
import CardSectionPreview from "@/features/admin/components/CardSectionPreview";
import type { JumpTarget } from "@/features/admin/components/GoToShortIdBar";

interface Props {
  onJump: (target: JumpTarget) => void;
}

type SelectionKind = "seitentyp" | "baustein" | "karte";
interface Selection {
  kind: SelectionKind;
  key: string;
}

/**
 * Anzeige-Gruppierung im Vorlagen-Katalog.
 *
 * Nur die im Standardbetrieb verwendeten Bausteine werden hier gelistet.
 * Technisch existierende, aber redaktionell nicht genutzte Section-Typen
 * (z. B. `rich_v1`, `download_list_v1`, `contact_block_v1`) bleiben im
 * Code/Renderer/Vertrag erhalten, werden aber im Admin nicht beworben.
 *
 * Die Vorkommen werden weiterhin live aus `cms_sections` gelesen; diese
 * Liste steuert nur Reihenfolge und Etikettierung in der Admin-Sicht.
 */
const CONTAINER_ORDER_ACTIVE = [
  "hero_v1",
  "content_v1",
  "teaser_2col_v1",
  "cards_v1",
  "product_scroller_v1",
  "tabs_v1",
  "stats_v1",
  "cta_v1",
  "faq_v1",
];


const VorlagenKatalog = ({ onJump }: Props) => {
  const [selection, setSelection] = useState<Selection>({ kind: "seitentyp", key: "startseite" });
  const [occByKey, setOccByKey] = useState<Record<string, BlockTemplateOccurrence[]>>({});
  const [loadingOcc, setLoadingOcc] = useState(true);
  const [jumping, setJumping] = useState<number | null>(null);
  const [cardGroups, setCardGroups] = useState<CardOccurrenceGroup[]>([]);
  const [cardCount, setCardCount] = useState(0);
  const [loadingCards, setLoadingCards] = useState(true);
  const [allPages, setAllPages] = useState<CmsPageRow[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingOcc(true);
    setLoadingCards(true);
    setLoadingPages(true);
    Promise.all([
      loadBlockTemplateOccurrences(),
      loadCardOccurrencesGrouped(),
      readPagesWithNav(),
    ]).then(([occRes, cardRes, pagesRes]) => {
      if (cancelled) return;
      setOccByKey(occRes.byKey);
      setLoadingOcc(false);
      setCardGroups(cardRes.groups);
      setCardCount(cardRes.totalCards);
      setLoadingCards(false);
      setAllPages(pagesRes.pages);
      setLoadingPages(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /** Seitentyp-ID → Liste echter CMS-Seiten dieses Typs (aktive zuerst). */
  const pagesBySeitentyp = useMemo(() => {
    const m = new Map<SeitentypId, CmsPageRow[]>();
    for (const p of allPages) {
      const st = p.page_type ? PAGE_TYPE_CODE_MAP[p.page_type] : undefined;
      if (!st) continue;
      const list = m.get(st) ?? [];
      list.push(p);
      m.set(st, list);
    }
    for (const list of m.values()) {
      list.sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
        return (a.page_no ?? 0) - (b.page_no ?? 0);
      });
    }
    return m;
  }, [allPages]);

  const templatesGrouped = useMemo(() => {
    const map = new Map(BLOCK_TEMPLATE_REGISTRY.map((b) => [b.template_key, b] as const));
    const pick = (keys: string[]) =>
      keys.map((k) => map.get(k)).filter((t): t is BlockTemplateDefinition => !!t);
    return {
      active: pick(CONTAINER_ORDER_ACTIVE),
    };
  }, []);


  const cardTemplate = useMemo(
    () => BLOCK_TEMPLATE_REGISTRY.find((b) => b.template_key === "card_v1") ?? null,
    [],
  );

  const handleJumpToPage = async (pageNo: number | null) => {
    if (!pageNo) return;
    setJumping(pageNo);
    try {
      const r = await resolveShortId({
        kind: "P",
        value: pageNo,
        formatted: `P-${String(pageNo).padStart(3, "0")}`,
      });
      if (r.success) {
        onJump({
          page_key: r.page_key,
          section_key: null,
          node_id: null,
          field_key: null,
          label: r.page_key,
          raw: r,
        });
      }
    } finally {
      setJumping(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div className="shrink-0 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <strong className="text-foreground">Vorlagen-Katalog</strong> · Übersicht
        aller Seitentypen und Bausteine im CMS-Light. Links wählen, rechts
        Beschreibung und echte Beispielseiten ansehen. Sprung „Im Inhalte-Tab
        öffnen" führt direkt zur Pflege. Nur Anzeige — hier wird nichts
        gespeichert.
        <br />
        <span className="mt-1 inline-block">
          <strong className="text-foreground">Hinweis zu T-Codes:</strong>{" "}
          Die T-Codes in dieser Admin-Sicht (aus <code>pageTypeMatrix.ts</code>) beschreiben die
          {" "}<em>Hierarchie-/Admin-Sicht</em> einer Seite (Hauptmenüpunkt, Untermenüpunkt, Detail, Sonderseite).
          Die T-Codes in <code>docs/01-strategie/seitentyp-taxonomie.md</code> beschreiben die
          {" "}<em>Inhalts-Taxonomie</em> (Systemlösung, Produktkategorie, Produktdetail …). Beide Sichten
          dürfen <strong>nicht improvisiert vermischt</strong> werden — bei Unklarheit Redaktionsprompt.
        </span>
      </div>


      <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[20rem_1fr]">
        {/* Linke Liste */}
        <aside className="flex min-h-0 flex-col gap-4 overflow-auto rounded-md border border-border bg-card p-3">
          <Group title="Seitentypen" hint="Welcher Typ ist eine Seite?">
            {Object.values(SEITENTYPEN).map((st) => {
              const count = pagesBySeitentyp.get(st.id)?.length ?? 0;
              return (
                <ListItem
                  key={st.id}
                  active={selection.kind === "seitentyp" && selection.key === st.id}
                  onClick={() => setSelection({ kind: "seitentyp", key: st.id })}
                  label={st.label}
                  hint={loadingPages ? "…" : `${count} Seite${count === 1 ? "" : "n"}`}
                />
              );
            })}
          </Group>

          <Group
            title="Aktive Bausteine / Container"
            hint="Im Standardbetrieb verwenden"
          >
            {templatesGrouped.active.map((t) => (
              <ListItem
                key={t.template_key}
                active={selection.kind === "baustein" && selection.key === t.template_key}
                onClick={() => setSelection({ kind: "baustein", key: t.template_key })}
                label={t.name}
                hint={
                  loadingOcc
                    ? "…"
                    : `${(occByKey[t.template_key] ?? []).length}× im CMS`
                }
              />
            ))}
          </Group>

          {cardTemplate && (
            <Group title="Karten / Items" hint="Inhalte innerhalb eines Containers">
              <ListItem
                active={selection.kind === "karte" && selection.key === "card_v1"}
                onClick={() => setSelection({ kind: "karte", key: "card_v1" })}
                label={cardTemplate.name}
                hint={loadingCards ? "…" : `${cardCount}× im CMS`}
              />
            </Group>
          )}







        </aside>

        {/* Rechte Detail-Spalte */}
        <section className="flex min-h-0 flex-col overflow-auto rounded-md border border-border bg-background/40 p-4">
          {selection.kind === "seitentyp" && (
            <SeitentypDetail
              st={SEITENTYPEN[selection.key as SeitentypId]}
              templatesByKey={new Map(BLOCK_TEMPLATE_REGISTRY.map((b) => [b.template_key, b] as const))}
              onSelectBaustein={(k) => setSelection({ kind: "baustein", key: k })}
              pages={pagesBySeitentyp.get(selection.key as SeitentypId) ?? []}
              loadingPages={loadingPages}
              jumping={jumping}
              onJumpToPage={handleJumpToPage}
            />
          )}
          {selection.kind === "baustein" && (
            <BausteinDetail
              t={BLOCK_TEMPLATE_REGISTRY.find((b) => b.template_key === selection.key) ?? null}
              occurrences={occByKey[selection.key] ?? []}
              loading={loadingOcc}
              jumping={jumping}
              onJumpToPage={handleJumpToPage}
            />
          )}
          {selection.kind === "karte" && cardTemplate && (
            <KarteDetail
              t={cardTemplate}
              groups={cardGroups}
              totalCards={cardCount}
              loading={loadingCards}
              jumping={jumping}
              onJumpToPage={handleJumpToPage}
            />
          )}
        </section>
      </div>
    </div>
  );
};

// ─── kleine Bausteine ───────────────────────────────────────────────────────

const Group = ({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) => (
  <div>
    <div className="mb-1 flex items-baseline justify-between">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground">{title}</h3>
      {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
    </div>
    <ul className="flex flex-col gap-1">{children}</ul>
  </div>
);

const ListItem = ({
  active,
  onClick,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  hint?: string;
}) => (
  <li>
    <button
      type="button"
      onClick={onClick}
      className={
        "flex w-full items-center justify-between gap-2 rounded border px-2 py-1.5 text-left text-sm transition-colors " +
        (active
          ? "border-primary bg-primary/10 text-foreground"
          : "border-border bg-background hover:bg-muted")
      }
    >
      <span className="truncate">{label}</span>
      {hint && (
        <span className="shrink-0 text-[10px] text-muted-foreground">{hint}</span>
      )}
    </button>
  </li>
);

const Title = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-lg font-semibold text-foreground">{children}</h2>
);

const SubTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mt-4 mb-2 text-xs font-semibold uppercase tracking-wider text-foreground">
    {children}
  </h3>
);

// ─── Detail: Seitentyp ──────────────────────────────────────────────────────

const SeitentypDetail = ({
  st,
  templatesByKey,
  onSelectBaustein,
  pages,
  loadingPages,
  jumping,
  onJumpToPage,
}: {
  st: SeitentypDefinition;
  templatesByKey: Map<string, BlockTemplateDefinition>;
  onSelectBaustein: (key: string) => void;
  pages: CmsPageRow[];
  loadingPages: boolean;
  jumping: number | null;
  onJumpToPage: (pageNo: number | null) => void;
}) => {
  // Welche DB-Codes (T01, T02, …) zeigen auf diesen Seitentyp?
  const matchingCodes = Object.entries(PAGE_TYPE_CODE_MAP)
    .filter(([, id]) => id === st.id)
    .map(([code]) => code);
  return (
    <div>
      <Title>{st.label}</Title>
      <p className="mt-1 text-sm text-muted-foreground">{st.description}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        DB-Code{matchingCodes.length === 1 ? "" : "s"}:{" "}
        {matchingCodes.map((c) => (
          <code key={c} className="mr-1 rounded bg-muted px-1 font-mono">
            {c}
          </code>
        ))}
      </p>

      <SubTitle>Erwartete Bausteine (Pflicht)</SubTitle>
      {st.expectedTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine festen Pflicht-Bausteine — Sonderseiten richten sich nach Zweck.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {st.expectedTypes.map((tk) => (
            <BausteinChip
              key={tk}
              label={bausteinLabel(tk)}
              tone="primary"
              onClick={templatesByKey.has(tk) ? () => onSelectBaustein(tk) : undefined}
            />
          ))}
        </ul>
      )}

      <SubTitle>Optional sinnvoll</SubTitle>
      {st.optionalTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {st.optionalTypes.map((tk) => (
            <BausteinChip
              key={tk}
              label={bausteinLabel(tk)}
              tone="muted"
              onClick={templatesByKey.has(tk) ? () => onSelectBaustein(tk) : undefined}
            />
          ))}
        </ul>
      )}

      <SubTitle>Seiten dieses Typs ({loadingPages ? "…" : pages.length})</SubTitle>
      {loadingPages ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Lade Seiten…
        </p>
      ) : pages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Keine aktiven CMS-Seiten mit diesem Typ.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {pages.map((p) => (
            <li
              key={p.page_key}
              className="flex items-center justify-between gap-2 rounded border border-border bg-background px-2 py-1.5 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {p.page_no !== null && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      P-{String(p.page_no).padStart(3, "0")}
                    </span>
                  )}
                  <span className="truncate font-medium text-foreground">
                    {p.title_de ?? p.page_key}
                  </span>
                  <span className="rounded bg-muted px-1 font-mono text-[10px] text-muted-foreground">
                    {p.page_type}
                  </span>
                  {!p.is_active && (
                    <span className="rounded bg-muted px-1 text-[10px] text-muted-foreground">
                      inaktiv
                    </span>
                  )}
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  <code>{p.page_key}</code>
                  {p.route_path ? <> · <code>{p.route_path}</code></> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onJumpToPage(p.page_no)}
                  disabled={jumping === p.page_no || p.page_no === null}
                  className="rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-muted disabled:opacity-50"
                  title="Im Inhalte-Tab öffnen"
                >
                  {jumping === p.page_no ? "…" : "Im Inhalte-Tab öffnen"}
                </button>
                {p.route_path && (
                  <a
                    href={p.route_path}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-muted"
                    title="Auf der Website ansehen"
                  >
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        Klick auf einen Baustein öffnet seine Detail-Beschreibung mit Feldern,
        Layout-Regeln und Beispielseiten aus dem CMS.
      </p>
    </div>
  );
};

const BausteinChip = ({
  label,
  tone,
  onClick,
}: {
  label: string;
  tone: "primary" | "muted";
  onClick?: () => void;
}) => {
  const cls =
    "rounded border px-2 py-1 text-xs " +
    (tone === "primary"
      ? "border-primary/40 bg-primary/10 text-foreground"
      : "border-border bg-background text-muted-foreground");
  return onClick ? (
    <button type="button" onClick={onClick} className={cls + " hover:bg-muted"}>
      {label}
      <ChevronRight className="ml-1 inline h-3 w-3" />
    </button>
  ) : (
    <span className={cls}>{label}</span>
  );
};

// ─── Detail: Baustein/Container ────────────────────────────────────────────

const BausteinDetail = ({
  t,
  occurrences,
  loading,
  jumping,
  onJumpToPage,
}: {
  t: BlockTemplateDefinition | null;
  occurrences: BlockTemplateOccurrence[];
  loading: boolean;
  jumping: number | null;
  onJumpToPage: (pageNo: number | null) => void;
}) => {
  if (!t) return <p className="text-sm text-muted-foreground">Vorlage nicht gefunden.</p>;
  return (
    <div>
      <Title>{t.name}</Title>
      <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Schlüssel (intern): <code className="rounded bg-muted px-1">{t.template_key}</code>
      </p>


      <SubTitle>Felder</SubTitle>
      {t.fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine eigenen Felder.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {t.fields.map((f) => (
            <li
              key={f.field_key}
              className="rounded border border-border bg-background px-2 py-1.5 text-xs"
            >
              <div className="flex items-baseline gap-2">
                <code className="font-mono text-[11px] text-foreground">{f.field_key}</code>
                <span
                  className={
                    "rounded px-1.5 py-0.5 text-[10px] " +
                    (f.required
                      ? "bg-primary/15 text-primary"
                      : "bg-muted text-muted-foreground")
                  }
                >
                  {f.required ? "Pflicht" : "optional"}
                </span>
              </div>
              <p className="mt-0.5 text-muted-foreground">{f.description}</p>
            </li>
          ))}
        </ul>
      )}

      <SubTitle>Bild-Slots</SubTitle>
      {t.asset_slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Bild-Slots.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {t.asset_slots.map((a) => (
            <li
              key={a.slot}
              className="rounded border border-border bg-background px-2 py-1.5 text-xs"
            >
              <code className="font-mono text-[11px] text-foreground">{a.slot}</code>
              <p className="mt-0.5 text-muted-foreground">{a.description}</p>
            </li>
          ))}
        </ul>
      )}

      <SubTitle>Layout-Regeln</SubTitle>
      <ul className="ml-4 list-disc text-xs text-muted-foreground">
        {t.layout_notes.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>

      <SubTitle>Vorkommen im CMS ({occurrences.length})</SubTitle>
      {loading ? (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Lade Beispielseiten…
        </p>
      ) : occurrences.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Diese Vorlage ist aktuell auf keiner aktiven Seite eingesetzt.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {occurrences.slice(0, 50).map((o) => (
            <li
              key={`${o.page_key}::${o.section_key}`}
              className="flex items-center justify-between gap-2 rounded border border-border bg-background px-2 py-1.5 text-xs"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {o.page_no !== null && (
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      P-{String(o.page_no).padStart(3, "0")}
                    </span>
                  )}
                  <span className="truncate font-medium text-foreground">
                    {o.page_title ?? o.page_key}
                  </span>
                </div>
                <div className="truncate text-[10px] text-muted-foreground">
                  Section: <code>{o.section_key}</code>
                  {o.page_route ? <> · <code>{o.page_route}</code></> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onJumpToPage(o.page_no)}
                  disabled={jumping === o.page_no || o.page_no === null}
                  className="rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-muted disabled:opacity-50"
                  title="Im Inhalte-Tab öffnen"
                >
                  {jumping === o.page_no ? "…" : "Im Inhalte-Tab öffnen"}
                </button>
                {o.page_route && (
                  <a
                    href={o.page_route}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[10px] hover:bg-muted"
                    title="Auf der Website ansehen"
                  >
                    Website <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </li>
          ))}
          {occurrences.length > 50 && (
            <li className="text-[10px] text-muted-foreground">
              … und {occurrences.length - 50} weitere.
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

// ─── Detail: Standardkarte ─────────────────────────────────────────────────

const KarteDetail = ({
  t,
  groups,
  totalCards,
  loading,
  jumping,
  onJumpToPage,
}: {
  t: BlockTemplateDefinition;
  groups: CardOccurrenceGroup[];
  totalCards: number;
  loading: boolean;
  jumping: number | null;
  onJumpToPage: (pageNo: number | null) => void;
}) => {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<CardOccurrence | null>(null);
  const [showBlueprint, setShowBlueprint] = useState(false);

  // Default: ersten Container aufklappen und erste Karte vorauswählen.
  useEffect(() => {
    if (!loading && groups.length > 0 && openGroup === null) {
      const g = groups[0];
      const gkey = `${g.page_key}::${g.parent_section_key}`;
      setOpenGroup(gkey);
      if (g.cards.length > 0) setSelectedCard(g.cards[0]);
    }
  }, [loading, groups, openGroup]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <div>
        <Title>{t.name}</Title>
        <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Schlüssel (intern): <code className="rounded bg-muted px-1">{t.template_key}</code>
          {" "}— wird als Kind-Section unter `cards_v1` (Kartenraster) oder `product_scroller_v1` (Kartenscroller) angelegt. `feature_grid_v1` ist als Eltern-Container historisch (0× aktiv).
        </p>
        <div className="mt-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
          <strong className="text-foreground">Karten-Familien-Regel:</strong>{" "}
          <code>benefits</code>-Familie max. 3 Karten pro Reihe, alle anderen Familien (default, Produkte, Lösungen …) max. 4 pro Reihe.
          Berechnung zentral über <code>cardGridClass()</code> / <code>cardGridItemClass()</code> aus
          {" "}<code>src/features/cms/lib/cardGrid.ts</code> — keine hartcodierten Grid-Klassen.
        </div>
        <div className="mt-2 rounded border border-border bg-muted/30 px-2 py-1.5 text-[11px] text-muted-foreground">
          <strong className="text-foreground">Bildslot vs. Icon-Textfeld:</strong>{" "}
          <code>icon_image</code> ist ein <em>Bildslot</em> (eigene Bilddatei, gepflegt im Medienbereich) — nicht zu verwechseln mit dem Textfeld
          {" "}<code>icon</code>, das einen Lucide-Icon-Namen enthält. Renderer-Priorität: <code>icon_image</code> &gt; <code>icon</code> &gt; Code-Fallback.
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-2">
        {/* Linke Seite: Vorkommen, gruppiert nach Eltern-Container */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded border border-border bg-card">
          <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-2 text-xs">
            <span className="font-semibold text-foreground">
              Vorkommen ({totalCards} Karten in {groups.length} Containern)
            </span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-2">
            {loading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" /> Lade Karten …
              </p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aktuell keine aktiven Standardkarten im CMS.
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {groups.map((g) => {
                  const gkey = `${g.page_key}::${g.parent_section_key}`;
                  const isOpen = openGroup === gkey;
                  return (
                    <li key={gkey} className="rounded border border-border bg-background">
                      <button
                        type="button"
                        onClick={() => setOpenGroup(isOpen ? null : gkey)}
                        className="flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs hover:bg-muted"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            {g.page_no !== null && (
                              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                                P-{String(g.page_no).padStart(3, "0")}
                              </span>
                            )}
                            <span className="truncate font-medium text-foreground">
                              {g.page_title ?? g.page_key}
                            </span>
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">
                            {g.parent_section_type === "product_scroller_v1"
                              ? "Scroller"
                              : g.parent_section_type === "cards_v1"
                              ? "Kartenraster"
                              : g.parent_section_type}
                            {" · "}
                            <code>{g.parent_section_key}</code>
                            {" · "}
                            {g.cards.length} Karten
                          </span>
                        </span>
                        {isOpen ? (
                          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="border-t bg-muted/20 px-1.5 py-1.5">
                          <ul className="flex flex-col gap-1">
                            {g.cards.map((c) => {
                              const active =
                                selectedCard?.page_key === c.page_key &&
                                selectedCard?.card_section_key === c.card_section_key;
                              return (
                                <li key={c.card_section_key}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedCard(c)}
                                    className={
                                      "flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-[11px] " +
                                      (active
                                        ? "bg-primary/15 text-foreground"
                                        : "bg-background hover:bg-muted")
                                    }
                                  >
                                    <span className="truncate">
                                      <code>{c.card_section_key}</code>
                                    </span>
                                    {c.card_section_no !== null && (
                                      <span className="shrink-0 font-mono text-[9px] text-muted-foreground">
                                        S-{String(c.card_section_no).padStart(3, "0")}
                                      </span>
                                    )}
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1 px-1">
                            <button
                              type="button"
                              onClick={() => onJumpToPage(g.page_no)}
                              disabled={jumping === g.page_no || g.page_no === null}
                              className="rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-muted disabled:opacity-50"
                              title="Diese Seite im Inhalte-Tab öffnen"
                            >
                              {jumping === g.page_no ? "…" : "Im Inhalte-Tab öffnen"}
                            </button>
                            {g.page_route && (
                              <a
                                href={g.page_route}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[10px] hover:bg-muted"
                                title="Auf der Website ansehen"
                              >
                                Website <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Rechte Seite: Inline-Vorschau */}
        <div className="flex min-h-0 flex-col overflow-hidden rounded border border-border bg-background/40">
          <div className="border-b bg-muted/40 px-3 py-2 text-xs font-semibold text-foreground">
            Inline-Vorschau
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-3">
            {!selectedCard ? (
              <p className="text-xs text-muted-foreground">
                Wähle links eine Karte, um sie hier zu sehen.
              </p>
            ) : (
              <>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  {selectedCard.page_title ?? selectedCard.page_key} ·{" "}
                  <code>{selectedCard.parent_section_key}</code> →{" "}
                  <code>{selectedCard.card_section_key}</code>
                </p>
                <CardSectionPreview
                  key={`${selectedCard.page_key}::${selectedCard.card_section_key}`}
                  pageKey={selectedCard.page_key}
                  sectionKey={selectedCard.card_section_key}
                  parentType={selectedCard.parent_section_type}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Blueprint-Werkstatt aufklappbar, nicht mehr dauerhaft sichtbar */}
      <div className="shrink-0 rounded border border-border">
        <button
          type="button"
          onClick={() => setShowBlueprint((v) => !v)}
          className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted"
        >
          <span>
            Blueprint-Werkstatt (Standardkarten-Layout testen) —
            {showBlueprint ? " geöffnet" : " geschlossen"}
          </span>
          {showBlueprint ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5" />
          )}
        </button>
        {showBlueprint && (
          <div className="border-t p-2">
            <CardBlueprintWorkshop />
          </div>
        )}
      </div>
    </div>
  );
};

export default VorlagenKatalog;

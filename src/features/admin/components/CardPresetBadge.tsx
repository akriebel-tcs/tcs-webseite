/**
 * CardPresetBadge — read-only Anzeige der erkannten Preset-/Kartenvariante
 * für eine `card_v1`-Section im Admin.
 *
 * Etappe `cms-light-standardkarte-admin-presets-und-sichere-seedings-1`.
 *
 * Schreibt nichts. Verändert nichts. Macht das bestehende Preset-Modell
 * aus `sectionTypes.ts` (CARD_V1_VARIANTS / STANDARD_CARD_PRESETS /
 * detectCardVariant) im Admin sichtbar:
 *  - erkannte Kartenart (z. B. „Bildkarte")
 *  - Parent-Container (falls bekannt)
 *  - Sicherheit der Erkennung (high / medium / low) + Begründung
 *  - kurze Liste aller Standard-Presets als Glossar
 *
 * Bewusst kein Toggle, kein Wechseln des Presets — die Variante ergibt
 * sich heute aus Parent/Asset/Feld-Signalen, nicht aus einer eigenen
 * DB-Spalte. Wechsel verlangt Inhalts-Arbeit (Asset/Container) und wird
 * nicht still über einen Admin-Button gemacht.
 */
import {
  detectCardVariant,
  STANDARD_CARD_PRESETS,
  CARD_V1_VARIANTS,
  type CardVariantKey,
} from "@/features/cms/contract/sectionTypes";
import {
  getContainerLayoutRule,
  presetMatchesContainer,
  getEffectiveCardModulesForContainer,
} from "@/features/admin/lib/containerLayoutRules";
import {
  CARD_MODULES,
  CARD_PRESET_MODULES,
  detectActiveCardModules,
  getCardModule,
  type CardModuleKey,
} from "@/features/cms/contract/cardModules";

interface Props {
  parentSectionType: string | null;
  dbFieldKeys: ReadonlyArray<string>;
  assetFieldKeys: ReadonlyArray<string>;
}

const CONFIDENCE_STYLE: Record<"high" | "medium" | "low", string> = {
  high: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  medium: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  low: "bg-muted text-muted-foreground border-muted-foreground/30",
};

const CONFIDENCE_LABEL: Record<"high" | "medium" | "low", string> = {
  high: "sicher erkannt",
  medium: "wahrscheinlich",
  low: "heuristisch (bitte prüfen)",
};

function labelForPreset(key: CardVariantKey): string {
  const v = CARD_V1_VARIANTS.find((x) => x.variant_key === key);
  return v?.label ?? key;
}

const CardPresetBadge: React.FC<Props> = ({
  parentSectionType,
  dbFieldKeys,
  assetFieldKeys,
}) => {
  const result = detectCardVariant({
    parentSectionType,
    dbFieldKeys,
    assetFieldKeys,
  });
  const v = result.variant;
  const layoutRule = getContainerLayoutRule(parentSectionType);
  const presetFits = presetMatchesContainer(parentSectionType, v.variant_key);

  // Modulmodell: aktive Module aus DB/Assets ableiten und mit den
  // im Container wirksamen Modulen abgleichen. Reine Anzeige, kein Schreiben.
  const activity = detectActiveCardModules({ dbFieldKeys, assetFieldKeys });
  const activeModules = new Set<CardModuleKey>(
    activity.filter((a) => a.active).map((a) => a.module),
  );
  const moduleRules = getEffectiveCardModulesForContainer(parentSectionType);
  const effectiveSet = new Set<CardModuleKey>(moduleRules?.effective ?? []);
  const ignoredSet = new Set<CardModuleKey>(moduleRules?.ignored ?? []);
  const recommendedSet = new Set<CardModuleKey>(moduleRules?.recommended ?? []);

  // Drei Listen für die Anzeige:
  // 1) wirksam UND aktiv (Karte nutzt das Modul → Container zeigt es)
  // 2) vorhanden ABER nicht wirksam (Pflege verpufft)
  // 3) empfohlen, aber leer (Karte könnte vollständiger sein)
  const wirksamAktiv: CardModuleKey[] = [];
  const vorhandenIgnoriert: CardModuleKey[] = [];
  for (const m of CARD_MODULES) {
    const isActive = activeModules.has(m.key);
    if (!moduleRules) continue;
    if (isActive && effectiveSet.has(m.key)) wirksamAktiv.push(m.key);
    if (isActive && ignoredSet.has(m.key)) vorhandenIgnoriert.push(m.key);
  }
  const empfohlenLeer: CardModuleKey[] = moduleRules
    ? [...recommendedSet].filter((k) => !activeModules.has(k))
    : [];

  const presetProfile = CARD_PRESET_MODULES[v.variant_key];
  const presetRequired = presetProfile?.required ?? [];
  const presetRequiredMissing = presetRequired.filter((k) => !activeModules.has(k));

  return (
    <div className="mt-2 rounded-md border border-dashed border-primary/30 bg-primary/5 p-2">
      <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        <span>Standard-Karte (card_v1) — erkanntes Preset (Kartenart)</span>
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${CONFIDENCE_STYLE[result.confidence]}`}
          title={result.reason}
        >
          {CONFIDENCE_LABEL[result.confidence]}
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-2 text-xs">
        <span className="text-sm font-semibold text-foreground">{v.label}</span>
        <span className="rounded border border-muted-foreground/30 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {v.variant_key}
        </span>
        {parentSectionType && (
          <span className="text-[11px] text-muted-foreground">
            in Container{" "}
            <span className="font-mono text-foreground/80">{parentSectionType}</span>
          </span>
        )}
      </div>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {v.description}
      </p>

      {layoutRule && (
        <div className="mt-2 rounded border border-muted-foreground/20 bg-background/60 p-2 text-[11px] leading-relaxed text-muted-foreground">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Container · Layout · erwarteter Bildslot
          </div>
          <div className="text-foreground/80">
            <span className="font-medium">{layoutRule.label}</span>{" "}
            <span className="font-mono text-[10px] text-muted-foreground">
              ({layoutRule.container_type})
            </span>
          </div>
          <div className="mt-0.5">{layoutRule.layout_description}</div>
          <div className="mt-0.5">
            <span className="font-medium text-foreground/80">Bildslot:</span>{" "}
            <span className="font-mono text-[10px]">{layoutRule.expected_image_slot}</span>
            {layoutRule.expected_aspect_ratio && (
              <>
                {" "}·{" "}
                <span className="font-medium text-foreground/80">Bildformat:</span>{" "}
                {layoutRule.expected_aspect_ratio}
              </>
            )}
            {" "}·{" "}
            <span className="font-medium text-foreground/80">Spalten:</span>{" "}
            {layoutRule.typical_columns}
          </div>
          {presetFits === false && (
            <div className="mt-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-800">
              Hinweis: Erkanntes Preset <span className="font-mono">{v.variant_key}</span>{" "}
              passt fachlich nicht zum Container — erlaubt wären{" "}
              <span className="font-mono">{layoutRule.matching_presets.join(", ")}</span>.
              Bitte prüfen (Container ändern, Asset-Slot korrigieren oder Inhalt anpassen).
            </div>
          )}
        </div>
      )}
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground/80">Erkennung:</span>{" "}
        {result.reason}
      </p>

      {/* Modulmodell-Anzeige: was zeigt der Container wirklich? */}
      {moduleRules && (
        <div className="mt-2 rounded border border-muted-foreground/20 bg-background/60 p-2 text-[11px] leading-relaxed">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Module der Standardkarte in diesem Container
          </div>
          <div className="text-foreground/80">
            <span className="font-medium">Wirksam &amp; aktiv:</span>{" "}
            {wirksamAktiv.length > 0 ? (
              <span className="text-foreground">
                {wirksamAktiv.map((k) => getCardModule(k).label).join(" · ")}
              </span>
            ) : (
              <span className="text-muted-foreground">— noch keine Module aktiv —</span>
            )}
          </div>
          {vorhandenIgnoriert.length > 0 && (
            <div className="mt-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-800">
              <span className="font-medium">Vorhanden, aber von diesem Container nicht gerendert:</span>{" "}
              {vorhandenIgnoriert.map((k) => getCardModule(k).label).join(" · ")}.
              Pflege verpufft hier — Container/Preset prüfen oder Felder bewusst leer lassen.
            </div>
          )}
          {empfohlenLeer.length > 0 && (
            <div className="mt-1 text-muted-foreground">
              <span className="font-medium text-foreground/80">Für diesen Container empfohlen, aber noch leer:</span>{" "}
              {empfohlenLeer.map((k) => getCardModule(k).label).join(" · ")}.
              <span className="ml-1 italic">
                (Kein Fehler — z. B. ist eine Textkarte ohne Bild legitim.)
              </span>
            </div>
          )}
          {presetRequiredMissing.length > 0 && (
            <div className="mt-1 text-muted-foreground">
              <span className="font-medium text-foreground/80">Preset-Startzustand erwartet:</span>{" "}
              {presetRequiredMissing.map((k) => getCardModule(k).label).join(" · ")}.
            </div>
          )}
        </div>
      )}

      <details className="mt-2 text-[11px] text-muted-foreground">
        <summary className="cursor-pointer select-none text-foreground/70">
          Alle Standard-Presets (Glossar)
        </summary>
        <ul className="mt-1 list-disc space-y-0.5 pl-4">
          {STANDARD_CARD_PRESETS.map((k) => (
            <li key={k}>
              <span className="font-medium text-foreground/80">{labelForPreset(k)}</span>{" "}
              <span className="font-mono text-[10px]">({k})</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[10px] leading-relaxed">
          Standardkarte = ein technischer Kartentyp (`card_v1`) aus Modulen
          (Bild, Thumbnail, Icon, Eyebrow, Titel, Text, Features, Links, CTA,
          Download). Der Container entscheidet, welche Module wirklich
          gerendert werden. Das Preset ist nur ein redaktioneller
          Startzustand — keine eigene DB-Spalte, keine starre Vorschrift.
        </p>
      </details>
    </div>
  );
};

export default CardPresetBadge;

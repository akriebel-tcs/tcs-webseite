import { ContentSection } from "@/components/PageLayout";
import type { CmsSectionContext } from "../CmsBodyRenderer";
import { f, hasAnyField } from "./_helpers";

/**
 * Gruppen-Darstellung (Spalten mit Titel + Liste).
 *
 * Wenn eine `content_v1`-Section Feldgruppen der Form
 * `<gruppe>.title` + `<gruppe>.items.<n>` enthält (z. B. `design.title`,
 * `design.items.0`), wird sie wie auf den Anwendungsseiten als
 * mehrspaltiger Leistungsblock ausgegeben: pro Gruppe eine Spalte mit
 * Überschrift und darunter eine Liste.
 *
 * Die Reihenfolge der Gruppen ist redaktionell steuerbar:
 *   1. Feld `groups_order` (Komma-Liste der Gruppen-Schlüssel, z. B.
 *      `kommunikation,design,sicherheit`) — hat Vorrang.
 *   2. sonst: Reihenfolge, in der die Gruppentitel im Feld `text` vorkommen.
 *   3. sonst: alphabetisch nach Gruppen-Schlüssel.
 * Ohne Gruppen bleibt es beim bisherigen Fließtext.
 *
 * Zusätzlich steuert das Feld `space_top` den Abstand nach oben:
 * `tight` = eng an den Block darüber, sonst Standardabstand.
 */
interface Group {
  key: string;
  title: string;
  items: string[];
}

const itemIndex = (fieldKey: string) => Number(fieldKey.split(".").pop() ?? "0");

function collectGroups(ctx: CmsSectionContext, text: string): Group[] {
  const fieldKeys = ctx.cms.fieldKeys(ctx.sectionKey);
  const prefixes = Array.from(
    new Set(
      fieldKeys
        .filter((k) => /^[^.]+\.items\.\d+$/.test(k))
        .map((k) => k.split(".")[0]),
    ),
  );

  const groups = prefixes
    .map<Group>((key) => ({
      key,
      title: f(ctx, `${key}.title`),
      items: fieldKeys
        .filter((k) => k.startsWith(`${key}.items.`))
        .sort((a, b) => itemIndex(a) - itemIndex(b))
        .map((k) => f(ctx, k))
        .filter(Boolean),
    }))
    .filter((g) => g.title || g.items.length > 0);

  // 1) Explizite Reihenfolge aus dem Feld `groups_order`.
  const explicit = (f(ctx, "groups_order") || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (explicit.length > 0) {
    return groups.slice().sort((a, b) => {
      const ai = explicit.indexOf(a.key);
      const bi = explicit.indexOf(b.key);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.key.localeCompare(b.key);
    });
  }

  return groups.sort((a, b) => {
    const ai = a.title ? text.indexOf(a.title) : -1;
    const bi = b.title ? text.indexOf(b.title) : -1;
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.key.localeCompare(b.key);
  });
}


export function ContentSectionV1(ctx: CmsSectionContext) {
  const label = f(ctx, "label");
  const title = f(ctx, "title");
  const text = f(ctx, "text");
  const groups = collectGroups(ctx, text);

  if (groups.length === 0 && !hasAnyField(ctx, ["title", "text"])) return null;

  // Abstand nach oben (redaktionell, nur DE gepflegt): `tight` rückt den
  // Block eng an den Block darüber — für Einleitung + Spalten als ein
  // Abschnitt.
  const spaceTop = (ctx.cms.text(ctx.sectionKey, "space_top", "de", "") || "")
    .trim()
    .toLowerCase();
  const padTop = spaceTop === "tight" ? "pt-2 lg:pt-4" : "pt-16 lg:pt-24";

  return (
    <section className={`${padTop} pb-16 lg:pb-24 bg-background`}>

      <div className="container mx-auto">
        <ContentSection
          dataSectionKey={ctx.sectionKey}
          label={label || undefined}
          title={title || undefined}
        >
          {groups.length > 0 ? (
            <div className="grid gap-8 md:grid-cols-3">
              {groups.map((g) => (
                <div key={g.key} data-cms-field={`${g.key}.title`}>
                  {g.title && (
                    <h3 className="mb-3 text-sm font-medium text-foreground">{g.title}</h3>
                  )}
                  <ul className="space-y-2">
                    {g.items.map((item, i) => (
                      <li key={i} className="text-sm text-muted-foreground leading-relaxed">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            text.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed max-w-3xl mb-4 last:mb-0">
                {para}
              </p>
            ))
          )}
        </ContentSection>
      </div>
    </section>
  );
}

/**
 * Portable datasheet layout (A4). Pure React + CSS, no app imports.
 *
 * Everything factual comes from the normalized `datasheet-contract-2.0`
 * payload; branding comes from the brand profile prop. The component invents
 * no content and renders no empty section.
 */

import type { CSSProperties } from "react";
import type {
  ComponentRow,
  ContractBadge,
  DatasheetSheetProps,
  NormalizedSection,
} from "./types";
import { resolveBrandColors } from "./contrast";
import "./datasheet.css";

function defaultBadgeLabel(badge: ContractBadge): string | null {
  return badge.label ?? badge.label_de ?? badge.key ?? null;
}

export function DatasheetSheet({
  sheet,
  brand,
  labels,
  showPrices,
  formatPrice,
  resolveBadgeLabel = defaultBadgeLabel,
  resolveComponentTitle,
  fallbackComponents = [],
}: DatasheetSheetProps) {
  // Validated brand colours only; neutral grey when the profile has none.
  // Accent foreground is an editorial brand decision; the computed contrast
  // value is only a backwards-compatible fallback for legacy profiles.
  // The secondary accent falls back to the primary accent.
  const colors = resolveBrandColors(brand);
  const style: CSSProperties = {
    ["--ds-accent" as string]: colors.accent,
    ["--ds-accent-secondary" as string]: colors.secondaryAccent,
    ["--ds-accent-fg" as string]: colors.accentForeground,
    ["--ds-footer-bg" as string]: colors.footerBackground,
    ["--ds-footer-fg" as string]: colors.footerForeground,
  };

  const priceVisible =
    showPrices && brand.show_price && sheet.contractAllowsPrice && sheet.price !== null;

  const badgeLabels = sheet.badges
    .map((badge) => resolveBadgeLabel(badge))
    .filter((label): label is string => Boolean(label));

  const heroIndex = sheet.sections.findIndex((section) => section.kind === "features");
  const heroSection = heroIndex >= 0 ? sheet.sections[heroIndex] : undefined;
  const restSections = sheet.sections.filter((_, index) => index !== heroIndex);

  const hasComponentSection = sheet.sections.some(
    (section) => section.kind === "components",
  );
  const extraComponents = hasComponentSection ? [] : fallbackComponents;

  const contact = [brand.address, brand.phone, brand.email, brand.website]
    .map((value) => (value ?? "").trim())
    .filter((value) => value !== "");

  return (
    <div className="ds-root" style={style}>
      {/*
       * Plain document flow. Page breaks, repeated page margins and the single
       * brand footer on the last page are produced by the pagination engine
       * (see `paginate.ts`); the footer node below is the template it places.
       */}
      <header className="ds-head">
        <span className="ds-doctype">{labels.documentType}</span>
        {brand.logo_url && (
          <img
            className="ds-logo"
            src={brand.logo_url}
            alt={brand.company_name ?? ""}
          />
        )}
      </header>
      <div className="ds-accentline" />


      <div className="ds-titleblock">
        {sheet.serie && <p className="ds-serie">{sheet.serie}</p>}
        <h1 className="ds-title">{sheet.title ?? sheet.artikelNr}</h1>
        <p className="ds-artikel">{sheet.artikelNr}</p>
      </div>


      <section className="ds-hero">
        {sheet.primaryImage && (
          <div className="ds-hero-media">
            <img src={sheet.primaryImage.url} alt={sheet.primaryImage.alt} />
          </div>
        )}
        <div className="ds-hero-body">
          {badgeLabels.length > 0 && (
            <ul className="ds-badges">
              {badgeLabels.map((label, index) => (
                <li key={`${index}-${label}`}>{label}</li>
              ))}
            </ul>
          )}
          {sheet.subtitle && <p className="ds-lead">{sheet.subtitle}</p>}
          {heroSection?.kind === "features" && (
            <ul className="ds-list">
              {heroSection.items.map((item, index) => (
                <li key={`${index}-${item}`}>{item}</li>
              ))}
            </ul>
          )}
          {priceVisible && (
            <p className="ds-price">
              <span>{labels.price}: </span>
              <strong>{formatPrice(sheet.price!, sheet.currency)}</strong>
            </p>
          )}
        </div>
      </section>

      {restSections.map((section) => (
        <SectionBlock
          key={section.key}
          section={section}
          labels={labels}
          resolveComponentTitle={resolveComponentTitle}
        />
      ))}

      {extraComponents.length > 0 && (
        <section className="ds-section">
          <h2 className="ds-section-title">{labels.contents}</h2>
          <ComponentTable
            rows={extraComponents}
            resolveComponentTitle={resolveComponentTitle}
          />
        </section>
      )}

      {/* Placed once, on the last page, by the pagination engine. */}
      <footer className="ds-footer" data-ds-footer="true">
        {[brand.company_name, ...contact].filter(Boolean).join(" · ")}
      </footer>
    </div>
  );
}



function SectionBlock({
  section,
  labels,
  resolveComponentTitle,
}: {
  section: NormalizedSection;
  labels: DatasheetSheetProps["labels"];
  resolveComponentTitle?: DatasheetSheetProps["resolveComponentTitle"];
}) {
  const heading =
    section.title ??
    (section.kind === "components"
      ? labels.contents
      : section.kind === "features"
        ? labels.features
        : null);

  return (
    <section className="ds-section">
      {heading && <h2 className="ds-section-title">{heading}</h2>}

      {section.kind === "features" && (
        <ul className="ds-list">
          {section.items.map((item, index) => (
            <li key={`${index}-${item}`}>{item}</li>
          ))}
        </ul>
      )}

      {section.kind === "specs" &&
        section.groups.map((group, index) => (
          <div className="ds-group" key={`${index}-${group.title ?? ""}`}>
            {group.title && <p className="ds-group-title">{group.title}</p>}
            <table className="ds-tbl">
              <tbody>
                {group.rows.map((row, rowIndex) => (
                  <tr key={`${rowIndex}-${row.label}`}>
                    <td className="ds-label">{row.label}</td>
                    <td>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {section.kind === "components" && (
        <ComponentTable
          rows={section.items}
          resolveComponentTitle={resolveComponentTitle}
        />
      )}

      {section.kind === "text" &&
        section.blocks.map((block, index) => (
          <div className="ds-group" key={`${block.title ?? "t"}-${index}`}>
            {block.title && <p className="ds-group-title">{block.title}</p>}
            <p style={{ whiteSpace: "pre-line", margin: 0 }}>{block.text}</p>
          </div>
        ))}

      {section.kind === "tables" &&
        section.tables.map((table, tableIndex) => (
          <div className="ds-group" key={`${tableIndex}-${table.title ?? ""}`}>
            {table.title && <p className="ds-group-title">{table.title}</p>}
            <table className="ds-tbl">
              {table.columns.length > 0 && (
                <thead>
                  <tr>
                    {table.columns.map((column, columnIndex) => (
                      <th key={`${columnIndex}-${column}`}>{column}</th>
                    ))}
                  </tr>
                </thead>
              )}
              <tbody>
                {table.rows.map((cells, rowIndex) => (
                  <tr key={`${tableIndex}-${rowIndex}`}>
                    {cells.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className={cellIndex === 0 ? "ds-label" : undefined}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      {section.kind === "media" && (
        <div className="ds-figures">
          {section.items.map((item, index) => (
            <figure className="ds-figure" key={`${index}-${item.url}`}>
              <img src={item.url} alt={item.alt} />
              {item.caption && <figcaption>{item.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}

function ComponentTable({
  rows,
  resolveComponentTitle,
}: {
  rows: ComponentRow[];
  resolveComponentTitle?: DatasheetSheetProps["resolveComponentTitle"];
}) {
  return (
    <table className="ds-tbl">
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${index}-${row.artikelNr}`}>
            <td className="ds-label">{row.roleLabel ?? ""}</td>
            <td>
              {resolveComponentTitle
                ? resolveComponentTitle(row.artikelNr, row.title)
                : row.title}
            </td>
            <td className="ds-nr">{row.artikelNr}</td>
            <td className="ds-qty">
              {row.quantity !== null ? `${row.quantity}×` : ""}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * Strukturdaten der Referenzprojekte (Slugs, Reihenfolge, Year).
 *
 * Sichtbare Texte werden über i18n / CMS unter
 * `anwendungen.referenzen.projekte.<slug>.*` bzw.
 * `anwendungen.referenzprojekte.<slug>` geladen.
 *
 * Bilder (Hero + Galerie) liegen ausschließlich in `cms_assets`
 * (Sub-Page `anwendungen.referenzprojekte.<slug>`, Slots `hero.image`
 * und `gallery.img_0/1/2`). Sie werden hier bewusst NICHT mehr geführt.
 *
 * `year` bleibt vorerst im Code (kein DB-Slot).
 * Slugs und Reihenfolge müssen stabil bleiben.
 */
export interface ReferenzprojektData {
  slug: string;
  /** Numerisches Jahr – nicht lokalisiert. */
  year: string;
}

export const referenzprojekte: ReferenzprojektData[] = [
  { slug: "pulse-berlin", year: "2022" },
  { slug: "weidt-park-corner", year: "2021" },
  { slug: "fritztower", year: "2023" },
  { slug: "haupttelegraphenamt", year: "2020" },
  { slug: "spichern-2", year: "2021" },
  { slug: "thulestrasse", year: "2022" },
  { slug: "quartier-heidestrasse", year: "2023" },
  { slug: "luisenpark-residenz", year: "2022" },
  { slug: "klinikum-sued", year: "2023" },
  { slug: "rathaus-neustadt", year: "2021" },
  { slug: "campus-westend", year: "2022" },
  { slug: "seniorenresidenz-am-park", year: "2023" },
];

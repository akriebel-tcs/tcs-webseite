/**
 * Regressionstest: Beim Bearbeiten der Startseite (Block ausblenden /
 * verschieben / duplizieren) darf der aufgeklappte Zustand des
 * Navigationsbaums NICHT verloren gehen.
 *
 * Hintergrund: Früher hat das Wiederladen der Sections nach jeder Mutation
 * den gesamten Tree-Komponenten neu gemountet (`key={reloadKey}`), wodurch
 * der `expanded`-State zurückgesetzt wurde. Nutzer mussten Startseite
 * danach jedes Mal erneut aufklappen.
 *
 * Dieser Test rendert den Tree mit gemockten APIs, klappt „Startseite" auf,
 * blendet einen Block aus und prüft, dass die Sections der Startseite
 * weiterhin im DOM sichtbar sind (= Knoten bleibt aufgeklappt).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// --- API-Mocks ----------------------------------------------------------

vi.mock("@/features/admin/api/cmsAdminNavigation", () => ({
  readNavigationNodes: vi.fn(async () => ({
    nodes: [
      {
        id: "node-home-start",
        nav_area: "home",
        node_key: "home.start",
        parent_id: null,
        parent_node_key: null,
        page_key: "home.start",
        label: "Startseite",
        label_de: "Startseite",
        label_en: "Home",
        description_de: null,
        description_en: null,
        node_type: "page",
        external_url: null,
        route_path: "/",
        sort_order: 0,
        is_active: true,
        show_in_public_nav: true,
      },
    ],
    error: null,
  })),
}));

vi.mock("@/features/admin/api/cmsAdminPages", () => ({
  readPagesWithNav: vi.fn(async () => ({
    pages: [{ page_key: "home.start", page_no: 1 }],
    error: null,
  })),
}));

vi.mock("@/features/admin/api/cmsAdminNavigationMove", () => ({
  moveNavigationNode: vi.fn(async () => ({ success: true, new_sort_order: 0 })),
}));

vi.mock("@/features/admin/api/cmsAdminNavigationWrite", () => ({
  setNavigationNodeActive: vi.fn(async () => ({ success: true })),
}));

vi.mock("@/features/admin/api/cmsAdminPagesLifecycle", () => ({
  deleteNavigationNode: vi.fn(async () => ({ success: true })),
}));

const sectionsStore: Array<{
  id: string;
  page_key: string;
  section_key: string;
  section_type: string;
  section_no: number | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}> = [
  {
    id: "s1",
    page_key: "home.start",
    section_key: "block_eins",
    section_type: "block",
    section_no: 1,
    sort_order: 0,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "s2",
    page_key: "home.start",
    section_key: "block_zwei",
    section_type: "block",
    section_no: 2,
    sort_order: 1,
    is_active: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
];

vi.mock("@/features/admin/api/cmsAdminSectionOrder", () => ({
  readPageSections: vi.fn(async () => ({
    sections: sectionsStore.map((s) => ({ ...s })),
    error: null,
  })),
  setSectionActive: vi.fn(async (args: { sectionKey: string; isActive: boolean }) => {
    const row = sectionsStore.find((s) => s.section_key === args.sectionKey);
    if (row) row.is_active = args.isActive;
    return { success: true, error: null };
  }),
  reorderSection: vi.fn(async () => ({ success: true, error: null })),
  deleteSection: vi.fn(async () => ({ success: true, error: null })),
  duplicateSection: vi.fn(async () => ({ success: true, error: null })),
}));

// --- SUT importieren NACH den Mocks -------------------------------------

import NavigationTreeEditor from "@/features/admin/components/NavigationTreeEditor";

beforeEach(() => {
  // Sections-Store zurücksetzen
  sectionsStore[0].is_active = true;
  sectionsStore[1].is_active = true;
});

describe("NavigationTreeEditor — aufgeklappter Zustand bleibt beim Bearbeiten erhalten", () => {
  it("hält Startseite aufgeklappt, nachdem ein Block ausgeblendet wurde", async () => {
    const onSectionsMutated = vi.fn();
    render(<NavigationTreeEditor onSectionsMutated={onSectionsMutated} />);

    // Startseite erscheint
    const startseiteBtn = await screen.findByTitle("home.start");
    expect(startseiteBtn).toBeInTheDocument();

    // Aufklappen
    const expandBtn = screen.getByRole("button", { name: "Aufklappen" });
    fireEvent.click(expandBtn);

    // Beide Blöcke werden angezeigt
    await waitFor(() => {
      expect(screen.getByText("block_eins")).toBeInTheDocument();
      expect(screen.getByText("block_zwei")).toBeInTheDocument();
    });

    // „block_eins" ausblenden — Batch 57.1: der Button wurde in das
    // „Weitere Aktionen"-Menü (Radix-DropdownMenu) verschoben. Wir
    // verwenden userEvent, damit Radix die Pointer-/Click-Sequenz
    // korrekt sieht und das Menü öffnet.
    const user = userEvent.setup();
    const row = screen.getByText("block_eins").closest("div");
    expect(row).not.toBeNull();
    const moreBtn = within(row!).getByTitle("Weitere Aktionen");
    await user.click(moreBtn);
    const hideBtn = await screen.findByText(/Block ausblenden/, undefined, { timeout: 2000 });
    await user.click(hideBtn);

    // Mutation-Callback wurde gerufen
    await waitFor(() => {
      expect(onSectionsMutated).toHaveBeenCalled();
    });

    // Kritisch: Sections sind weiterhin im DOM — Tree blieb aufgeklappt
    await waitFor(() => {
      expect(screen.getByText("block_eins")).toBeInTheDocument();
      expect(screen.getByText("block_zwei")).toBeInTheDocument();
    });

    // Status „Ausgeblendet" sollte nun beim ersten Block erscheinen
    // (case-insensitive — der sichtbare Badge schreibt „Ausgeblendet").
    await waitFor(() => {
      expect(screen.getAllByText(/ausgeblendet/i).length).toBeGreaterThan(0);
    });
  });
});

// kleiner Helper-Import unten, damit der Mock-Block oben kompakt bleibt
import { within } from "@testing-library/react";

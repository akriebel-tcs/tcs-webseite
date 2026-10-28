/**
 * CmsRenderRegistry — Render-Register, das festhält, welche `section_key`s
 * bereits INLINE (von einer Page-Komponente / vom `CmsBodyRenderer`)
 * ausgespielt werden. Die zentralen Seitenend-Renderer (`CmsTailCta`,
 * `CmsTailFaq`, `CmsTailSections`) überspringen genau diese Schlüssel.
 *
 * Lebenszyklus (Etappe 4C):
 *   - Jeder Inline-Renderer ist ein *Besitzer* (eigene Identität). Pro
 *     Schlüssel wird eine Besitzermenge geführt. Ein Schlüssel gilt als
 *     „inline vorhanden", solange mindestens ein Besitzer eingetragen ist.
 *     Räumt ein Besitzer auf, bleiben die anderen erhalten.
 *   - Während des Renders trägt sich ein Besitzer *vorläufig* ein
 *     (`pending`). Damit greift die synchrone Inline/Tail-Dedup im selben
 *     Render-Pass: der Tail-Renderer sieht den Schlüssel sofort.
 *   - Nach dem Commit bestätigt der Effekt des Besitzers den Eintrag
 *     (`committed`) und überführt dabei seinen vorläufigen Besitz. Eine
 *     während des Renders erkannte Änderung wird erst jetzt gemeldet.
 *     Der Provider räumt zusätzlich nach eigenen Commits übrige vorläufige
 *     Einträge weg.
 *   - Verschwindet ein Inline-Renderer (Unmount, Besitzerwechsel, oder
 *     „renderbar → leer", also Schlüssel ⇒ ""), entfernt sein Aufräumschritt
 *     den Eintrag und das Register **benachrichtigt** seine Zuhörer.
 *     Die Seitenend-Renderer hängen den Block dadurch automatisch nach —
 *     ohne dass ein weiterer Render von außen nötig ist.
 *
 * Alle Zustandsänderungen mit Benachrichtigung passieren in Effekten bzw.
 * Aufräumschritten, also nach dem Commit — keine setState-Warnung während
 * eines fremden Renders. Benachrichtigt wird nur, wenn sich die Menge der
 * sichtbaren Schlüssel wirklich ändert; damit gibt es keine Endlosschleife.
 *
 * Fehlt der Provider, ist `useMarkRendered` ein No-Op und
 * `useRenderedSections` liefert ein leeres Set (Legacy-Pfade unverändert).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type Owner = object;

class RenderRegistry {
  /** Bestätigte Besitzer je Schlüssel (nach Commit). */
  private committed = new Map<string, Set<Owner>>();
  /** Vorläufige Besitzer aus dem laufenden Render-Pass. */
  private pending = new Map<string, Set<Owner>>();
  private listeners = new Set<() => void>();
  /** Zählt jede wirksame Änderung; dient den Zuhörern als Anlass. */
  private version = 0;
  private snapshot: Set<string> = new Set();
  /** Während des Renders sichtbar geworden, aber noch nicht gemeldet. */
  private hasUnnotifiedChange = false;

  getVersion(): number {
    return this.version;
  }

  getSnapshot(): Set<string> {
    return this.snapshot;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Vorläufiger Eintrag während des Renders — bewusst ohne Benachrichtigung. */
  claimDuringRender(key: string, owner: Owner): void {
    if (!key) return;
    addOwner(this.pending, key, owner);
    this.rebuild(false);
  }

  /** Bestätigter Eintrag nach dem Commit. */
  commit(key: string, owner: Owner): void {
    if (!key) return;
    addOwner(this.committed, key, owner);
    // Besitzer aus Teilbaum-Renders selbst überführen: Der Provider muss für
    // diesen Commit nicht erneut gerendert worden sein.
    removeOwner(this.pending, key, owner);
    this.rebuild(true);
  }

  /** Besitzer entfernen (Unmount, Schlüsselwechsel, renderbar → leer). */
  release(key: string, owner: Owner): void {
    if (!key) return;
    removeOwner(this.committed, key, owner);
    removeOwner(this.pending, key, owner);
    this.rebuild(true);
  }

  /**
   * Vorläufige Einträge nach dem Commit verwerfen. Bestätigte Besitzer
   * bleiben; Einträge aus verworfenen Renders verschwinden.
   */
  clearPending(): void {
    if (this.pending.size === 0) return;
    this.pending.clear();
    this.rebuild(true);
  }

  private rebuild(notify: boolean): void {
    const next = new Set<string>();
    for (const [key, owners] of this.committed) if (owners.size > 0) next.add(key);
    for (const [key, owners] of this.pending) if (owners.size > 0) next.add(key);
    const changed = !sameKeys(next, this.snapshot);
    if (changed) {
      this.snapshot = next;
      this.version += 1;
    }
    if (!notify) {
      if (changed) this.hasUnnotifiedChange = true;
      return;
    }
    if (!changed && !this.hasUnnotifiedChange) return;
    this.hasUnnotifiedChange = false;
    for (const listener of Array.from(this.listeners)) listener();
  }
}

function addOwner(map: Map<string, Set<Owner>>, key: string, owner: Owner): void {
  const set = map.get(key);
  if (set) set.add(owner);
  else map.set(key, new Set([owner]));
}

function removeOwner(map: Map<string, Set<Owner>>, key: string, owner: Owner): void {
  const set = map.get(key);
  if (!set) return;
  set.delete(owner);
  if (set.size === 0) map.delete(key);
}

function sameKeys(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const k of a) if (!b.has(k)) return false;
  return true;
}

const CmsRenderRegistryContext = createContext<RenderRegistry | null>(null);

interface ProviderProps {
  children: ReactNode;
}

export function CmsRenderRegistryProvider({ children }: ProviderProps) {
  const registry = useMemo(() => new RenderRegistry(), []);
  // Läuft nach jedem Render des Providers und damit nach den Effekten der
  // Kinder: bestätigte Einträge stehen bereits, vorläufige dürfen weg.
  useEffect(() => {
    registry.clearPending();
  });
  return (
    <CmsRenderRegistryContext.Provider value={registry}>
      {children}
    </CmsRenderRegistryContext.Provider>
  );
}

/**
 * Markiert eine Section als „wird inline gerendert".
 * Ein leerer `sectionKey` markiert bewusst nichts (kein Phantom-Veto).
 * Der Hook wird immer aufgerufen — die Hook-Reihenfolge bleibt stabil.
 */
export function useMarkRendered(sectionKey: string): void {
  const registry = useContext(CmsRenderRegistryContext);
  const ownerRef = useRef<Owner | null>(null);
  if (ownerRef.current === null) ownerRef.current = {};
  const owner = ownerRef.current;

  if (registry && sectionKey) registry.claimDuringRender(sectionKey, owner);

  useEffect(() => {
    if (!registry || !sectionKey) return;
    registry.commit(sectionKey, owner);
    return () => {
      registry.release(sectionKey, owner);
    };
  }, [registry, sectionKey, owner]);
}

/**
 * Liefert die Schlüssel, die aktuell inline ausgespielt werden. Der Aufrufer
 * wird bei Änderungen des Registers neu gerendert (Beobachtung nach Commit),
 * damit ein Seitenend-Renderer verschwundene Inline-Ausgaben automatisch
 * übernimmt.
 */
export function useRenderedSections(): Set<string> {
  const registry = useContext(CmsRenderRegistryContext);
  const [, setVersion] = useState(0);

  useEffect(() => {
    if (!registry) return;
    let mounted = true;
    const sync = () => {
      if (mounted) setVersion(registry.getVersion());
    };
    const unsubscribe = registry.subscribe(sync);
    sync();
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [registry]);

  return registry?.getSnapshot() ?? EMPTY;
}

const EMPTY: Set<string> = new Set();

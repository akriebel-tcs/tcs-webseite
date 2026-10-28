/**
 * Reine Hilfslogik für renderability-gate.mjs --update-baseline.
 *
 * Regel (Batch 57.1, „Strict-Subset"):
 *   Beim Aktualisieren der Baseline müssen ALLE neuen Fingerprints
 *   bereits in der bestehenden Baseline vorhanden sein.
 *   Sobald irgendein Fingerprint neu ist, wird der Update abgelehnt,
 *   unabhängig davon, ob die Gesamtanzahl gleich bleibt oder sinkt.
 *
 * Erlaubte Übergänge:
 *   - echte Verkleinerung      (next ⊊ base)            → ok
 *   - unveränderte Baseline    (next == base)           → ok
 *
 * Verbotene Übergänge:
 *   - Vergrößerung             (|next| > |base|)        → reject
 *   - gleiche Anzahl, ein FP ausgetauscht                → reject
 *   - kleinere Anzahl, mindestens ein FP neu             → reject
 */
export function classifyBaselineUpdate(baselineFingerprints, nextFingerprints) {
  const baselineSet = new Set(baselineFingerprints);
  const nextSet = new Set(nextFingerprints);
  const added = [...nextSet].filter((fp) => !baselineSet.has(fp));
  const removed = [...baselineSet].filter((fp) => !nextSet.has(fp));
  const ok = added.length === 0; // strict subset (oder Gleichheit)
  return { ok, added, removed, baselineSize: baselineSet.size, nextSize: nextSet.size };
}

#!/usr/bin/env python3
"""Reproduce the Admin SlotValidationView totals (read-only).
Mirrors src/features/admin/lib/rendererSlotMap.ts + buildReport()."""
from collections import defaultdict, Counter

RENDERER_SLOT_MAP = {
    "hero_v1": [("image", "required")],
    "content_v1": [],
    "cards_v1": [],
    "card_grid_v1": [],
    "catalog_filter_grid_v1": [],
    "card_v1": [("image", "optional"), ("thumbnail", "optional"), ("icon_image", "optional")],
    "feature_grid_v1": [],
    "product_scroller_v1": [],
    "download_list_v1": [],
    "contact_block_v1": [],
    "stats_v1": [],
    "cta_v1": [("image", "optional")],
    "rich_v1": [],
    "faq_v1": [],
    "teaser_2col_v1": [("image", "required")],
    "tabs_v1": [],
    "series_override_v1": [],
    "series_override_container_v1": [],
}
KNOWN = set(RENDERER_SLOT_MAP.keys())
ALIAS = {
    "hero": "hero_v1", "content": "content_v1", "intro": "content_v1",
    "content_block_v1": "content_v1", "content_blocks_intro_v1": "content_v1",
    "cta": "cta_v1", "rich": "rich_v1", "feature-grid": "feature_grid_v1",
    "product-scroller": "product_scroller_v1", "products": "product_scroller_v1",
}
def norm(t): return ALIAS.get(t, t) if t else None

pages = {}
with open("/tmp/pages.tsv") as f:
    for ln in f:
        pk, st, act = ln.rstrip("\n").split("\t")
        pages[pk] = (st, act == "t")

sections = {}
for ln in open("/tmp/sections.tsv"):
    pk, sk, st, act = ln.rstrip("\n").split("\t")
    sections[(pk, sk)] = (norm(st), st, act == "t")

assets = {}
for ln in open("/tmp/assets.tsv"):
    pk, sk, fk, a, i = ln.rstrip("\n").split("\t")
    assets[(pk, sk, fk)] = (int(a), int(i))

# Expected slots from active sections
expected = {}
for (pk, sk), (nt, _, act) in sections.items():
    if not act or nt not in RENDERER_SLOT_MAP: continue
    for fk, exp in RENDERER_SLOT_MAP[nt]:
        expected[(pk, sk, fk)] = exp

slot_keys = set(assets) | set(expected)

counts = Counter()
problems_by_field = Counter()
problems_by_type = Counter()
problems_by_page = Counter()
warns_by_field = Counter()
warns_by_type = Counter()
pages_seen = set()
sample_orphan = []

for key in slot_keys:
    pk, sk, fk = key
    pages_seen.add(pk)
    sec = sections.get((pk, sk))
    act_n, inact_n = assets.get(key, (0, 0))
    spec_exp = expected.get(key)
    if not sec:
        kind = ("error", "no_section"); 
    else:
        nt, raw, sec_act = sec
        if not sec_act:
            kind = ("warn", "orphan")
        elif nt not in KNOWN:
            kind = ("error", "unknown_section_type")
        elif spec_exp and act_n > 0:
            kind = ("ok", "match")
        elif spec_exp and act_n == 0:
            kind = ("warn", "empty_required" if spec_exp == "required" else "empty_optional")
        else:
            kind = ("error", "orphan")
            if len(sample_orphan) < 15:
                sample_orphan.append((pk, sk, raw, fk, act_n, inact_n))
    counts[kind] += 1
    if kind[0] == "error":
        problems_by_field[fk] += 1
        if sec: problems_by_type[sec[1]] += 1
        problems_by_page[pk] += 1
    elif kind[0] == "warn":
        warns_by_field[fk] += 1
        if sec: warns_by_type[sec[1]] += 1

ok = sum(v for k, v in counts.items() if k[0] == "ok")
warn = sum(v for k, v in counts.items() if k[0] == "warn")
err = sum(v for k, v in counts.items() if k[0] == "error")
print(f"Slots gesamt: {ok+warn+err} | Seiten: {len(pages_seen)}")
print(f"OK: {ok} | Hinweis: {warn} | Problem: {err}")
print("\nBefund-Verteilung:")
for k, v in sorted(counts.items(), key=lambda x: -x[1]):
    print(f"  {k[0]:5s} {k[1]:25s} {v}")
print("\nTop Problem field_key:")
for f, c in problems_by_field.most_common(10): print(f"  {c:5d}  {f}")
print("\nTop Problem section_type:")
for f, c in problems_by_type.most_common(10): print(f"  {c:5d}  {f}")
print("\nTop Problem pages:")
for f, c in problems_by_page.most_common(10): print(f"  {c:5d}  {f}")
print("\nTop Hinweis field_key:")
for f, c in warns_by_field.most_common(10): print(f"  {c:5d}  {f}")
print("\nTop Hinweis section_type:")
for f, c in warns_by_type.most_common(10): print(f"  {c:5d}  {f}")
print("\nSample orphan slots (DB-Asset, kein Renderer-Slot):")
for s in sample_orphan: print(" ", s)

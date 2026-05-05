"""Crawl all (handbook, module) pairs from data/handbook_modules.json.

Reuses parser logic from indigit_sample.py. Uses plain HTTP (page 70 is
server-rendered). Skips Lehrveranstaltung pages by default to keep request
count manageable; pass --with-lvs to also crawl page 74 for every LV.

Output:
  data/all_modules.json         — one entry per (mhid, mid)
  data/raw/<mhid>_<mid>.html    — saved per-module
  data/all_modules_failed.json  — entries that didn't fetch/parse
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

import requests

from indigit_sample import (
    HERE,
    RAW_DIR,
    fetch,
    parse_lehrveranstaltung,
    parse_module,
    save_raw,
)

INPUT = HERE / "data" / "handbook_modules.json"
OUT_PATH = HERE / "data" / "all_modules.json"
FAIL_PATH = HERE / "data" / "all_modules_failed.json"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--with-lvs", action="store_true", help="also fetch page 74 for every Lehrveranstaltung")
    ap.add_argument("--throttle", type=float, default=0.4, help="seconds to sleep between requests")
    ap.add_argument("--limit", type=int, default=0, help="cap fetches (0 = no cap; useful for dry runs)")
    ap.add_argument("--resume", action="store_true", help="skip pairs already present in raw/")
    ap.add_argument("--mids", type=str, default="", help="comma-separated MIDs to restrict the crawl to (use with --with-lvs to backfill specific modules)")
    args = ap.parse_args()
    mid_filter = {int(x) for x in args.mids.split(",") if x.strip()}

    if not INPUT.exists():
        print(f"missing {INPUT} — run the dev-browser enumerator first", file=sys.stderr)
        return 1

    enum_data = json.loads(INPUT.read_text(encoding="utf-8"))
    # Dedupe by MID — same module may appear in multiple handbooks but the
    # detail page (page 70) only varies in breadcrumb. Keep the first occurrence
    # so the handbook context (mhid/handbook_code) is the most-recent version.
    seen_mid: set[int] = set()
    pairs: list[dict] = []
    for p in enum_data["all"]:
        if mid_filter and p["mid"] not in mid_filter:
            continue
        if p["mid"] in seen_mid:
            continue
        seen_mid.add(p["mid"])
        pairs.append(p)
    if args.limit:
        pairs = pairs[: args.limit]
    print(f"crawling {len(pairs)} unique modules (deduped from {len(enum_data['all'])}); with_lvs={args.with_lvs}", file=sys.stderr)

    session = requests.Session()
    session.headers["User-Agent"] = "campus-app-research/0.1 (nohl.julian@gmail.com)"

    modules: list[dict] = []
    failed: list[dict] = []
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    for i, p in enumerate(pairs, 1):
        mhid, mid = p["mhid"], p["mid"]
        raw_path = RAW_DIR / f"{mhid}_{mid}.html"
        try:
            if args.resume and raw_path.exists():
                html = raw_path.read_text(encoding="utf-8")
            else:
                html = fetch(session, 70, {"P70_MID": mid, "P70_MHID": mhid})
                raw_path.write_text(html, encoding="utf-8")
                time.sleep(args.throttle)
            mod = parse_module(html, mhid, mid)
            mod["_raw_html_path"] = str(raw_path.relative_to(HERE.parent))
            mod["_handbook_code"] = p.get("handbook_code")

            if args.with_lvs:
                for lv in mod["lehrveranstaltungen"]:
                    cid = lv.get("cid")
                    if not cid:
                        continue
                    lv_path = RAW_DIR / f"{mhid}_lv_{cid}.html"
                    if args.resume and lv_path.exists():
                        lv_html = lv_path.read_text(encoding="utf-8")
                    else:
                        lv_html = fetch(session, 74, {"P74_CID": cid, "P74_MHID": mhid})
                        lv_path.write_text(lv_html, encoding="utf-8")
                        time.sleep(args.throttle)
                    lv.update(parse_lehrveranstaltung(lv_html))
                    lv["_raw_html_path"] = str(lv_path.relative_to(HERE.parent))
            modules.append(mod)
            if i % 25 == 0 or i == len(pairs):
                print(f"  [{i}/{len(pairs)}] {p.get('handbook_code')} {p.get('kuerzel')}", file=sys.stderr)
        except Exception as exc:
            failed.append({"mhid": mhid, "mid": mid, "kuerzel": p.get("kuerzel"), "error": repr(exc)})
            print(f"  [{i}/{len(pairs)}] FAILED {p.get('kuerzel')} mid={mid}: {exc}", file=sys.stderr)

    # When --mids is used, merge into the existing all_modules.json instead
    # of replacing it (so a targeted backfill doesn't wipe out the other
    # ~1500 entries from the previous full crawl).
    if mid_filter and OUT_PATH.exists():
        existing = json.loads(OUT_PATH.read_text(encoding="utf-8"))
        by_mid = {m["mid"]: m for m in existing}
        for new_m in modules:
            by_mid[new_m["mid"]] = new_m
        final = list(by_mid.values())
        print(f"merged {len(modules)} updates into {len(existing)} existing → {len(final)} total", file=sys.stderr)
    else:
        final = modules

    OUT_PATH.write_text(json.dumps(final, ensure_ascii=False, indent=2), encoding="utf-8")
    FAIL_PATH.write_text(json.dumps(failed, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"done: {len(modules)} parsed, {len(failed)} failed", file=sys.stderr)
    print(f"  -> {OUT_PATH.relative_to(HERE.parent)}", file=sys.stderr)
    return 0 if not failed else 0  # don't fail the process; failed.json captures them


if __name__ == "__main__":
    raise SystemExit(main())

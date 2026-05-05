"""Fetch a curated sample of HTWG INdigit module pages and dump structured JSON.

Inspects page 70 (module) and page 74 (Lehrveranstaltung) of the Oracle APEX app
at https://indigit.htwg-konstanz.de/app/. Used as input for the campus-app
database schema discussion: small, varied AIN sample across two SPO versions.
"""
from __future__ import annotations

import json
import re
import sys
import time
from pathlib import Path
from urllib.parse import parse_qs, urlencode, urlparse

import requests
from bs4 import BeautifulSoup, Tag

BASE = "https://indigit.htwg-konstanz.de/app/"
HERE = Path(__file__).resolve().parent
RAW_DIR = HERE / "data" / "raw"
OUT_PATH = HERE / "data" / "ain_sample.json"

# (mhid, mid) — see plan: 5 from AIN SPO 3.1 + 2 from AIN SPO 4
SAMPLE: list[tuple[int, int]] = [
    (188, 2202),  # MAT1/01    Mathematik 1
    (188, 2213),  # SENG/12    Software Engineering
    (188, 2216),  # IPSS/15    Praktisches Studiensemester
    (188, 2223),  # ARIN/AI1   Artificial Intelligence (WPM)
    (188, 2222),  # BARB/21    Bachelorarbeit
    (462, 3615),  # ALG/01     Algebra (SPO 4)
    (462, 3624),  # TGKI/WB1-1 Technische Grundlagen der KI (SPO 4)
]

# APEX field id → snake_case key. Anything we encounter outside this map ends up
# in `_unmapped` so schema surprises surface in review.
P70_FIELD_MAP: dict[str, str] = {
    "P70_SHORTCODE": "kuerzel",
    "P70_NAME": "name",
    "P70_MODULETYPE": "modultyp",
    "P70_COORDINATOR": "koordinator",
    "P70_CONTACTTIME": "kontaktzeit_h",
    "P70_SELFSTUDY": "selbststudium_h",
    "P70_SEMESTERCOUNT": "semesteranzahl",
    "P70_STARTSEMESTER": "startsemester",
    "P70_STARTPHASE": "startphase",
    "P70_LANGUAGE": "sprache",
    "P70_LAST_UPDATE": "letzte_aenderung",
    "P70_PREREQUISITES": "voraussetzungen_inhaltlich",
    "P70_NECESSARY_FOR": "vorkenntnis_erforderlich_fuer",
    "P70_COMBINE_WITH": "sinnvoll_zu_kombinieren_mit",
    "P70_MP_GRADED_EXAM": "pruefung_benotet",
    "P70_MP_UNGRADED_EXAM": "pruefung_unbenotet",
    "P70_MP_PERFORMANCE_RECORD": "leistungsnachweis_unbenotet",
    "P70_TEACHLEARN_TYPES": "lehr_lernformen",
    "P70_TEACHLEARN_TYPES_MISC": "lehr_lernformen_sonstiges",
    "P70_LEARNTARGET_TECHNICAL": "lernziele",
    "P70_LEARNTARGET_PERSONAL": "personale_kompetenzen",
    "P70_LITERATURE": "literatur",
    "P70_GRADE_COMPOSITION_MISC": "endnote_regel_sonstiges",
}

P74_FIELD_MAP: dict[str, str] = {
    "P74_ABBREVIATION": "kuerzel",
    "P74_NAME": "name",
    "P74_TYPE": "typ",
    "P74_RESPONSIBLE": "verantwortlich",
    "P74_ADDITIONAL_TEACHERS": "weitere_dozierende",
    "P74_ECTS": "ects",
    "P74_TLOADESTIMATE": "sws",
    "P74_GRADEEXAMINATION": "mtp_benotet",
    "P74_UNGRADEDEXAM": "mtp_unbenotet",
    "P74_PERFORMANCERECORD": "leistungsnachweis_unbenotet",
    "P74_TEACHINGCONTENTS": "lehrinhalt",
}

# Page-74 fields that just mirror the parent module — we already have these
# from page 70, so don't double-record or treat as unmapped.
P74_MODULE_MIRROR_PREFIX = "P74_MODULE_"
P74_IGNORE = {
    "P74_SHORTCODE",
    "P74_COORDINATOR",
    "P74_CONTACTTIME",
    "P74_SELFSTUDY",
    "P74_SEMESTERCOUNT",
    "P74_STARTSEMESTER",
    "P74_LANGUAGE",
    "P74_MODULETYPE",
    "P74_LAST_UPDATE",
    "P74_MP_GRADED_EXAM",
    "P74_MP_UNGRADED_EXAM",
    "P74_MP_PERFORMANCE_RECORD",
    "P74_PREREQUISITES",
    "P74_NECESSARY_FOR",
    "P74_COMBINE_WITH",
    "P74_TEACHLEARN_TYPES",
    "P74_TEACHLEARN_TYPES_MISC",
    "P74_LEARNTARGET_TECHNICAL",
    "P74_LEARNTARGET_PERSONAL",
    "P74_LITERATURE",
    "P74_GRADE_COMPOSITION_MISC",
}

LEHRFORM_LABELS = {"Vorlesung", "Übung", "Praktikum", "Seminar", "Selbststudium"}
NUMERIC_KEYS = {"kontaktzeit_h", "selbststudium_h", "semesteranzahl", "ects", "sws"}
LIST_KEYS = {"startphase", "lehr_lernformen"}
# `startsemester` is intentionally NOT numeric — it can be a range like "5-7"
# (Wahlpflicht modules) which must round-trip as text.


def fetch(session: requests.Session, page: int, params: dict[str, int]) -> str:
    # Build the APEX param string: f?p=136:<page>:::::<NAMES>:<VALUES>
    names = ",".join(params.keys())
    values = ",".join(str(v) for v in params.values())
    url = f"{BASE}f?p=136:{page}:::::{names}:{values}"
    r = session.get(url, timeout=20)
    r.raise_for_status()
    return r.text


def display_value(soup: BeautifulSoup, field_id: str) -> str | None:
    """Return the rendered text of a `<span id="<field_id>_DISPLAY">`, or None if empty."""
    el = soup.find(id=f"{field_id}_DISPLAY")
    if el is None:
        return None
    text = el.get_text(" ", strip=True)
    return text if text else None


def all_p_field_ids(soup: BeautifulSoup, prefix: str) -> list[str]:
    """Find every APEX field id like `<prefix>_XXXX` that has a _DISPLAY span."""
    ids: list[str] = []
    for el in soup.find_all(id=re.compile(rf"^{re.escape(prefix)}_[A-Z0-9_]+_DISPLAY$")):
        field_id = el["id"][: -len("_DISPLAY")]
        ids.append(field_id)
    return ids


def coerce(key: str, value: str | None) -> object:
    if value is None or value == "":
        return None
    if key in NUMERIC_KEYS:
        # Pure integer
        m = re.match(r"^-?\d+$", value)
        if m:
            return int(value)
        # German decimal ("0,15", ",15") — APEX serves a few of these for SWS.
        # SQL columns are INTEGER NOT NULL, so we round-down to int.
        m = re.match(r"^-?\d*,\d+$", value)
        if m:
            return int(float(value.replace(",", ".")))
        # Strip leading non-digit junk and try again ("> 15" -> 15)
        m = re.search(r"-?\d+", value)
        return int(m.group(0)) if m else 0
    if key in LIST_KEYS:
        return [v.strip() for v in value.split(",") if v.strip()]
    return value


def parse_koordinator(value: str | None) -> dict[str, str | None] | None:
    if not value:
        return None
    m = re.match(r"^(?P<name>.+?)\s*\[(?P<login>[^\]]+)\]\s*$", value)
    if m:
        return {"name": m.group("name").strip(), "login": m.group("login").strip()}
    return {"name": value, "login": None}


def parse_grade_composition(soup: BeautifulSoup) -> str | None:
    group = soup.find(id="P70_GRADE_COMPOSITION")
    if group is None:
        return None
    checked = group.find("input", attrs={"type": "checkbox", "checked": True})
    if checked is None:
        return None
    return checked.get("aria-label") or checked.get("data-display")


def parse_lehrveranstaltungen_table(soup: BeautifulSoup) -> list[dict]:
    """Parse the report table at the bottom of page 70."""
    table = soup.find("table", attrs={"aria-label": re.compile(r"Lehrveranstaltungen")})
    if table is None:
        return []
    rows: list[dict] = []
    body = table.find("tbody") or table
    for tr in body.find_all("tr"):
        cells = tr.find_all("td")
        if not cells:
            continue
        link = cells[0].find("a")
        cid = None
        if link and link.get("href"):
            qs = parse_qs(urlparse(link["href"]).query)
            # APEX URL: f?p=136:74:::::P74_CID,P74_MHID:<cid>,<mhid>
            # parse_qs splits on '&' so ?p=... is whole. Recover from raw href.
            m = re.search(r"P74_CID,P74_MHID[:%3A]+(\d+),(\d+)", link["href"])
            if m:
                cid = int(m.group(1))
        name = link.get_text(strip=True) if link else cells[0].get_text(strip=True)
        typ = cells[1].get_text(strip=True) if len(cells) > 1 else None
        ects_text = cells[2].get_text(strip=True) if len(cells) > 2 else None
        ects = int(ects_text) if ects_text and ects_text.isdigit() else ects_text
        rows.append({"cid": cid, "name": name, "typ": typ, "ects": ects})
    return rows


def parse_module(html: str, mhid: int, mid: int) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    out: dict[str, object] = {"mhid": mhid, "mid": mid}
    unmapped: dict[str, str] = {}

    for field_id in all_p_field_ids(soup, "P70"):
        raw = display_value(soup, field_id)
        key = P70_FIELD_MAP.get(field_id)
        if key is None:
            if raw is not None:
                unmapped[field_id] = raw
            continue
        if key == "koordinator":
            out[key] = parse_koordinator(raw)
        else:
            out[key] = coerce(key, raw)

    out["endnote_regel"] = parse_grade_composition(soup)

    # The Modulhandbuch label ("AIN SPO 3.1 (01.03.2020)") is rendered into a card
    # via JS; the data sits in an inline `gCard…data` block as `"<mhid>","<label>"…`.
    label_match = re.search(rf'"{mhid}"\s*,\s*"([^"]+)"', html)
    out["modulhandbuch_label"] = label_match.group(1) if label_match else None

    # Workload / ECTS sanity columns
    kontakt = out.get("kontaktzeit_h")
    selbst = out.get("selbststudium_h")
    if isinstance(kontakt, int) and isinstance(selbst, int):
        out["ects_total_computed"] = round((kontakt + selbst) / 30, 1)
    else:
        out["ects_total_computed"] = None

    out["lehrveranstaltungen"] = parse_lehrveranstaltungen_table(soup)
    out["_unmapped"] = unmapped
    return out


def parse_lehrveranstaltung(html: str) -> dict:
    soup = BeautifulSoup(html, "html.parser")
    out: dict[str, object] = {}
    unmapped: dict[str, str] = {}

    for field_id in all_p_field_ids(soup, "P74"):
        if field_id in P74_IGNORE or field_id.startswith(P74_MODULE_MIRROR_PREFIX):
            continue
        raw = display_value(soup, field_id)
        key = P74_FIELD_MAP.get(field_id)
        if key is None:
            if raw is not None:
                unmapped[field_id] = raw
            continue
        if key == "verantwortlich":
            out[key] = parse_koordinator(raw)
        else:
            out[key] = coerce(key, raw)
    out["_unmapped"] = unmapped
    return out


def save_raw(name: str, html: str) -> Path:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    path = RAW_DIR / name
    path.write_text(html, encoding="utf-8")
    return path


def fetch_one(session: requests.Session, mhid: int, mid: int) -> dict:
    print(f"  fetching module {mid} (MHID {mhid}) …", file=sys.stderr)
    html = fetch(session, 70, {"P70_MID": mid, "P70_MHID": mhid})
    raw_path = save_raw(f"{mhid}_{mid}.html", html)
    mod = parse_module(html, mhid, mid)
    mod["_raw_html_path"] = str(raw_path.relative_to(HERE.parent))

    for lv in mod["lehrveranstaltungen"]:
        cid = lv.get("cid")
        if not cid:
            continue
        time.sleep(0.4)
        print(f"    fetching Lehrveranstaltung {cid} …", file=sys.stderr)
        lv_html = fetch(session, 74, {"P74_CID": cid, "P74_MHID": mhid})
        lv_raw = save_raw(f"{mhid}_lv_{cid}.html", lv_html)
        lv.update(parse_lehrveranstaltung(lv_html))
        lv["_raw_html_path"] = str(lv_raw.relative_to(HERE.parent))
    return mod


def print_summary(modules: list[dict]) -> None:
    print()
    print(f"{'Kürzel':<14}{'Name':<44}{'Typ':<5}{'ECTS':<6}{'Prüfung':<18}{'Sem':<5}{'Sprache':<10}{'Handbuch'}")
    print("-" * 130)
    for m in modules:
        kuerzel = m.get("kuerzel") or "?"
        name = (m.get("name") or "?")[:42]
        typ = m.get("modultyp") or "?"
        ects = m.get("ects_total_computed")
        ects_s = f"{ects}" if ects is not None else "?"
        pruefung = (m.get("pruefung_benotet") or m.get("pruefung_unbenotet") or "—")[:16]
        sem = m.get("startsemester")
        sem_s = str(sem) if sem is not None else "?"
        sprache = (m.get("sprache") or "?")[:8]
        handbuch = m.get("modulhandbuch_label") or f"MHID {m['mhid']}"
        print(f"{kuerzel:<14}{name:<44}{typ:<5}{ects_s:<6}{pruefung:<18}{sem_s:<5}{sprache:<10}{handbuch}")


def main() -> int:
    session = requests.Session()
    session.headers["User-Agent"] = "campus-app-research/0.1 (nohl.julian@gmail.com)"
    modules: list[dict] = []
    for mhid, mid in SAMPLE:
        modules.append(fetch_one(session, mhid, mid))
        time.sleep(0.4)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(modules, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT_PATH.relative_to(HERE.parent)}", file=sys.stderr)
    print_summary(modules)

    # Surface schema surprises so they're hard to miss in review
    surprises = [(m["kuerzel"], m["_unmapped"]) for m in modules if m["_unmapped"]]
    if surprises:
        print("\nUnmapped P70 fields encountered:")
        for k, fields in surprises:
            print(f"  {k}: {sorted(fields.keys())}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

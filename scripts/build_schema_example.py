"""Reshape `ain_sample.json` into the proposed Supabase row shape.

Input:  scripts/data/ain_sample.json     (raw German labels, faithful to APEX)
Output: scripts/data/proposed_schema_example.json
        scripts/data/proposed_schema_example_courses.json

Each module in the output is one candidate row for the `modules` table; each
course is one candidate row for `courses`. The mapping documents every
non-trivial decision (date parsing, range splitting, exam-code decomposition,
…) — keep this in sync with SCHEMA_PROPOSAL.md.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
DEFAULT_IN = HERE / "data" / "ain_sample.json"
DEFAULT_OUT_MODULES = HERE / "data" / "proposed_schema_example.json"
DEFAULT_OUT_COURSES = HERE / "data" / "proposed_schema_example_courses.json"

# CHECK-constraint candidates — known values observed in the sample. Mark these
# in the migration so a new value (if it appears) errors loudly instead of
# silently corrupting the data.
KNOWN_MODULE_TYPE = {"PM", "WPM"}
# `language` resists strict enumeration — the 1468-module crawl surfaced
# "Deutsch, ggf. Englisch", "Englisch, ggf. Deutsch", "Deutsch/Englisch",
# "Englisch/Deutsch" alongside the plain values. We keep the raw string and
# *additionally* track a parsed primary/secondary pair (see parse_language).
KNOWN_LANGUAGE_PRIMARY = {"Deutsch", "Englisch"}
KNOWN_START_PHASE = {"Sommersemester", "Wintersemester"}
# Each is one item in the `learning_formats` array (which is comma-split from
# the APEX display string). Extended after each crawl as needed.
KNOWN_LEARNING_FORMAT = {
    "Vorlesung", "Übung", "Praktikum", "Seminar", "Selbststudium",
    "Labor", "Workshop/Seminar", "Projekt", "Hausarbeit",
    "E-Learning", "Exkursion", "Intensivsprachkurs",
}
# `course_type` in APEX is a single display string but commonly contains
# multiple types separated by commas (e.g. "V, Ü", "V, Ü, LÜ, W"). The
# transformer always emits a list; CHECK each element of the list against
# this set.
KNOWN_COURSE_TYPE = {"V", "Ü", "P", "S", "LÜ", "PSS", "W", "PJ", "X"}


def parse_date_de(s: str | None) -> str | None:
    """'30.10.2018' -> '2018-10-30'. Returns None on miss."""
    if not s:
        return None
    try:
        return datetime.strptime(s.strip(), "%d.%m.%Y").date().isoformat()
    except ValueError:
        return None


def parse_semester(raw: str | int | None) -> tuple[str | None, int | None, int | None]:
    """Return (raw_text, min_int, max_int).
    Handles '1', '4', '5-7' (range), '1/2' (alternate). Keeps the raw form so
    information isn't lost; min/max are derived for sortable queries.
    """
    if raw is None:
        return None, None, None
    s = str(raw).strip()
    nums = [int(x) for x in re.findall(r"\d+", s)]
    if not nums:
        return s, None, None
    return s, min(nums), max(nums)


def parse_exam(code: str | None) -> dict | None:
    """Decompose codes like 'K90', 'M', 'SP', 'SP (LP, PR, AB)', 'SP (TE)'.

    Returns {form, duration_min, components, raw}. `form` is the leading
    letters (K/M/SP/H/R/...); `duration_min` follows immediately if numeric;
    `components` is the optional comma-separated list in parentheses.
    Always preserves the raw string so unanticipated formats round-trip.
    """
    if not code:
        return None
    code = code.strip()
    m = re.match(r"^(?P<form>[A-Za-zÄÖÜäöü]+)(?P<duration>\d+)?\s*(?:\((?P<components>[^)]*)\))?\s*$", code)
    if not m:
        return {"form": None, "duration_min": None, "components": None, "raw": code}
    duration = m.group("duration")
    components = m.group("components")
    return {
        "form": m.group("form"),
        "duration_min": int(duration) if duration else None,
        "components": [c.strip() for c in components.split(",")] if components else None,
        "raw": code,
    }


def parse_language(raw: str | None) -> dict:
    """Decompose a Sprache string into structured fields.

    Examples:
      'Deutsch'                       -> primary='Deutsch', secondary=None,    optional=False
      'Englisch'                      -> primary='Englisch'
      'Deutsch/Englisch'              -> primary='Deutsch', secondary='Englisch', optional=False  (both equal)
      'Deutsch, ggf. Englisch'        -> primary='Deutsch', secondary='Englisch', optional=True   (secondary on demand)
      'Englisch, ggf. Deutsch'        -> primary='Englisch', secondary='Deutsch', optional=True

    Always preserves the raw string. `primary` is None if we can't recognise the form.
    """
    if not raw:
        return {"raw": None, "primary": None, "secondary": None, "secondary_optional": False}
    s = raw.strip()
    # "X, ggf. Y" — secondary is on-demand
    m = re.match(r"^(Deutsch|Englisch)\s*,\s*ggf\.\s*(Deutsch|Englisch)$", s)
    if m:
        return {"raw": s, "primary": m.group(1), "secondary": m.group(2), "secondary_optional": True}
    # "X/Y" — both equally valid
    m = re.match(r"^(Deutsch|Englisch)\s*/\s*(Deutsch|Englisch)$", s)
    if m:
        return {"raw": s, "primary": m.group(1), "secondary": m.group(2), "secondary_optional": False}
    # plain "X"
    if s in ("Deutsch", "Englisch"):
        return {"raw": s, "primary": s, "secondary": None, "secondary_optional": False}
    return {"raw": s, "primary": None, "secondary": None, "secondary_optional": False}


def split_course_types(raw: str | None) -> list[str]:
    """APEX displays multiple course types comma-joined ("V, Ü"). Split, trim, dedupe."""
    if not raw:
        return []
    return list(dict.fromkeys(t.strip() for t in raw.split(",") if t.strip()))


def normalize_codes(text: str | None) -> list[str]:
    """Pull module-code-like tokens out of free text, e.g. for needed_for."""
    if not text:
        return []
    # Codes look like LETTERS[+digits]/[LETTERS+digits], e.g. STO/06, COGR/AI3, 3DCV/AI5
    return list(dict.fromkeys(re.findall(r"\b[0-9A-Za-zÄÖÜäöü]+/[0-9A-Za-zÄÖÜäöü]+\b", text)))


def specialization_track_from_code(code: str | None) -> str | None:
    """'ARIN/AI1' -> 'AI'; 'WAPP/SE1' -> 'SE'; 'TGKI/WB1-1' -> 'WB1'; 'MAT1/01' -> None."""
    if not code or "/" not in code:
        return None
    suffix = code.split("/", 1)[1]
    # SPO 4 form: track has digits, position separated by dash, e.g. 'WB1-1'
    m = re.match(r"^([A-Za-z]+\d+)-\d+$", suffix)
    if m:
        return m.group(1)
    # SPO 3.1 form: track is letters only, position is trailing digits, e.g. 'AI1'
    m = re.match(r"^([A-Za-z]+)\d+$", suffix)
    if m:
        return m.group(1)
    return None


def _coord_raw(name: str | None, login: str | None) -> str | None:
    """Reassemble the APEX coordinator display string from parsed parts."""
    if not name:
        return None
    return f"{name} [{login}]" if login else name


def transform_module(m: dict) -> dict:
    """Emit a row shaped like the existing `modules` table: top-level columns
    that match SQL one-to-one, plus a typed `details` JSONB.

    Keep this function in lock-step with `Module` / `ModuleDetails` in
    `src/features/study_programs/types/module.types.ts`.
    """
    sem_raw, sem_min, sem_max = parse_semester(m.get("startsemester"))
    track = specialization_track_from_code(m.get("kuerzel"))
    coord = m.get("koordinator") or {}
    coord_name = coord.get("name") or ""
    coord_login = coord.get("login")
    lang = parse_language(m.get("sprache"))
    module_type = m.get("modultyp")

    return {
        # ── top-level columns (mirror SQL) ───────────────────────────────
        "code": m["kuerzel"],
        "name": m["name"],
        "start_semester": sem_raw or "",
        "coordinator": _coord_raw(coord_name, coord_login) or "",
        "version": 1,                                 # SPO/handbook is the version axis (module_handbook_entries → spos)
        # `is_mandatory` is BOOL NOT NULL DEFAULT true in SQL, so we collapse
        # the rare null module_type to true and let details.module_type carry
        # the truth.
        "is_mandatory": True if module_type is None else module_type == "PM",
        "is_specialization": track is not None,
        "specialization_name": None,                  # APEX gives us the track id, not the human-readable name
        "language": lang["raw"] or "",

        # ── details JSONB ────────────────────────────────────────────────
        "details": {
            # parsed views of top-level raw columns
            "coordinator_name": coord_name,
            "coordinator_login": coord_login,
            "specialization_track": track,
            "module_type": module_type,
            "language_primary": lang["primary"],
            "language_secondary": lang["secondary"],
            "language_secondary_optional": lang["secondary_optional"],
            "start_semester_min": sem_min,
            "start_semester_max": sem_max,

            # workload / scheduling
            "contact_hours": m.get("kontaktzeit_h"),
            "self_study_hours": m.get("selbststudium_h"),
            "ects_total_computed": m.get("ects_total_computed"),
            "semester_count": m.get("semesteranzahl"),
            "start_phases": m.get("startphase") or [],

            # pedagogy
            "learning_formats": m.get("lehr_lernformen") or [],
            "learning_formats_misc": m.get("lehr_lernformen_sonstiges"),

            # examination
            "exam_graded": parse_exam(m.get("pruefung_benotet")),
            "exam_ungraded": parse_exam(m.get("pruefung_unbenotet")),
            "performance_record": parse_exam(m.get("leistungsnachweis_unbenotet")),
            "grade_composition_rule": m.get("endnote_regel"),
            "grade_composition_misc": m.get("endnote_regel_sonstiges"),

            # relations
            "prerequisites_text": m.get("voraussetzungen_inhaltlich"),
            "prerequisites_codes": normalize_codes(m.get("voraussetzungen_inhaltlich")),
            "needed_for_text": m.get("vorkenntnis_erforderlich_fuer"),
            "needed_for_codes": normalize_codes(m.get("vorkenntnis_erforderlich_fuer")),
            "combine_with_text": m.get("sinnvoll_zu_kombinieren_mit"),
            "combine_with_codes": normalize_codes(m.get("sinnvoll_zu_kombinieren_mit")),

            # free text
            "learning_objectives": m.get("lernziele"),
            "personal_competencies": m.get("personale_kompetenzen"),
            "literature": m.get("literatur"),

            # provenance
            "source_apex_mhid": m["mhid"],
            "source_apex_mid": m["mid"],
            "source_handbook_label": m.get("modulhandbuch_label"),
            "last_updated": parse_date_de(m.get("letzte_aenderung")),
        },
    }


def transform_course(module_code: str, parent_mhid: int, parent_mid: int, c: dict) -> dict:
    """Emit a row shaped like the existing `courses` table.

    Keep in lock-step with `Course` / `CourseDetails` in `course.types.ts`.
    `module_code` is the parent's code, used as an FK proxy until the
    fixture rows actually live in Postgres with UUIDs.
    `parent_mhid` / `parent_mid` link this course to a *specific* module
    instance — the same module code can appear in multiple handbooks, so
    grouping courses by `module_code` alone over-counts.
    """
    resp = c.get("verantwortlich") or {}
    resp_name = resp.get("name")
    resp_login = resp.get("login")
    return {
        "module_code": module_code,
        "parent_mhid": parent_mhid,
        "parent_mid": parent_mid,
        # top-level
        "code": c.get("kuerzel") or "",
        "name": c.get("name") or "",
        "course_type": c.get("typ") or "",
        "coordinator": _coord_raw(resp_name, resp_login),
        "ects": c.get("ects") or 0,
        "sws": c.get("sws") or 0,
        # details
        "details": {
            "course_types": split_course_types(c.get("typ")),
            "responsible_name": resp_name,
            "responsible_login": resp_login,
            "additional_teachers": c.get("weitere_dozierende"),
            "exam_graded": parse_exam(c.get("mtp_benotet")),
            "exam_ungraded": parse_exam(c.get("mtp_unbenotet")),
            "performance_record": parse_exam(c.get("leistungsnachweis_unbenotet")),
            "syllabus": c.get("lehrinhalt"),
            "source_apex_cid": c.get("cid"),
        },
    }


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", type=Path, default=DEFAULT_IN)
    ap.add_argument("--out-modules", type=Path, default=DEFAULT_OUT_MODULES)
    ap.add_argument("--out-courses", type=Path, default=DEFAULT_OUT_COURSES)
    args = ap.parse_args()

    raw = json.loads(args.input.read_text(encoding="utf-8"))
    # Skip unpublished modules ("Modul noch nicht veröffentlicht") — APEX
    # returns a near-empty page 70 for these; we recognise them by the
    # absence of a Modul-Kürzel.
    published = [m for m in raw if m.get("kuerzel")]
    skipped = len(raw) - len(published)
    if skipped:
        print(f"skipped {skipped}/{len(raw)} unpublished modules", file=sys.stderr)
    modules = [transform_module(m) for m in published]
    courses: list[dict] = []
    for m in published:
        for lv in m.get("lehrveranstaltungen") or []:
            courses.append(transform_course(m["kuerzel"], m["mhid"], m["mid"], lv))

    args.out_modules.write_text(json.dumps(modules, ensure_ascii=False, indent=2), encoding="utf-8")
    args.out_courses.write_text(json.dumps(courses, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {args.out_modules.resolve().relative_to(HERE.parent)}  ({len(modules)} modules)")
    print(f"wrote {args.out_courses.resolve().relative_to(HERE.parent)}  ({len(courses)} courses)")
    # Surface any enum values that fell outside the known sets. Dedupe by
    # (kind, value) so a frequent surprise doesn't drown the output.
    surprises: dict[tuple[str, str], list[str]] = {}
    def note(kind: str, value: str | None, where: str) -> None:
        if value is None:
            return
        surprises.setdefault((kind, str(value)), []).append(where)

    for m in modules:
        d = m["details"]
        if d["module_type"] is not None and d["module_type"] not in KNOWN_MODULE_TYPE:
            note("module_type", d["module_type"], m["code"])
        if d["language_primary"] is not None and d["language_primary"] not in KNOWN_LANGUAGE_PRIMARY:
            note("language_primary", d["language_primary"], m["code"])
        if d["language_primary"] is None and m["language"]:
            note("language.unparsed", m["language"], m["code"])
        for p in d["start_phases"]:
            if p not in KNOWN_START_PHASE:
                note("start_phase", p, m["code"])
        for f in d["learning_formats"]:
            if f not in KNOWN_LEARNING_FORMAT:
                note("learning_format", f, m["code"])
    for c in courses:
        for t in c["details"]["course_types"]:
            if t not in KNOWN_COURSE_TYPE:
                note("course_type", t, f"{c['module_code']}>{c['code']}")
    if surprises:
        print(f"\n{len(surprises)} unique enum-candidate values outside the proposed CHECK sets:")
        for (kind, value), where in sorted(surprises.items()):
            sample = ", ".join(where[:3]) + ("…" if len(where) > 3 else "")
            print(f"  {kind:<20} = {value!r:<35} ({len(where)}x, e.g. {sample})")
    else:
        print("All enum-candidate values fit the proposed CHECK sets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

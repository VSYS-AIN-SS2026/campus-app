"""Pick a small, representative sample of modules from the full crawl
and emit a frontend-importable JSON fixture.

The fixture is intentionally varied — it covers the schema-level edge cases
that came up during validation so a frontend dev can trust that handling
fixture data exercises every code path the real data will hit.
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
SCHEMA_MODULES = HERE / "data" / "all_modules_schema.json"
SCHEMA_COURSES = HERE / "data" / "all_modules_schema_courses.json"
OUT_MODULES = HERE / "data" / "fixture_sample_modules.json"
OUT_COURSES = HERE / "data" / "fixture_sample_courses.json"

# Hand-picked codes — each row chosen because it exercises a different schema
# corner. If we ever add a new edge case (e.g. start_semester='C'), add a
# representative module here too.
PICKS = [
    ("MAT1/01", "AIN SPO 3.1: typical 1st-sem PM, German, K90 exam, downstream-prerequisite to many"),
    ("ARIN/AI1", "AIN SPO 3.1: WPM in AI specialization, range start_semester '5-7', combine_with codes"),
    ("BARB/21", "AIN SPO 3.1: thesis module — uses grade_composition_misc, no formal exam"),
    ("IPSS/15", "AIN SPO 3.1: practical semester — uses learning_formats_misc, course_type='PSS'"),
    ("ALG/01", "AIN SPO 4: foundation in newer SPO, alternate start '1/2'"),
    ("TGKI/WB1-1", "AIN SPO 4: WB1-X code scheme, specialization_track='WB1'"),
    ("MATH/A2", "MSI master: cohort start_semester='A', mixed-language 'Deutsch/Englisch'"),
    ("SECOS/B5-8", "MSI master: 'Englisch, ggf. Deutsch' (secondary_optional=true), Projekt format"),
    ("DBSYS1/14", "AIN SPO 3.1: typical mid-program PM with V+Ü structure"),
]


def load_index(path: Path, key: str) -> dict[str, dict]:
    rows = json.loads(path.read_text(encoding="utf-8"))
    out: dict[str, dict] = {}
    for r in rows:
        if r.get(key) and r[key] not in out:
            out[r[key]] = r
    return out


def main() -> int:
    modules_by_code = load_index(SCHEMA_MODULES, "code")
    # Index courses by (parent_mhid, parent_mid) so we only grab the courses
    # belonging to the *specific* module instance the picker chose. Indexing
    # by `module_code` alone would pull in duplicates from every handbook
    # that contains the same module.
    courses_by_parent: dict[tuple[int, int], list[dict]] = {}
    for c in json.loads(SCHEMA_COURSES.read_text(encoding="utf-8")):
        key = (c.get("parent_mhid"), c.get("parent_mid"))
        courses_by_parent.setdefault(key, []).append(c)

    picked_modules: list[dict] = []
    picked_courses: list[dict] = []
    missing: list[str] = []
    for code, why in PICKS:
        m = modules_by_code.get(code)
        if not m:
            missing.append(code)
            continue
        m = {**m, "_pick_reason": why}
        picked_modules.append(m)
        parent_key = (m["details"]["source_apex_mhid"], m["details"]["source_apex_mid"])
        picked_courses.extend(courses_by_parent.get(parent_key, []))

    if missing:
        print(f"missing from schema dump: {missing}")
    OUT_MODULES.write_text(json.dumps(picked_modules, ensure_ascii=False, indent=2), encoding="utf-8")
    OUT_COURSES.write_text(json.dumps(picked_courses, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrote {OUT_MODULES.relative_to(HERE.parent)}  ({len(picked_modules)} modules)")
    print(f"wrote {OUT_COURSES.relative_to(HERE.parent)}  ({len(picked_courses)} courses)")
    return 0 if not missing else 1


if __name__ == "__main__":
    raise SystemExit(main())

#!/usr/bin/env node
/**
 * SG Import — scrape Studium Generale modules from HTWG LSF into Supabase.
 *
 * Studium Generale is published as its own study program in LSF
 * (ABSTGVNR 4532). This script reuses the LSF mechanics in
 * scripts/lib/lsf-core.js to discover the SG module pages, scrape each one,
 * and store them as first-class `modules` rows tagged with the existing
 * "Studium Generale" category, with their Termine in `lsf_events`. That way the
 * rest of the app (weekly schedule, conflict detection) works on SG modules
 * unchanged, and the planner's "matching SG modules" tool can simply query
 * modules in the SG category plus their events.
 *
 * Unlike lsf-import.js, this creates PROPER module rows (not stubs): SG modules
 * are not part of any imported Modulhandbuch, so this scraper is their source.
 * SG Lehrveranstaltungen carry no V/Ü/L/S type, so each module gets a single
 * generic course (course_type 'LV', not flagged faulty).
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (or SUPABASE_ANON_KEY)
 *
 * Optional env:
 *   SG_ABSTGVNR=4532           SG study-program id in LSF (default 4532). Kept
 *                              separate from the shared LSF_ABSTGVNR so the same
 *                              .env can drive both lsf:import (AIN) and sg:import.
 *   LSF_SEMESTER=SS2026        Override semester (auto-derived if absent)
 *   LSF_FORCE=true             Skip the already-scraped-this-semester check
 *   LSF_THROTTLE_MS=500        Delay between module page requests (default 500ms)
 *   LSF_LIMIT=N                Cap modules (for testing)
 *   LSF_DEBUG=true             Verbose logging
 *   Auth (optional — the SG catalog is public): LSF_SESSION_COOKIE, or
 *     LSF_USERNAME + LSF_PASSWORD + LSF_TOTP_SECRET
 *
 * CLI flags:
 *   --dry-run                  Scrape + parse only; print a summary, write nothing
 *                              (no Supabase creds needed)
 *   --fresh                    Delete this semester's SG events before importing
 */
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import * as lsf from './lib/lsf-core.js';

const SG_CATEGORY_NAME = 'Studium Generale';

// --- ENV / flags ---
const ABSTGVNR     = process.env.SG_ABSTGVNR || '4532';
const PROGRAM_CODE = 'SG'; // SG-specific importer — deliberately NOT driven by the
                           // shared LSF_STUDY_PROGRAM/LSF_ABSTGVNR (those select AIN etc.)
const SEMESTER     = process.env.LSF_SEMESTER      || lsf.deriveCurrentSemester();
const FORCE        = process.env.LSF_FORCE === 'true';
const THROTTLE_MS  = parseInt(process.env.LSF_THROTTLE_MS || '500', 10);
const LIMIT        = process.env.LSF_LIMIT ? parseInt(process.env.LSF_LIMIT, 10) : null;
const DEBUG        = process.env.LSF_DEBUG === 'true';
const DRY          = process.argv.includes('--dry-run');
const FRESH        = process.argv.includes('--fresh');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!DRY) {
  for (const [name, val] of [['SUPABASE_URL', SUPABASE_URL], ['SUPABASE_KEY', SUPABASE_KEY]]) {
    if (!val) { console.error(`Missing ${name}`); process.exit(1); }
  }
}
console.log(`SG import — semester ${SEMESTER}, ABSTGVNR ${ABSTGVNR}${DRY ? '  [DRY RUN — no writes]' : ''}`);

const supabase = DRY ? null : createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// ─────────────────────────────────────────────
// Discovery
// ─────────────────────────────────────────────
async function discoverModules(headers) {
  const listUrl = lsf.buildListUrl(ABSTGVNR);
  if (DEBUG) console.log(`Fetching study-plan list (ABSTGVNR=${ABSTGVNR})...`);
  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) throw new Error(`stgPlanList HTTP ${listRes.status}: ${listRes.statusText}`);
  const listHtml = await listRes.text();

  // Some LSF configs link webInfo straight from the list page.
  let mods = lsf.extractWebInfoModules(listHtml);
  if (!mods.length) {
    const planLinks = lsf.extractPlanLinks(listHtml, ABSTGVNR);
    if (!planLinks.length) throw new Error(`No study-plan links for ABSTGVNR=${ABSTGVNR} (check the value).`);
    const seen = new Set();
    mods = [];
    for (const planUrl of planLinks) {
      if (DEBUG) console.log(`  plan page: ${planUrl}`);
      const r = await fetch(planUrl, { headers });
      if (!r.ok) { console.warn(`  plan fetch failed (${r.status})`); continue; }
      for (const m of lsf.extractWebInfoModules(await r.text())) {
        if (seen.has(m.publishid)) continue;
        seen.add(m.publishid);
        mods.push(m);
      }
      await lsf.sleep(THROTTLE_MS);
    }
  }
  if (LIMIT && mods.length > LIMIT) {
    console.log(`LSF_LIMIT=${LIMIT}: using first ${LIMIT} of ${mods.length} modules.`);
    mods = mods.slice(0, LIMIT);
  }
  return mods;
}

// ─────────────────────────────────────────────
// Database helpers
// ─────────────────────────────────────────────
async function getSgCategoryId() {
  const { data, error } = await supabase.from('categories').select('id').eq('name', SG_CATEGORY_NAME).limit(1);
  if (error) throw new Error(`categories lookup failed: ${error.message}`);
  if (data?.length) return data[0].id;
  const { data: ins, error: insErr } = await supabase.from('categories')
    .insert({ name: SG_CATEGORY_NAME, type: 'kontext', color: 'teal' }).select('id').single();
  if (insErr) throw new Error(`categories insert failed: ${insErr.message}`);
  console.log(`Created '${SG_CATEGORY_NAME}' category ${ins.id}.`);
  return ins.id;
}

async function getStudyProgramId(code) {
  const { data } = await supabase.from('study_programs').select('id').eq('code', code).limit(1);
  return data?.[0]?.id ?? null;
}

async function resolveOrCreateModule(publishid, title, coordinator, studyProgramId) {
  const name = lsf.stripLsfTitlePrefix(title) || title;
  if (DRY) return { id: `dry-${publishid}`, code: `SG-${publishid}`, name };

  const { data } = await supabase.from('modules')
    .select('id, code, name').eq('lsf_veranstid', publishid).limit(1);
  if (data?.length) return data[0];

  const { data: ins, error } = await supabase.from('modules').insert({
    name,
    code: `SG-${publishid}`,
    lsf_veranstid: publishid,
    study_program_id: studyProgramId,
    start_semester: '',
    coordinator: coordinator ?? '',
    version: 1,
    is_mandatory: false,
    is_specialization: false,
    details: {},
  }).select('id, code, name').single();
  if (error) { console.error(`  module insert failed: ${error.message}`); return null; }
  console.log(`  + new module ${ins.code} "${ins.name}"`);
  return ins;
}

async function tagSg(moduleId, categoryId) {
  if (DRY) return;
  const { error } = await supabase.from('module_category_entries')
    .upsert({ module_id: moduleId, category_id: categoryId }, { onConflict: 'module_id,category_id', ignoreDuplicates: true });
  if (error) console.error(`  category tag failed: ${error.message}`);
}

const courseCache = new Map();
async function resolveOrCreateCourse(module, courseType, coordinator) {
  const type = courseType || 'LV';
  const key = `${module.id}::${type}`;
  if (courseCache.has(key)) return courseCache.get(key);
  if (DRY) { courseCache.set(key, `dry-${key}`); return courseCache.get(key); }

  const { data } = await supabase.from('courses').select('id')
    .eq('module_id', module.id).eq('course_type', type).limit(1);
  if (data?.length) { courseCache.set(key, data[0].id); return data[0].id; }

  const { data: ins, error } = await supabase.from('courses').insert({
    module_id: module.id,
    code: module.code + (lsf.COURSE_TYPE_CODE_SUFFIX[type] || ''),
    name: module.name + (lsf.COURSE_TYPE_NAME_SUFFIX[type] || ''),
    course_type: type,
    coordinator: coordinator ?? null,
    ects: 0,
    sws: 0,
    details: {},
    faulty: false, // SG LVs legitimately carry no V/Ü/L/S type — not an error
  }).select('id').single();
  if (error) { console.error(`  course insert failed: ${error.message}`); return null; }
  courseCache.set(key, ins.id);
  return ins.id;
}

async function upsertRoomsAndEvents(events) {
  // Rooms first (FK on lsf_events)
  const seenRooms = new Set();
  for (const ev of events) {
    if (!ev.room_building || !ev.room_number) continue;
    const k = `${ev.room_building}::${ev.room_number}`;
    if (seenRooms.has(k)) continue;
    seenRooms.add(k);
    const row = { building: ev.room_building, room_number: ev.room_number };
    if (ev.room_type) row.room_type = ev.room_type;
    const { error } = await supabase.from('rooms')
      .upsert(row, { onConflict: 'building,room_number', ignoreDuplicates: true });
    if (error) console.error('  room upsert failed:', error.message);
  }

  // Events: insert new (series_id, start_date) pairs; leave existing rows
  // untouched so any user_events FKs stay valid.
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < events.length; i += BATCH) {
    const batch = events.slice(i, i + BATCH).map(({ room_type, ...rest }) => rest);
    const { data, error } = await supabase.from('lsf_events')
      .upsert(batch, { onConflict: 'series_id,start_date', ignoreDuplicates: true })
      .select('series_id');
    if (error) throw new Error(`event upsert failed: ${error.message}`);
    inserted += data?.length ?? 0;
  }
  return { inserted, skipped: events.length - inserted };
}

async function checkRecentRun() {
  const { data, error } = await supabase.from('lsf_import_runs')
    .select('id, started_at').eq('study_program_code', PROGRAM_CODE)
    .eq('term', SEMESTER).eq('status', 'success').limit(1);
  if (error) { console.error('skip-check failed:', error.message); return false; }
  if (data?.length) {
    console.log(`Already scraped ${PROGRAM_CODE}/${SEMESTER} (run ${data[0].id} at ${data[0].started_at}). Use LSF_FORCE=true to override.`);
    return true;
  }
  return false;
}

async function createRun() {
  const { data, error } = await supabase.from('lsf_import_runs')
    .insert({ study_program_code: PROGRAM_CODE, lsf_abstgvnr: ABSTGVNR, term: SEMESTER, status: 'running' })
    .select('id').single();
  if (error) { console.error('create run failed:', error.message); process.exit(1); }
  console.log(`Import run ${data.id} started (${PROGRAM_CODE} / ${SEMESTER}).`);
  return data.id;
}

async function finishRun(runId, success, stats, errorMsg) {
  if (!runId) return;
  const upd = { finished_at: new Date().toISOString(), status: success ? 'success' : 'error' };
  if (success) {
    upd.events_found = stats.found;
    upd.events_inserted = stats.inserted;
    upd.events_updated = 0;
    upd.events_deactivated = 0;
  } else {
    upd.error_msg = errorMsg;
  }
  const { error } = await supabase.from('lsf_import_runs').update(upd).eq('id', runId);
  if (error) console.error('update run failed:', error.message);
}

async function dropSgEvents() {
  const { data: mods } = await supabase.from('modules').select('id').like('code', 'SG-%');
  const moduleIds = (mods ?? []).map((m) => m.id);
  if (!moduleIds.length) { console.log('--fresh: no SG modules yet, nothing to delete.'); return; }
  const { data: courses } = await supabase.from('courses').select('id').in('module_id', moduleIds);
  const courseIds = (courses ?? []).map((c) => c.id);
  if (!courseIds.length) { console.log('--fresh: no SG courses yet, nothing to delete.'); return; }
  const { error, count } = await supabase.from('lsf_events')
    .delete({ count: 'exact' }).eq('term', SEMESTER).in('course_id', courseIds);
  if (error) throw new Error(`--fresh delete failed: ${error.message}`);
  console.log(`--fresh: deleted ${count ?? '?'} SG events for ${SEMESTER}.`);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  const session = lsf.createLsfSession({
    sessionCookie: process.env.LSF_SESSION_COOKIE || null,
    username: process.env.LSF_USERNAME || null,
    password: process.env.LSF_PASSWORD || null,
    totpSecret: process.env.LSF_TOTP_SECRET || null,
  });
  let headers;
  try { headers = await session.getHeaders(); }
  catch (err) { console.error(`Auth failed: ${err.message}`); process.exit(1); }

  if (!DRY && FRESH) await dropSgEvents();
  if (!DRY && !FORCE && await checkRecentRun()) return;

  const runId = DRY ? null : await createRun();

  let moduleUrls;
  try {
    moduleUrls = await discoverModules(headers);
  } catch (err) {
    await finishRun(runId, false, null, `discovery failed: ${err.message}`);
    console.error(err.message);
    return;
  }
  if (!moduleUrls.length) {
    const msg = `No SG module URLs discovered for ABSTGVNR=${ABSTGVNR}.`;
    console.error(msg);
    await finishRun(runId, false, null, msg);
    return;
  }
  console.log(`Discovered ${moduleUrls.length} SG modules.`);

  const sgCategoryId = DRY ? null : await getSgCategoryId();
  const studyProgramId = DRY ? null : await getStudyProgramId(PROGRAM_CODE);
  const semesterDates = lsf.deriveSemesterDates(SEMESTER);
  if (!semesterDates) console.warn(`Could not derive semester dates from '${SEMESTER}' — events without a Dauer date are skipped.`);
  courseCache.clear();

  const allEvents = [];
  const summary = [];
  let fail = 0;

  for (let i = 0; i < moduleUrls.length; i++) {
    const { publishid, url } = moduleUrls[i];
    if (i > 0) await lsf.sleep(THROTTLE_MS);

    let $;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      $ = cheerio.load(await res.text());
    } catch (err) {
      console.error(`[${i + 1}/${moduleUrls.length}] publishid=${publishid} fetch failed: ${err.message}`);
      fail++;
      continue;
    }

    const title = lsf.parseModuleTitle($);
    const coordinator = lsf.scrapeCoordinator($);
    const mod = await resolveOrCreateModule(publishid, title, coordinator, studyProgramId);
    if (!mod) { fail++; continue; }
    await tagSg(mod.id, sgCategoryId);

    const rawEvents = lsf.extractTermine($, { semesterDates });
    for (const ev of rawEvents) {
      const courseId = await resolveOrCreateCourse(mod, ev.courseType, coordinator);
      allEvents.push({
        term: SEMESTER,
        course_id: courseId,
        rhythm: ev.rhythm,
        event_type: ev.eventType,
        weekday: ev.weekday,
        start_date: ev.startDate,
        end_date: ev.endDate,
        start_time: ev.startTime,
        end_time: ev.endTime,
        room_building: ev.room?.building ?? null,
        room_number: ev.room?.roomNumber ?? null,
        room_type: ev.room?.roomType ?? null,
        lecturer: ev.lecturer,
        series_id: lsf.buildSeriesId(courseId, ev.weekday, ev.startTime),
        status: ev.status,
        cancelled: ev.cancelled,
        source_url: url,
        raw_payload: ev.raw,
        updated_at: new Date().toISOString(),
      });
    }
    summary.push({ code: mod.code, name: mod.name, events: rawEvents.length });
    console.log(`[${i + 1}/${moduleUrls.length}] ${mod.code} "${mod.name}" — ${rawEvents.length} Termine`);
  }

  const stats = { found: allEvents.length, inserted: 0 };
  console.log(`\n${moduleUrls.length - fail}/${moduleUrls.length} modules scraped, ${allEvents.length} events total (${fail} failed).`);

  if (DRY) {
    const withTimes = summary.filter((s) => s.events > 0).length;
    console.log(`\nDRY RUN summary: ${summary.length} SG modules (${withTimes} with weekly Termine, ${summary.length - withTimes} block/timeless):`);
    for (const s of summary) console.log(`  ${String(s.events).padStart(2)}×  ${s.code}  ${s.name}`);
    console.log('\nNothing was written. Re-run without --dry-run (and with Supabase creds) to import.');
    return;
  }

  if (allEvents.length > 0) {
    try {
      const { inserted, skipped } = await upsertRoomsAndEvents(allEvents);
      stats.inserted = inserted;
      console.log(`Inserted ${inserted} new events (${skipped} already existed, preserved).`);
    } catch (err) {
      await finishRun(runId, false, null, err.message);
      console.error('Import failed:', err.message);
      return;
    }
  }
  await finishRun(runId, true, stats, null);
  console.log('Done.');
}

main();

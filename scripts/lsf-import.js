#!/usr/bin/env node
/**
 * LSF Import Script
 *
 * Discovers all Lehrveranstaltungen for one or more study programs from the
 * HTWG LSF study plan list, scrapes each module page, and imports events
 * into Supabase.
 *
 * Required env:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY  (or SUPABASE_ANON_KEY)
 *
 * Auth — provide one of:
 *   LSF_SESSION_COOKIE        Pre-authenticated cookie string (simplest for self-hosted runner)
 *   LSF_USERNAME + LSF_PASSWORD + LSF_TOTP_SECRET   Automatic login with TOTP
 *
 * Program selection — pick one:
 *   LSF_STUDY_PROGRAM + LSF_ABSTGVNR   Single program via env vars
 *   (neither set)                       Auto-discover all programs from
 *                                       study_programs.lsf_abstgvnr in DB
 *
 * Optional:
 *   LSF_SEMESTER=SS2026        Override semester (auto-derived if absent)
 *   LSF_FORCE=true             Skip the already-scraped-this-semester check
 *   LSF_THROTTLE_MS=500        Delay between module page requests (default 500ms)
 *   LSF_LIMIT=N                Cap modules per program (for testing)
 *   LSF_DEBUG=true             Save HTML to scripts/data/ for inspection
 */

import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';
import { createHmac } from 'crypto';
import { writeFileSync, mkdirSync } from 'fs';

function deriveCurrentSemester() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 3 && month <= 9) return `SS${year}`;
  const wsYear = month >= 10 ? year : year - 1;
  return `WS${wsYear}/${String(wsYear + 1).slice(-2)}`;
}

// --- ENV ---
const LSF_SEMESTER       = process.env.LSF_SEMESTER || deriveCurrentSemester();
const LSF_STUDY_PROGRAM  = process.env.LSF_STUDY_PROGRAM  || null;  // optional
const LSF_ABSTGVNR       = process.env.LSF_ABSTGVNR       || null;
const LSF_FORCE          = process.env.LSF_FORCE === 'true';
const LSF_SESSION_COOKIE = process.env.LSF_SESSION_COOKIE || null;
const LSF_USERNAME       = process.env.LSF_USERNAME       || null;
const LSF_PASSWORD       = process.env.LSF_PASSWORD       || null;
const LSF_TOTP_SECRET    = process.env.LSF_TOTP_SECRET    || null;
const THROTTLE_MS        = parseInt(process.env.LSF_THROTTLE_MS || '500', 10);
const LSF_LIMIT          = process.env.LSF_LIMIT ? parseInt(process.env.LSF_LIMIT, 10) : null;
const LSF_DEBUG          = process.env.LSF_DEBUG === 'true';
const SUPABASE_URL       = process.env.SUPABASE_URL;
const SUPABASE_KEY       = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

for (const [name, val] of [
  ['SUPABASE_URL', SUPABASE_URL],
  ['SUPABASE_KEY', SUPABASE_KEY],
]) {
  if (!val) { console.error(`Missing ${name}`); process.exit(1); }
}
console.log(`Semester: ${LSF_SEMESTER} (${process.env.LSF_SEMESTER ? 'explicit' : 'auto-derived'})`);

// --- LSF URLs ---
const LSF_BASE      = 'https://lsf.htwg-konstanz.de';
const LSF_LOGIN_URL = `${LSF_BASE}/qisserver/rds?state=user&type=1&category=auth.login&startpage=portal.vm`;

function buildListUrl(abstgvnr) {
  return (
    `${LSF_BASE}/qisserver/rds?state=verpublish&publishContainer=stgPlanList` +
    `&navigationPosition=lectures%2CcurriculaschedulesList&breadcrumb=curriculaschedules` +
    `&topitem=lectures&subitem=curriculaschedulesList` +
    (abstgvnr ? `&ABSTGVNR=${encodeURIComponent(abstgvnr)}` : '')
  );
}

// --- Mappings ---
const EVENT_TYPE_MAP = {
  'Vorlesung': 'lecture', 'Übung': 'exercise',
  'Praktikum': 'lab', 'Labor': 'lab',
  'Seminar': 'seminar', 'Vorlesung/Übung': 'mixed',
};
const EVENT_TO_COURSE_TYPE = {
  lecture:  'V',
  exercise: 'LÜ',
  lab:      'L',
  seminar:  'S',
  mixed:    'VÜ', // Vorlesung/Übung — valid combined type, not faulty
  other:    'LV', // unrecognised — generic Lehrveranstaltung, marked faulty
};
const COURSE_TYPE_CODE_SUFFIX = { V: '', LÜ: '-Ü', L: '-L', S: '-S', VÜ: '-VÜ', LV: '-LV' };
const COURSE_TYPE_NAME_SUFFIX = { V: '', LÜ: ' Übung', L: ' Labor', S: ' Seminar', VÜ: ' Vorlesung/Übung', LV: ' Lehrveranstaltung' };
const RHYTHM_MAP = {
  'Einzel': 0, 'einzel': 0, 'Einzeltermin': 0,
  'Woche': 1, 'wöch': 1, 'Wöch': 1, 'Woch': 1, 'woch': 1,
  '14tägl': 2, '14-tägl': 2, '14-tägig': 2,
};
const CANCELLED_PATTERNS = ['fällt aus', 'ausfall', 'entfällt', 'abgesagt', 'cancelled'];

// --- Supabase client ---
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// ─────────────────────────────────────────────
// TOTP (RFC 6238) — no extra dependency needed
// ─────────────────────────────────────────────
function generateTOTP(base32Secret, windowOffset = 0) {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32Secret.toUpperCase().replace(/[\s=]+/g, '');
  let bits = 0, val = 0;
  const bytes = [];
  for (const c of clean) {
    const idx = CHARS.indexOf(c);
    if (idx < 0) continue;
    val = (val << 5) | idx;
    bits += 5;
    if (bits >= 8) { bits -= 8; bytes.push((val >> bits) & 0xff); }
  }
  const key = Buffer.from(bytes);
  const counter = Math.floor(Date.now() / 30_000) + windowOffset;
  const msg = Buffer.alloc(8);
  msg.writeBigInt64BE(BigInt(counter));
  const hmac = createHmac('sha1', key).update(msg).digest();
  const offset = hmac[19] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) | (hmac[offset + 1] << 16) |
    (hmac[offset + 2] << 8) | hmac[offset + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

// ─────────────────────────────────────────────
// Auth / Session
// ─────────────────────────────────────────────
let _sessionCookie = null;

async function getSessionHeaders() {
  if (_sessionCookie) return { Cookie: _sessionCookie };

  if (LSF_SESSION_COOKIE) {
    _sessionCookie = LSF_SESSION_COOKIE;
    console.log('Using LSF_SESSION_COOKIE.');
    return { Cookie: _sessionCookie };
  }

  if (!LSF_USERNAME || !LSF_PASSWORD) {
    console.warn('No LSF_SESSION_COOKIE and no credentials set — fetching without auth.');
    return {};
  }

  console.log('Performing LSF login...');
  _sessionCookie = await loginToLSF(LSF_USERNAME, LSF_PASSWORD, LSF_TOTP_SECRET);
  return { Cookie: _sessionCookie };
}

async function loginToLSF(username, password, totpSecret) {
  // Step 1: GET login page — capture initial session cookie and hidden form fields
  const initRes = await fetch(LSF_LOGIN_URL);
  const initCookie = cookieFromHeader(initRes.headers.get('set-cookie'));
  const $init = cheerio.load(await initRes.text());

  const hidden = {};
  $init('form input[type="hidden"]').each((_, el) => {
    hidden[$init(el).attr('name')] = $init(el).val() || '';
  });

  // Step 2: POST credentials
  // QIS standard field names: asdf=username, fdsa=password
  const credBody = new URLSearchParams({ ...hidden, asdf: username, fdsa: password, submit: 'Anmelden' });
  const credRes = await fetch(LSF_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: initCookie },
    body: credBody.toString(),
    redirect: 'manual',
  });
  let sessionCookie = mergeCookies(initCookie, credRes.headers.get('set-cookie'));

  // Step 3: Check if the response contains an OTP input
  const credHtml = await safeText(credRes);
  const $cred = cheerio.load(credHtml);
  const otpInput = $cred('input[name="otp"], input[name*="token"], input[name*="code"]').first();

  if (otpInput.length > 0) {
    if (!totpSecret) throw new Error('OTP challenge received but LSF_TOTP_SECRET is not set.');
    const otp = generateTOTP(totpSecret);
    console.log(`Submitting OTP (${otp.slice(0, 2)}****)`);

    const otpHidden = {};
    $cred('form input[type="hidden"]').each((_, el) => {
      otpHidden[$cred(el).attr('name')] = $cred(el).val() || '';
    });
    const rawAction = $cred('form').first().attr('action') || LSF_LOGIN_URL;
    const otpAction = rawAction.startsWith('http') ? rawAction : `${LSF_BASE}${rawAction}`;
    const otpBody = new URLSearchParams({ ...otpHidden, [otpInput.attr('name')]: otp, submit: 'Weiter' });

    const otpRes = await fetch(otpAction, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: sessionCookie },
      body: otpBody.toString(),
      redirect: 'manual',
    });
    sessionCookie = mergeCookies(sessionCookie, otpRes.headers.get('set-cookie'));
  }

  console.log('Login complete.');
  return sessionCookie;
}

function cookieFromHeader(setCookieHeader) {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(';')[0].trim();
}

function mergeCookies(...parts) {
  const map = new Map();
  for (const part of parts) {
    if (!part) continue;
    // set-cookie headers can be comma-separated when multiple cookies are set
    for (const chunk of part.split(/,(?=[^;]+=[^;]+)/)) {
      const [kv] = chunk.split(';');
      const eq = kv.indexOf('=');
      if (eq < 0) continue;
      const k = kv.slice(0, eq).trim();
      const v = kv.slice(eq + 1).trim();
      if (k) map.set(k, v);
    }
  }
  return [...map.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function safeText(res) {
  try { return await res.text(); } catch { return ''; }
}

// ─────────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────────
function mapEventType(raw) {
  if (!raw) return 'other';
  const exact = EVENT_TYPE_MAP[raw.trim()];
  if (exact) return exact;
  const lower = raw.toLowerCase();
  if (lower.includes('vorlesung') && lower.includes('übung')) return 'mixed';
  if (lower.includes('vorlesung'))  return 'lecture';
  if (lower.includes('übung') || lower.includes('uebung')) return 'exercise';
  if (lower.includes('labor') || lower.includes('praktikum')) return 'lab';
  if (lower.includes('seminar'))    return 'seminar';
  return 'other';
}

function mapRhythm(raw) {
  if (!raw) return -1;
  return RHYTHM_MAP[raw.trim()] ?? -1;
}

function parseRoom(text) {
  if (!text?.trim()) return null;
  const m = text.trim().match(/^(.+?)\s*-\s*(.+?)(?:\s*\((.+?)\))?\s*$/);
  if (!m) return null;
  return { building: m[1].trim(), roomNumber: m[2].trim(), roomType: m[3]?.trim() ?? null };
}

function parseTime(text) {
  if (!text) return null;
  const parts = text.split('bis');
  if (parts.length !== 2) return null;
  const [start, end] = parts.map(s => s.trim());
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
  return { start, end };
}

function parseDauer(text) {
  if (!text?.trim()) return null;
  const range = text.trim().match(/^(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})$/);
  if (range) return { start: range[1], end: range[2] };
  const single = text.trim().match(/^(\d{2}\.\d{2}\.\d{4})$/);
  if (single) return { start: single[1], end: single[1] };
  return null;
}

function parseGermanDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('.');
  return `${y}-${m}-${d}`;
}

function deriveSemesterDates(semester) {
  const ss = semester.match(/^SS(\d{4})$/i);
  if (ss) return { start: `${ss[1]}-03-15`, end: `${ss[1]}-09-30` };
  const ws = semester.match(/^WS(\d{4})(?:\/(\d{2}))?$/i);
  if (ws) {
    const y2 = ws[2] ? `20${ws[2]}` : String(parseInt(ws[1]) + 1);
    return { start: `${ws[1]}-10-01`, end: `${y2}-03-14` };
  }
  return null;
}

function cleanCell($cell) {
  const text = $cell.text().replace(/\s+/g, ' ').trim();
  return !text || text === ' ' ? '' : text;
}

function stripHeadingSuffix(text) {
  return text
    .replace(/\s*-\s*Einzelansicht\s*$/i, '')
    .replace(/\s*-\s*Gruppenansicht\s*$/i, '')
    .replace(/\s*-\s*Detailansicht\s*$/i, '')
    .trim();
}

function buildSeriesId(courseId, weekday, startTime) {
  return `${courseId ?? 'none'}::${weekday ?? '?'}::${startTime}`;
}

function isCancelled(status) {
  if (!status) return false;
  const lower = status.toLowerCase();
  return CANCELLED_PATTERNS.some(p => lower.includes(p));
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─────────────────────────────────────────────
// Database helpers
// ─────────────────────────────────────────────

async function fetchStudyPrograms() {
  const { data, error } = await supabase
    .from('study_programs')
    .select('code, lsf_abstgvnr')
    .not('lsf_abstgvnr', 'is', null);
  if (error) throw new Error(`Failed to fetch study programs: ${error.message}`);
  return data ?? [];
}

async function createRun(studyProgram, abstgvnr, semester) {
  const { data, error } = await supabase
    .from('lsf_import_runs')
    .insert({
      study_program_code: studyProgram,
      lsf_abstgvnr: abstgvnr ?? '',
      term: semester,
      status: 'running',
    })
    .select('id')
    .single();
  if (error) { console.error('Failed to create import run:', error); process.exit(1); }
  console.log(`Import run ${data.id} started (${studyProgram} / ${semester}).`);
  return data.id;
}

async function finishRun(runId, success, stats, errorMsg) {
  if (!runId) return;
  const upd = { finished_at: new Date().toISOString(), status: success ? 'success' : 'error' };
  if (success) {
    upd.events_found       = stats.found;
    upd.events_inserted    = stats.inserted;
    upd.events_updated     = 0;
    upd.events_deactivated = 0;
  } else {
    upd.error_msg = errorMsg;
  }
  const { error } = await supabase.from('lsf_import_runs').update(upd).eq('id', runId);
  if (error) console.error('Failed to update import run:', error);
}

async function checkRecentRun(studyProgram, semester) {
  const { data, error } = await supabase
    .from('lsf_import_runs')
    .select('id, started_at')
    .eq('study_program_code', studyProgram)
    .eq('term', semester)
    .eq('status', 'success')
    .limit(1);
  if (error) { console.error('Skip-check failed:', error); return false; }
  if (data?.length > 0) {
    console.log(
      `Already scraped ${studyProgram}/${semester} ` +
      `(run ${data[0].id} at ${data[0].started_at}). Use LSF_FORCE=true to override.`
    );
    return true;
  }
  return false;
}

async function resolveModuleByVeranstid(veranstid) {
  if (!veranstid) return null;
  const { data, error } = await supabase
    .from('modules').select('id, code, name, lsf_veranstid')
    .eq('lsf_veranstid', veranstid).limit(1);
  if (!error && data?.length > 0) return data[0];
  return null;
}

// Strips LSF title prefixes like "AIN5/IMS6 " or "AIN1/2 " to get the plain module name
function stripLsfTitlePrefix(title) {
  return title.replace(/^([A-Z]{2,5}\d[/A-Z0-9]*\s+)+/i, '').trim();
}

async function resolveModuleByName(name) {
  if (!name) return null;

  const candidates = [
    name,
    stripLsfTitlePrefix(name),
    name.split(/\s+/).slice(1).join(' '), // strip first word (generic fallback)
  ].filter((s, i, arr) => s && arr.indexOf(s) === i); // deduplicate

  for (const candidate of candidates) {
    const { data, error } = await supabase
      .from('modules').select('id, code, name, lsf_veranstid')
      .ilike('name', candidate).limit(1);
    if (!error && data?.length > 0) return data[0];
  }
  return null;
}

async function getStudyProgramId(studyProgram) {
  const { data } = await supabase
    .from('study_programs').select('id').eq('code', studyProgram).limit(1);
  return data?.[0]?.id ?? null;
}

async function createModuleStub(lsfTitle, publishid, coordinator, studyProgramId) {
  const name = stripLsfTitlePrefix(lsfTitle) || lsfTitle;
  const { data, error } = await supabase.from('modules').insert({
    name,
    code: `LSF-${publishid}`,
    lsf_veranstid: publishid,
    study_program_id: studyProgramId,
    start_semester: '',
    coordinator: coordinator ?? '',
    version: 1,
    is_mandatory: false,
    is_specialization: false,
    details: {},
  }).select('id, code, name, lsf_veranstid').single();
  if (error) {
    console.error(`  ERROR: DB insert for stub failed: ${error.message}`);
    return null;
  }
  console.warn(`  WARN: Created module stub id=${data.id} code='${data.code}' name='${data.name}' — run INdigit import to replace stub with real module data`);
  return data;
}

// Per-program cache — cleared between programs
const courseCache = new Map();

async function resolveOrCreateCourseId(module, courseType, coordinator, faulty = false) {
  if (!module || !courseType) return null;
  const key = `${module.id}::${courseType}`;
  if (courseCache.has(key)) return courseCache.get(key);

  const { data, error } = await supabase
    .from('courses').select('id')
    .eq('module_id', module.id).eq('course_type', courseType).limit(1);
  if (!error && data?.length > 0) {
    courseCache.set(key, data[0].id);
    return data[0].id;
  }

  const { data: ins, error: insErr } = await supabase.from('courses').insert({
    module_id: module.id,
    code: module.code + (COURSE_TYPE_CODE_SUFFIX[courseType] || ''),
    name: module.name + (COURSE_TYPE_NAME_SUFFIX[courseType] || ''),
    course_type: courseType,
    coordinator,
    ects: 0,
    sws: 0,
    details: {},
    faulty,
  }).select('id').single();

  if (insErr) {
    console.error(`  Course create failed (${module.code} ${courseType}):`, insErr.message);
    return null;
  }
  courseCache.set(key, ins.id);
  console.log(`  Created course id=${ins.id} type=${courseType}`);
  return ins.id;
}

// ─────────────────────────────────────────────
// Discovery: find all module URLs in study plan
// ─────────────────────────────────────────────

function toAbsolute(href) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  return `${LSF_BASE}${href.startsWith('/') ? '' : '/qisserver/rds?'}${href}`;
}

function extractWebInfoUrls($) {
  const seen = new Set();
  const urls = [];
  $('a[href*="moduleCall=webInfo"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const full = toAbsolute(href);
    if (!full) return;
    let publishid;
    try { publishid = new URL(full).searchParams.get('publishid'); } catch { return; }
    if (!publishid || seen.has(publishid)) return;
    seen.add(publishid);
    urls.push({ publishid, url: full });
  });
  return urls;
}

async function fetchModuleUrls(headers, listUrl, abstgvnr) {
  console.log(`Fetching study plan list (ABSTGVNR=${abstgvnr})...`);
  const res = await fetch(listUrl, { headers });
  if (!res.ok) throw new Error(`Study plan list HTTP ${res.status}: ${res.statusText}`);

  const listHtml = await res.text();
  if (LSF_DEBUG) {
    mkdirSync('scripts/data', { recursive: true });
    writeFileSync('scripts/data/debug_list.html', listHtml);
    console.log('Debug: saved list HTML to scripts/data/debug_list.html');
  }
  const $list = cheerio.load(listHtml);

  // Some LSF configurations link webInfo directly from the list page
  const direct = extractWebInfoUrls($list);
  if (direct.length > 0) {
    console.log(`Discovered ${direct.length} module URLs (direct).`);
    return applyLimit(direct);
  }

  // HTWG LSF: stgPlanList shows ALL study programs on one page.
  // Filter wplan links strictly by abstgvnr so we only follow plan pages
  // belonging to the requested study program.
  const wplanUrls = [];
  $list('a[href*="state=wplan"]').each((_, el) => {
    const href = $list(el).attr('href') || '';
    const full = toAbsolute(href);
    if (!full) return;
    if (abstgvnr && !href.includes(`abstgvnr=${abstgvnr}`)) return;
    if (href.includes('missing=allTerms')) wplanUrls.unshift(full); // "Alle" first
    else wplanUrls.push(full);
  });

  if (!wplanUrls.length) {
    console.warn('No wplan links found for this ABSTGVNR. Check the value or the list page HTML (LSF_DEBUG=true).');
    return [];
  }

  // Prefer a single "Alle Semester" page; fall back to per-semester pages
  const planPagesToFetch = wplanUrls[0].includes('missing=allTerms')
    ? [wplanUrls[0]]
    : [...new Set(wplanUrls)];

  console.log(`Following ${planPagesToFetch.length} plan page(s) to discover module URLs...`);

  const seen = new Set();
  const urls = [];

  for (const planUrl of planPagesToFetch) {
    if (LSF_DEBUG) console.log(`  Fetching plan: ${planUrl}`);
    const planRes = await fetch(planUrl, { headers });
    if (!planRes.ok) { console.warn(`  Plan fetch failed (${planRes.status}): ${planUrl}`); continue; }
    const planHtml = await planRes.text();
    if (LSF_DEBUG) {
      const slug = new URL(planUrl).searchParams.get('r_zuordabstgv.semvonint') || 'all';
      writeFileSync(`scripts/data/debug_plan_${slug}.html`, planHtml);
    }
    const $plan = cheerio.load(planHtml);
    for (const item of extractWebInfoUrls($plan)) {
      if (seen.has(item.publishid)) continue;
      seen.add(item.publishid);
      urls.push(item);
    }
    await sleep(THROTTLE_MS);
  }

  console.log(`Discovered ${urls.length} module URLs.`);
  return applyLimit(urls);
}

function applyLimit(urls) {
  if (LSF_LIMIT && urls.length > LSF_LIMIT) {
    console.log(`LSF_LIMIT=${LSF_LIMIT}: using first ${LSF_LIMIT} of ${urls.length} modules.`);
    return urls.slice(0, LSF_LIMIT);
  }
  return urls;
}

// ─────────────────────────────────────────────
// Scraping: parse events from one module page
// ─────────────────────────────────────────────
function scrapeCoordinator($) {
  let coordinator = null;
  $('table').each(function () {
    if (!/zugeordnete.*person/i.test($(this).find('caption').first().text())) return;
    const td = $(this).find('td').first();
    if (td.length) coordinator = cleanCell(td);
    return false;
  });
  return coordinator || null;
}

async function extractEventsFromPage($, sourceUrl, module, coordinator, semesterDates, semester) {
  const events = [];

  for (const tableEl of $('table').toArray()) {
    const $table = $(tableEl);
    if (!$table.find('caption').first().text().includes('Termine')) continue;

    const rows = $table.find('tr');
    for (let i = 1; i < rows.length; i++) {
      const $row = $(rows[i]);
      const cells = $row.find('td');
      if (!cells.length || cells.first().attr('colspan')) continue;

      const raw = {
        idx:       cleanCell(cells.eq(0)),
        tag:       cleanCell(cells.eq(1)),
        zeit:      cleanCell(cells.eq(2)),
        rhythmus:  cleanCell(cells.eq(3)),
        dauer:     cleanCell(cells.eq(4)),
        raum:      cleanCell(cells.eq(5)),
        status:    cleanCell(cells.eq(8)),
        bemerkung: cleanCell(cells.eq(9)),
      };

      const times = parseTime(raw.zeit);
      if (!times) continue;

      const pd = parseDauer(raw.dauer);
      const startDate = pd ? parseGermanDate(pd.start) : semesterDates?.start ?? null;
      const endDate   = pd ? parseGermanDate(pd.end)   : semesterDates?.end   ?? null;
      if (!startDate || !endDate) continue;

      const weekday   = raw.tag ? raw.tag.replace('.', '') : null;
      const rhythm    = mapRhythm(raw.rhythmus);
      const room      = parseRoom(raw.raum);
      const cancelled = isCancelled(raw.status);
      if (cancelled) {
        console.log(`  Ausfall: ${startDate} ${times.start} (${raw.status})`);
      }
      const eventType  = mapEventType(raw.bemerkung || raw.status);
      const faulty     = eventType === 'other';
      if (faulty) {
        console.error(`  ERROR: Unrecognised event type — status='${raw.status}' bemerkung='${raw.bemerkung}' — course will be marked faulty`);
      }
      const courseType = EVENT_TO_COURSE_TYPE[eventType];
      const courseId   = await resolveOrCreateCourseId(module, courseType, coordinator, faulty);

      events.push({
        term:          semester,
        course_id:     courseId,
        rhythm,
        event_type:    eventType,
        weekday,
        start_date:    startDate,
        end_date:      endDate,
        start_time:    times.start,
        end_time:      times.end,
        room_building: room?.building ?? null,
        room_number:   room?.roomNumber ?? null,
        series_id:     buildSeriesId(courseId, weekday, times.start),
        status:        raw.status || null,
        cancelled,
        source_url:    sourceUrl,
        raw_payload:   raw,
        updated_at:    new Date().toISOString(),
      });
    }
  }
  return events;
}

// ─────────────────────────────────────────────
// Import: rooms + events into Supabase
// ─────────────────────────────────────────────
async function upsertRoomsAndEvents(events) {
  // Upsert rooms first (FK constraint on lsf_events)
  const seenRooms = new Set();
  for (const ev of events) {
    if (!ev.room_building || !ev.room_number) continue;
    const key = `${ev.room_building}::${ev.room_number}`;
    if (seenRooms.has(key)) continue;
    seenRooms.add(key);
    const { error } = await supabase
      .from('rooms')
      .upsert({ building: ev.room_building, room_number: ev.room_number },
        { onConflict: 'building,room_number', ignoreDuplicates: true });
    if (error) console.error('Room upsert failed:', error.message);
  }

  // Upsert events: new (series_id, start_date) pairs are inserted; existing rows
  // are left untouched so that user_events.lsf_event_id foreign keys stay valid.
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < events.length; i += BATCH) {
    const { data, error } = await supabase
      .from('lsf_events')
      .upsert(events.slice(i, i + BATCH), {
        onConflict: 'series_id,start_date',
        ignoreDuplicates: true,
      });
    if (error) throw new Error(`Upsert batch ${i / BATCH + 1} failed: ${error.message}`);
    inserted += data?.length ?? 0;
  }
  const skipped = events.length - inserted;
  console.log(`Inserted ${inserted} new events (${skipped} already existed, preserved).`);
  return { inserted, skipped };
}

// ─────────────────────────────────────────────
// Per-program import
// ─────────────────────────────────────────────
async function runForProgram(studyProgram, abstgvnr, headers) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Program: ${studyProgram}  ABSTGVNR: ${abstgvnr ?? '(none)'}`);

  // Reset per-program caches
  courseCache.clear();

  if (!LSF_FORCE && await checkRecentRun(studyProgram, LSF_SEMESTER)) return;

  const runId = await createRun(studyProgram, abstgvnr, LSF_SEMESTER);

  const listUrl = buildListUrl(abstgvnr);
  let moduleUrls;
  try {
    moduleUrls = await fetchModuleUrls(headers, listUrl, abstgvnr);
  } catch (err) {
    await finishRun(runId, false, null, `Study plan list fetch failed: ${err.message}`);
    console.error(err.message);
    return;
  }

  if (!moduleUrls.length) {
    const msg = `No module URLs discovered for ABSTGVNR=${abstgvnr} — check the ABSTGVNR and verify the study plan list URL is correct.`;
    console.error(msg);
    await finishRun(runId, false, null, msg);
    return;
  }

  const semesterDates = deriveSemesterDates(LSF_SEMESTER);
  if (!semesterDates) {
    console.warn(`Could not derive fallback semester dates from '${LSF_SEMESTER}' — events without Dauer column will be skipped.`);
  }

  const studyProgramId = await getStudyProgramId(studyProgram);
  const allEvents = [];
  let failCount = 0;

  for (let i = 0; i < moduleUrls.length; i++) {
    const { publishid, url } = moduleUrls[i];
    console.log(`\n[${i + 1}/${moduleUrls.length}] publishid=${publishid}`);

    if (i > 0) await sleep(THROTTLE_MS);

    let $;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      $ = cheerio.load(await res.text());
    } catch (err) {
      console.error(`  Fetch failed: ${err.message} — skipping`);
      failCount++;
      continue;
    }

    const h1Title = stripHeadingSuffix($('h1').first().text().trim());
    console.log(`  Title: ${h1Title}`);

    let mod = await resolveModuleByVeranstid(publishid);
    if (!mod) {
      mod = await resolveModuleByName(h1Title);
      if (mod) console.log(`  Resolved by name: ${mod.code}`);
    } else {
      console.log(`  Resolved by veranstid: ${mod.code}`);
    }

    if (mod && !mod.lsf_veranstid) {
      // Backfill so future runs use fast veranstid lookup
      await supabase.from('modules').update({ lsf_veranstid: publishid }).eq('id', mod.id);
      console.log(`  Backfilled lsf_veranstid=${publishid} on module ${mod.code}`);
    }

    const coordinator = scrapeCoordinator($);
    if (coordinator) console.log(`  Coordinator: ${coordinator}`);

    if (!mod) {
      console.error(`  ERROR: Module not found in DB for "${h1Title}" (publishid=${publishid}) — creating stub`);
      mod = await createModuleStub(h1Title, publishid, coordinator, studyProgramId);
      if (!mod) {
        console.error(`  ERROR: Stub creation failed for "${h1Title}" (publishid=${publishid}) — skipping module`);
        failCount++;
        continue;
      }
    }

    const events = await extractEventsFromPage($, url, mod, coordinator, semesterDates, LSF_SEMESTER);
    console.log(`  Events found: ${events.length}`);
    allEvents.push(...events);
  }

  const stats = { found: allEvents.length, inserted: 0 };
  console.log(
    `\nTotal: ${allEvents.length} events from ` +
    `${moduleUrls.length - failCount}/${moduleUrls.length} modules (${failCount} failed).`
  );

  if (allEvents.length > 0) {
    try {
      const { inserted } = await upsertRoomsAndEvents(allEvents);
      stats.inserted = inserted;
    } catch (err) {
      await finishRun(runId, false, null, err.message);
      console.error('Import failed:', err.message);
      return;
    }
  }

  await finishRun(runId, true, stats, null);
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────
async function main() {
  let headers;
  try {
    headers = await getSessionHeaders();
  } catch (err) {
    console.error(`Auth failed: ${err.message}`);
    process.exit(1);
  }

  let programs;
  if (LSF_STUDY_PROGRAM) {
    programs = [{ code: LSF_STUDY_PROGRAM, lsf_abstgvnr: LSF_ABSTGVNR }];
  } else {
    console.log('LSF_STUDY_PROGRAM not set — discovering programs from study_programs.lsf_abstgvnr...');
    try {
      programs = await fetchStudyPrograms();
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
    if (!programs.length) {
      console.error(
        'No study programs with lsf_abstgvnr found in DB. ' +
        'Set LSF_STUDY_PROGRAM env var or populate study_programs.lsf_abstgvnr.'
      );
      process.exit(1);
    }
    console.log(`Found ${programs.length} program(s): ${programs.map(p => p.code).join(', ')}`);
  }

  for (const prog of programs) {
    await runForProgram(prog.code, prog.lsf_abstgvnr, headers);
  }
}

main();

/**
 * Shared LSF (HTWG Konstanz) scraping primitives.
 *
 * Pure, side-effect-free helpers plus a thin fetch-based session factory,
 * extracted so that more than one importer can reuse the same LSF mechanics
 * (discovery, Termine parsing, auth) without duplicating them.
 *
 * Currently used by scripts/sg-import.js. The older scripts/lsf-import.js still
 * carries its own copies; it can be migrated onto this module in a separate,
 * independently-testable change.
 *
 * Notable difference from lsf-import.js: extractTermine() maps the Termine table
 * columns by their header label instead of fixed indices. Real LSF pages vary
 * (e.g. a "Raum-plan" column shifts "Lehrperson" from index 6 to 7), so
 * index-based access reads the wrong cell on some study programs.
 */
import * as cheerio from 'cheerio';
import { createHmac } from 'crypto';

export const LSF_BASE = 'https://lsf.htwg-konstanz.de';
export const LSF_LOGIN_URL = `${LSF_BASE}/qisserver/rds?state=user&type=1&category=auth.login&startpage=portal.vm`;

// --- Mappings ---
export const EVENT_TYPE_MAP = {
  'Vorlesung': 'lecture', 'Übung': 'exercise',
  'Praktikum': 'lab', 'Labor': 'lab',
  'Seminar': 'seminar', 'Vorlesung/Übung': 'mixed',
};
export const EVENT_TO_COURSE_TYPE = {
  lecture:  'V',
  exercise: 'LÜ',
  lab:      'L',
  seminar:  'S',
  mixed:    'VÜ', // Vorlesung/Übung — valid combined type, not faulty
  other:    'LV', // unrecognised — generic Lehrveranstaltung, marked faulty
};
export const COURSE_TYPE_CODE_SUFFIX = { V: '', LÜ: '-Ü', L: '-L', S: '-S', VÜ: '-VÜ', LV: '-LV' };
export const COURSE_TYPE_NAME_SUFFIX = { V: '', LÜ: ' Übung', L: ' Labor', S: ' Seminar', VÜ: ' Vorlesung/Übung', LV: ' Lehrveranstaltung' };
export const RHYTHM_MAP = {
  'Einzel': 0, 'einzel': 0, 'Einzeltermin': 0,
  'Woche': 1, 'wöch': 1, 'Wöch': 1, 'Woch': 1, 'woch': 1,
  '14tägl': 2, '14-tägl': 2, '14-tägig': 2,
};
export const CANCELLED_PATTERNS = ['fällt aus', 'ausfall', 'entfällt', 'abgesagt', 'cancelled'];

// ─────────────────────────────────────────────
// Pure parsers / helpers
// ─────────────────────────────────────────────
export function deriveCurrentSemester(now = new Date()) {
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 3 && month <= 9) return `SS${year}`;
  const wsYear = month >= 10 ? year : year - 1;
  return `WS${wsYear}/${String(wsYear + 1).slice(-2)}`;
}

export function deriveSemesterDates(semester) {
  const ss = semester.match(/^SS(\d{4})$/i);
  if (ss) return { start: `${ss[1]}-03-15`, end: `${ss[1]}-09-30` };
  const ws = semester.match(/^WS(\d{4})(?:\/(\d{2}))?$/i);
  if (ws) {
    const y2 = ws[2] ? `20${ws[2]}` : String(parseInt(ws[1]) + 1);
    return { start: `${ws[1]}-10-01`, end: `${y2}-03-14` };
  }
  return null;
}

export function mapEventType(raw) {
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

export function mapRhythm(raw) {
  if (!raw) return -1;
  return RHYTHM_MAP[raw.trim()] ?? -1;
}

export function parseRoom(text) {
  if (!text?.trim()) return null;
  const m = text.trim().match(/^(.+?)\s*-\s*(.+?)(?:\s*\((.+?)\))?\s*$/);
  if (!m) return null;
  return { building: m[1].trim(), roomNumber: m[2].trim(), roomType: m[3]?.trim() ?? null };
}

export function parseTime(text) {
  if (!text) return null;
  const parts = text.split('bis');
  if (parts.length !== 2) return null;
  // Grab the first HH:MM on each side; tolerate trailing notation like
  // "s.t." (sine tempore) / "c.t." (cum tempore). Times are taken literally as
  // printed — the s.t./c.t. marker is preserved in the raw payload, not applied.
  const grab = (s) => {
    const m = s.match(/(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
  };
  const start = grab(parts[0]);
  const end = grab(parts[1]);
  if (!start || !end) return null;
  return { start, end };
}

export function parseDauer(text) {
  if (!text?.trim()) return null;
  const t = text.trim();
  const pad2 = (s) => s.padStart(2, '0');
  const norm = (d, m, y) => `${pad2(d)}.${pad2(m)}.${y}`;
  // "am DD.MM.YYYY" — single Einzeltermin date
  const am = t.match(/^am\s+(\d{1,2})\.(\d{1,2})\.(\d{4})$/i);
  if (am) { const dt = norm(am[1], am[2], am[3]); return { start: dt, end: dt }; }
  // "DD.MM.YYYY bis DD.MM.YYYY" / "DD.MM.YYYY - DD.MM.YYYY" — date range
  const range = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\s*(?:bis|[-–])\s*(\d{1,2})\.(\d{1,2})\.(\d{4})$/i);
  if (range) return { start: norm(range[1], range[2], range[3]), end: norm(range[4], range[5], range[6]) };
  // single "DD.MM.YYYY"
  const single = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (single) { const dt = norm(single[1], single[2], single[3]); return { start: dt, end: dt }; }
  return null;
}

export function parseGermanDate(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('.');
  return `${y}-${m}-${d}`;
}

export function cleanText(text) {
  const out = (text ?? '').replace(/\s+/g, ' ').trim();
  return !out || out === ' ' ? '' : out;
}

export function stripHeadingSuffix(text) {
  return text
    .replace(/\s*-\s*Einzelansicht\s*$/i, '')
    .replace(/\s*-\s*Gruppenansicht\s*$/i, '')
    .replace(/\s*-\s*Detailansicht\s*$/i, '')
    .trim();
}

// Strips LSF title prefixes like "AIN5/IMS6 " or "AIN1/2 " to get the plain module name
export function stripLsfTitlePrefix(title) {
  return title.replace(/^([A-Z]{2,5}\d[/A-Z0-9]*\s+)+/i, '').trim();
}

export function buildSeriesId(courseId, weekday, startTime) {
  return `${courseId ?? 'none'}::${weekday ?? '?'}::${startTime}`;
}

export function isCancelled(status) {
  if (!status) return false;
  const lower = status.toLowerCase();
  return CANCELLED_PATTERNS.some((p) => lower.includes(p));
}

export function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

// ─────────────────────────────────────────────
// URLs
// ─────────────────────────────────────────────
export function buildListUrl(abstgvnr, base = LSF_BASE) {
  return (
    `${base}/qisserver/rds?state=verpublish&publishContainer=stgPlanList` +
    `&navigationPosition=lectures%2CcurriculaschedulesList&breadcrumb=curriculaschedules` +
    `&topitem=lectures&subitem=curriculaschedulesList` +
    (abstgvnr ? `&ABSTGVNR=${encodeURIComponent(abstgvnr)}` : '')
  );
}

export function toAbsolute(href, base = LSF_BASE) {
  if (!href) return null;
  if (href.startsWith('http')) return href;
  return `${base}${href.startsWith('/') ? '' : '/qisserver/rds?'}${href}`;
}

// ─────────────────────────────────────────────
// Discovery (regex over raw HTML — the "Alle" plan page can be tens of MB,
// so we avoid loading it into cheerio just to pull out links)
// ─────────────────────────────────────────────

/**
 * From the stgPlanList HTML, return the study-plan ("wplan") page URLs that
 * belong to the given ABSTGVNR. Prefers the single "Alle Semester"
 * (missing=allTerms) page when present.
 */
export function extractPlanLinks(html, abstgvnr, base = LSF_BASE) {
  const re = /href="([^"]*state=wplan[^"]*)"/gi;
  const seen = new Set();
  const all = [];
  let m;
  while ((m = re.exec(html))) {
    const href = m[1].replace(/&amp;/g, '&');
    if (abstgvnr && !href.includes(`abstgvnr=${abstgvnr}`)) continue;
    const full = toAbsolute(href, base);
    if (!full || seen.has(full)) continue;
    seen.add(full);
    if (href.includes('missing=allTerms')) all.unshift(full); // "Alle" first
    else all.push(full);
  }
  if (all.length && all[0].includes('missing=allTerms')) return [all[0]];
  return all;
}

/** From a plan/list HTML, return distinct module pages: [{ publishid, url }]. */
export function extractWebInfoModules(html, base = LSF_BASE) {
  const re = /href="([^"]*moduleCall=webInfo[^"]*)"/gi;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    const full = toAbsolute(m[1].replace(/&amp;/g, '&'), base);
    let publishid;
    try { publishid = new URL(full).searchParams.get('publishid'); } catch { continue; }
    if (!publishid || seen.has(publishid)) continue;
    seen.add(publishid);
    out.push({ publishid, url: full });
  }
  return out;
}

// ─────────────────────────────────────────────
// Module-page parsing (cheerio)
// ─────────────────────────────────────────────
export function parseModuleTitle($) {
  return stripHeadingSuffix($('h1').first().text().trim());
}

export function scrapeCoordinator($) {
  let coordinator = null;
  $('table').each(function () {
    if (!/zugeordnete.*person/i.test($(this).find('caption').first().text())) return;
    const td = $(this).find('td').first();
    if (td.length) coordinator = cleanText(td.text());
    return false;
  });
  return coordinator || null;
}

// ECTS/credits from the Grunddaten "Credits" cell. Often blank in LSF (esp. for
// informal SG courses); returns null when absent.
export function scrapeCredits($) {
  let credits = null;
  $('th').each(function () {
    if (cleanText($(this).text()).toLowerCase() !== 'credits') return;
    const num = parseFloat(cleanText($(this).next('td').text()).replace(',', '.'));
    if (!Number.isNaN(num)) credits = num;
    return false;
  });
  return credits;
}

/**
 * Parse the "Termine" table(s) of a module page into raw event descriptors.
 * Columns are located by header label (robust to layout differences between
 * study programs). Rows without a parseable HH:MM time (e.g. block courses
 * described only in the Bemerkung) are skipped.
 *
 * Returns descriptors WITHOUT course_id/series_id — the caller resolves the
 * course and assembles the final DB row.
 */
export function extractTermine($, { semesterDates } = {}) {
  const events = [];

  for (const tableEl of $('table').toArray()) {
    const $table = $(tableEl);
    if (!$table.find('caption').first().text().includes('Termine')) continue;

    const rows = $table.find('tr').toArray();
    if (!rows.length) continue;

    const headers = $(rows[0]).find('th').toArray().map((th) => cleanText($(th).text()).toLowerCase());
    const headerIndex = (...candidates) => {
      for (const c of candidates) { const i = headers.indexOf(c); if (i !== -1) return i; }
      for (const c of candidates) { const i = headers.findIndex((h) => h.startsWith(c)); if (i !== -1) return i; }
      return -1;
    };
    const idx = {
      tag:        headerIndex('tag'),
      zeit:       headerIndex('zeit'),
      rhythmus:   headerIndex('rhythmus'),
      dauer:      headerIndex('dauer'),
      raum:       headerIndex('raum'),                       // exact 'raum' beats 'raum-plan'
      lehrperson: headerIndex('lehrperson', 'dozent', 'lehrende'),
      status:     headerIndex('status'),
      bemerkung:  headerIndex('bemerkung'),
    };

    for (let i = 1; i < rows.length; i++) {
      const cells = $(rows[i]).find('td');
      if (!cells.length || cells.first().attr('colspan')) continue;
      const cell = (key) => (idx[key] >= 0 ? cleanText(cells.eq(idx[key]).text()) : '');

      const times = parseTime(cell('zeit'));
      if (!times) continue; // no weekly time (block course etc.) — skip

      const pd = parseDauer(cell('dauer'));
      const startDate = pd ? parseGermanDate(pd.start) : semesterDates?.start ?? null;
      const endDate   = pd ? parseGermanDate(pd.end)   : semesterDates?.end   ?? null;
      if (!startDate || !endDate) continue;

      const tag       = cell('tag');
      const status    = cell('status');
      const bemerkung = cell('bemerkung');
      const eventType = mapEventType(bemerkung || status);

      events.push({
        weekday:    tag ? tag.replace('.', '') : null,
        rhythm:     mapRhythm(cell('rhythmus')),
        room:       parseRoom(cell('raum')),
        lecturer:   cell('lehrperson') || null,
        status:     status || null,
        cancelled:  isCancelled(status),
        eventType,
        faulty:     eventType === 'other',
        courseType: EVENT_TO_COURSE_TYPE[eventType],
        startDate,
        endDate,
        startTime:  times.start,
        endTime:    times.end,
        raw: {
          tag, zeit: cell('zeit'), rhythmus: cell('rhythmus'), dauer: cell('dauer'),
          raum: cell('raum'), lehrperson: cell('lehrperson'), status, bemerkung,
        },
      });
    }
  }
  return events;
}

// ─────────────────────────────────────────────
// TOTP (RFC 6238) — no extra dependency needed
// ─────────────────────────────────────────────
export function generateTOTP(base32Secret, windowOffset = 0) {
  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32Secret.toUpperCase().replace(/[\s=]+/g, '');
  let bits = 0, val = 0;
  const bytes = [];
  for (const c of clean) {
    const i = CHARS.indexOf(c);
    if (i < 0) continue;
    val = (val << 5) | i;
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

function cookieFromHeader(setCookieHeader) {
  if (!setCookieHeader) return '';
  return setCookieHeader.split(';')[0].trim();
}

function mergeCookies(...parts) {
  const map = new Map();
  for (const part of parts) {
    if (!part) continue;
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

async function loginToLSF({ username, password, totpSecret, base = LSF_BASE, loginUrl = LSF_LOGIN_URL, logger = console }) {
  const initRes = await fetch(loginUrl);
  const initCookie = cookieFromHeader(initRes.headers.get('set-cookie'));
  const $init = cheerio.load(await initRes.text());

  const hidden = {};
  $init('form input[type="hidden"]').each((_, el) => {
    hidden[$init(el).attr('name')] = $init(el).val() || '';
  });

  // QIS standard field names: asdf=username, fdsa=password
  const credBody = new URLSearchParams({ ...hidden, asdf: username, fdsa: password, submit: 'Anmelden' });
  const credRes = await fetch(loginUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: initCookie },
    body: credBody.toString(),
    redirect: 'manual',
  });
  let sessionCookie = mergeCookies(initCookie, credRes.headers.get('set-cookie'));

  const $cred = cheerio.load(await safeText(credRes));
  const otpInput = $cred('input[name="otp"], input[name*="token"], input[name*="code"]').first();
  if (otpInput.length > 0) {
    if (!totpSecret) throw new Error('OTP challenge received but no TOTP secret is set.');
    const otp = generateTOTP(totpSecret);
    logger.log(`Submitting OTP (${otp.slice(0, 2)}****)`);
    const otpHidden = {};
    $cred('form input[type="hidden"]').each((_, el) => {
      otpHidden[$cred(el).attr('name')] = $cred(el).val() || '';
    });
    const rawAction = $cred('form').first().attr('action') || loginUrl;
    const otpAction = rawAction.startsWith('http') ? rawAction : `${base}${rawAction}`;
    const otpBody = new URLSearchParams({ ...otpHidden, [otpInput.attr('name')]: otp, submit: 'Weiter' });
    const otpRes = await fetch(otpAction, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: sessionCookie },
      body: otpBody.toString(),
      redirect: 'manual',
    });
    sessionCookie = mergeCookies(sessionCookie, otpRes.headers.get('set-cookie'));
  }

  logger.log('Login complete.');
  return sessionCookie;
}

/**
 * Build a session that yields request headers. Auth is OPTIONAL — the public
 * LSF catalog pages (stgPlanList, wplan, webInfo) are reachable without it.
 * Order of preference: explicit cookie › username/password (+TOTP) › none.
 */
export function createLsfSession({ sessionCookie = null, username = null, password = null, totpSecret = null, base = LSF_BASE, logger = console } = {}) {
  let cookie = null;
  let resolved = false;
  return {
    async getHeaders() {
      if (resolved) return cookie ? { Cookie: cookie } : {};
      resolved = true;
      if (sessionCookie) {
        cookie = sessionCookie;
        logger.log('Using provided LSF session cookie.');
      } else if (username && password) {
        logger.log('Performing LSF login...');
        cookie = await loginToLSF({ username, password, totpSecret, base, logger });
      } else {
        logger.log('No LSF auth configured — using public access (catalog pages do not require login).');
      }
      return cookie ? { Cookie: cookie } : {};
    },
  };
}

/**
 * Oreok's thumbnail feedback — Google Apps Script backend.
 * Stores reviews in a Google Sheet ("Oreok's thumbnail feedback") in your Google Drive.
 *
 * To hide a review: open the sheet and set its "Show" box to FALSE (or delete the row).
 * Deploy: Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone.
 */

const SHEET_NAME = 'Feedback';
const HEADERS = ['Date', 'Name', 'Stars', 'Thumbnail', 'Feedback', 'Show'];

function sheet_() {
  const props = PropertiesService.getScriptProperties();
  const id = props.getProperty('SHEET_ID');
  if (id) return SpreadsheetApp.openById(id).getSheetByName(SHEET_NAME);
  const ss = SpreadsheetApp.create("Oreok's thumbnail feedback");
  props.setProperty('SHEET_ID', ss.getId());
  const sh = ss.getSheets()[0];
  sh.setName(SHEET_NAME);
  sh.appendRow(HEADERS);
  sh.setFrozenRows(1);
  sh.getRange('F2:F1000').insertCheckboxes();
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Text from the website, made safe for a spreadsheet cell.
function clean_(s, max) {
  let t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
  if (/^[=+\-@]/.test(t)) t = "'" + t;   // stop it being read as a formula
  return t;
}

function doGet() {
  const rows = sheet_().getDataRange().getValues().slice(1);
  const out = rows
    .filter(r => r[4] !== '' && r[5] !== false && String(r[5]).toUpperCase() !== 'FALSE')
    .map(r => ({
      date: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      name: String(r[1]).replace(/^'/, '').slice(0, 40),
      stars: Math.max(1, Math.min(5, Number(r[2]) || 5)),
      thumbnail: String(r[3]).replace(/^'/, '').slice(0, 60),
      text: String(r[4]).replace(/^'/, '').slice(0, 500),
    }))
    .reverse()
    .slice(0, 100);
  return json_({ ok: true, reviews: out });
}

function doPost(e) {
  let d = {};
  try { d = JSON.parse(e.postData.contents); } catch (err) { d = (e && e.parameter) || {}; }
  if (d.website) return json_({ ok: true });            // hidden spam-trap field was filled in

  const name = clean_(d.name, 40);
  const text = clean_(d.text, 500);
  const thumb = clean_(d.thumbnail, 60);
  const stars = Math.round(Number(d.stars));
  if (!name || !text || !(stars >= 1 && stars <= 5)) return json_({ ok: false, error: 'missing' });

  // flood guard: at most 30 reviews an hour
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('count') || 0);
  if (n >= 30) return json_({ ok: false, error: 'busy' });
  cache.put('count', String(n + 1), 3600);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sh = sheet_();
    sh.appendRow([new Date(), name, stars, thumb, text, true]);
    sh.getRange(sh.getLastRow(), 6).insertCheckboxes().check();
  } finally {
    lock.releaseLock();
  }
  return json_({ ok: true });
}

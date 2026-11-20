/**
 * LINE 開展隊紀錄與彙整建立平台 — Google Apps Script 後端
 * 貼到 Google 試算表的「擴充功能 → Apps Script」。第一次和每次更新程式後執行一次 setup()，再「部署 → 管理部署作業 → 建立新版本」。
 */

const CONFIG = {
  CHANNEL_ID: '2012412693',          // LINE Developers → LINE Login channel → Basic settings 的 Channel ID
  TZ: 'Asia/Taipei',
  PHOTO_FOLDER: '開展隊照片',         // 記名卡片的照片存在雲端硬碟這個資料夾
};

const SH = { PEOPLE: '使用者', TEAMS: '開展隊', MEMBERS: '隊員', SESSIONS: '時段', COUNTS: '計數', CARDS: '名單卡', ADMINS: '管理員' };
const HEADERS = {
  '使用者': ['LINE userId', '姓名', 'LINE名稱', '更新時間'],
  '開展隊': ['隊代碼', '名稱', '說明', '開始日', '結束日', '色調', '邀請碼', '開放加入', '建立者', '建立時間'],
  '隊員': ['隊代碼', 'LINE userId', '姓名', '職稱', '權限', '加入時間'],
  '時段': ['時段代碼', '隊代碼', '名稱', '日期', '開始', '結束', '地點', '計數項目', '建立者 userId', '建立者', '建立時間', '備註'],
  '計數': ['時段代碼', '隊代碼', 'LINE userId', '計數', '加入時間', '更新時間'],
  '名單卡': ['卡片代碼', '隊代碼', '時段代碼', '開展者 userId', '開展者', '姓名', '身分', '年齡段', '手機', 'LINE ID', '地址', '敞開程度', '照片',
    '福', '家', '排', '區', '迫切代禱', '備註', '建立時間', '更新時間'],
  '管理員': ['LINE userId', '名稱'],
};
const TM = { ID: 0, TITLE: 1, DESC: 2, START: 3, END: 4, THEME: 5, CODE: 6, OPEN: 7, CREATOR: 8, CREATED: 9 };
const MB = { TID: 0, UID: 1, NAME: 2, TITLE: 3, PERMS: 4, JOINED: 5 };
const SS = { ID: 0, TID: 1, TITLE: 2, DATE: 3, START: 4, END: 5, PLACE: 6, ITEMS: 7, CUID: 8, CNAME: 9, CREATED: 10, NOTE: 11 };
const CT = { SID: 0, TID: 1, UID: 2, COUNTS: 3, JOINED: 4, UPDATED: 5 };
const CD = { ID: 0, TID: 1, SID: 2, UID: 3, UNAME: 4, NAME: 5, GENDER: 6, AGE: 7, PHONE: 8, LINEID: 9, ADDR: 10, OPEN: 11, PHOTOS: 12,
  FU: 13, JIA: 14, PAI: 15, QU: 16, URGENT: 17, NOTE: 18, CREATED: 19, UPDATED: 20 };

/** 計數項目（順序就是畫面上的順序） */
const ITEMS = ['contact', 'visit', 'tract', 'preach', 'call', 'valid'];
/** 權限：manage＝管理隊員與開展隊設定、session＝建立開展時段、contacts＝看所有人記名卡片的聯絡資料、editAll＝編輯／刪除別人的記名卡片 */
const PERMS = ['manage', 'session', 'contacts', 'editAll'];
const GENDERS = ['男', '女'];
const AGES = ['年長', '中壯', '青壯', '青職', '大學', '中學', '兒童'];
const OPENS = ['A', 'B', 'C'];
const THEMES = ['gospel', 'classic', 'sky', 'harvest', 'dawn', 'youth', 'kids', 'service'];

/** 建立工作表、補齊標題列。更新程式後再執行一次也安全 */
function setup() {
  const ss = SpreadsheetApp.getActive();
  ss.setSpreadsheetTimeZone(CONFIG.TZ);
  Object.keys(HEADERS).forEach(name => {
    const sh = ss.getSheetByName(name) || ss.insertSheet(name);
    const h = HEADERS[name];
    sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold');
    sh.setFrozenRows(1);
  });
  ['D:D', 'E:E', 'G:G'].forEach(c => sheet(SH.TEAMS).getRange(c).setNumberFormat('@'));
  ['D:D', 'E:E', 'F:F'].forEach(c => sheet(SH.SESSIONS).getRange(c).setNumberFormat('@'));
  ['I:I', 'J:J'].forEach(c => sheet(SH.CARDS).getRange(c).setNumberFormat('@')); // 手機、LINE ID 保留開頭的 0
  const def = ss.getSheetByName('工作表1') || ss.getSheetByName('Sheet1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  sessionSheet();
  photoFolder();
  try { addFirstAdmin(); } catch (e) { Logger.log(e.message); }
}

function doGet() { return json({ ok: true, msg: 'LINE 開展隊紀錄與彙整建立平台運作中' }); }

function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const user = req.session && req.action !== 'session' ? userFromSession(req.session) : verifyIdToken(req.idToken);
    const T = () => requireMember(user, req.teamId);
    switch (req.action) {
      case 'session':       out = { ok: true, ...createSession(user) }; break;
      case 'home':          out = { ok: true, me: meOf(user), teams: listTeams(user) }; break;
      case 'saveProfile':   out = { ok: true, profile: saveProfile(user, req.name) }; break;
      case 'myData':        out = { ok: true, ...myData(user) }; break;
      case 'deleteMyData':  out = { ok: true, ...deleteMyData(user) }; break;
      case 'uploadImage':   out = { ok: true, url: uploadImage(user, req.data, req.mime) }; break;
      // 開展隊：任何人都能建立，建立者就是這個隊的負責人
      case 'createTeam':    out = { ok: true, team: createTeam(user, req.team || {}, req.name) }; break;
      case 'invite':        out = { ok: true, ...invitePreview(user, req.code) }; break;
      case 'joinTeam':      out = { ok: true, ...joinTeam(user, req.code, req.name) }; break;
      case 'team':          out = { ok: true, ...teamPayload(user, T()) }; break;
      case 'updateTeam':    need(T(), 'manage'); out = { ok: true, team: updateTeam(req.teamId, req.team || {}) }; break;
      case 'resetInvite':   need(T(), 'manage'); out = { ok: true, team: resetInvite(req.teamId) }; break;
      case 'deleteTeam':    needOwner(T()); deleteTeam(req.teamId); out = { ok: true }; break;
      // 後台：建立者管理自己建立的開展隊；平台管理員管理全部
      case 'adminTeams':    out = { ok: true, ...adminTeams(user) }; break;
      case 'adminUpdate':   needTeamAdmin(user, req.teamId); out = { ok: true, team: updateTeam(req.teamId, req.team || {}) }; break;
      case 'adminSetOpen':  (req.teamIds || []).forEach(id => { needTeamAdmin(user, id); setTeamOpen(id, !!req.open); }); out = { ok: true, ...adminTeams(user) }; break;
      case 'adminDelete':   (req.teamIds || []).forEach(id => needTeamAdmin(user, id)); (req.teamIds || []).forEach(id => deleteTeam(id)); out = { ok: true, ...adminTeams(user) }; break;
      case 'setMember':     need(T(), 'manage'); setMember(T(), req.userId, req.title, req.perms); out = { ok: true, ...teamPayload(user, T()) }; break;
      case 'removeMember':  need(T(), 'manage'); removeMember(T(), req.userId); out = { ok: true, ...teamPayload(user, T()) }; break;
      case 'leaveTeam':     leaveTeam(T()); out = { ok: true }; break;
      // 開展時段
      case 'createSession': need(T(), 'session'); out = { ok: true, sessionId: createSessionRow(T(), req.ses || {}) }; break;
      case 'createSessions': need(T(), 'session'); out = { ok: true, ids: createSessionRows(T(), req.ses || {}, req.slots) }; break;
      case 'updateSession': updateSession(T(), req.sessionId, req.ses || {}); out = { ok: true }; break;
      case 'deleteSession': deleteSessionRow(T(), req.sessionId); out = { ok: true }; break;
      case 'joinSession':   joinSession(T(), req.sessionId); out = { ok: true }; break;
      case 'leaveSession':  leaveSession(T(), req.sessionId); out = { ok: true }; break;
      case 'saveCounts':    out = { ok: true, counts: saveCounts(T(), req.sessionId, req.counts) }; break;
      // 記名卡片
      case 'saveCard':      out = { ok: true, card: saveCard(T(), req.card || {}) }; break;
      case 'setCardFlags':  out = { ok: true, card: setCardFlags(T(), req.cardId, req.flags || {}) }; break;
      case 'deleteCard':    deleteCard(T(), req.cardId); out = { ok: true }; break;
      default: throw new Error('未知的動作');
    }
  } catch (err) {
    out = { ok: false, error: String((err && err.message) || err) };
  }
  return json(out);
}

function json(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/* ---------- 平台通行證：登入一次，60 天內不用再登入（存在隱藏的「登入」工作表） ---------- */
const SESSION_SHEET = '登入';
const SESSION_DAYS = 60;
function sessionSheet() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SESSION_SHEET);
  if (!sh) { sh = ss.insertSheet(SESSION_SHEET); sh.appendRow(['通行證', 'LINE userId', 'LINE名稱', '到期', '建立']); sh.setFrozenRows(1); sh.hideSheet(); }
  return sh;
}
function createSession(user) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  const now = new Date(), exp = new Date(now.getTime() + SESSION_DAYS * 864e5);
  withLock(() => {
    const sh = sessionSheet(), data = sh.getDataRange().getValues();
    for (let i = data.length - 1; i >= 1; i--) if (data[i][3] instanceof Date && data[i][3] < now) sh.deleteRow(i + 1);
    sh.appendRow([token, user.userId, user.displayName, exp, now]);
  });
  return { token, expires: exp.getTime() };
}
function userFromSession(token) {
  const cache = CacheService.getScriptCache(), key = 'ss:' + String(token).slice(0, 60);
  const hit = cache.get(key);
  if (hit) { const u = JSON.parse(hit); if (u.exp > Date.now()) return { userId: u.userId, displayName: u.displayName }; }
  const data = sessionSheet().getDataRange().getValues(), now = new Date();
  for (let i = 1; i < data.length; i++) if (data[i][0] === token && data[i][3] instanceof Date && data[i][3] > now) {
    const u = { userId: String(data[i][1]), displayName: String(data[i][2]) };
    cache.put(key, JSON.stringify(Object.assign({ exp: data[i][3].getTime() }, u)), 21600);
    return u;
  }
  throw new Error('SESSION_EXPIRED');
}
function deleteSessionsOf(uid) {
  const sh = sessionSheet(), data = sh.getDataRange().getValues(), cache = CacheService.getScriptCache();
  for (let i = data.length - 1; i >= 1; i--) if (String(data[i][1]) === uid) { cache.remove('ss:' + String(data[i][0]).slice(0, 60)); sh.deleteRow(i + 1); }
}
/** 向 LINE 驗證 ID token，防止有人偽造身分 */
function verifyIdToken(idToken) {
  if (!idToken) throw new Error('缺少登入資訊，請在 LINE 中重新開啟');
  const res = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', { method: 'post', payload: { id_token: idToken, client_id: CONFIG.CHANNEL_ID }, muteHttpExceptions: true });
  const d = JSON.parse(res.getContentText());
  if (res.getResponseCode() !== 200) {
    const m = d.error_description || '驗證失敗';
    throw new Error(/expired/i.test(m) ? 'TOKEN_EXPIRED' : 'LINE 身分驗證失敗：' + m);
  }
  return { userId: d.sub, displayName: d.name || '' };
}

/* ---------- 工具 ---------- */
function sheet(name) { return SpreadsheetApp.getActive().getSheetByName(name); }
function rows(name) { const v = sheet(name).getDataRange().getValues(); v.shift(); return v; }
function fmt(d, p) { return Utilities.formatDate(d, CONFIG.TZ, p || 'yyyy/MM/dd HH:mm'); }
function parseJson(s, fb) { try { return JSON.parse(s); } catch (e) { return fb; } }
function isTrue(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function withLock(fn) { const l = LockService.getScriptLock(); l.waitLock(15000); try { return fn(); } finally { l.releaseLock(); } }
function str(v, n) { return String(v == null ? '' : v).trim().slice(0, n || 200); }
function ymdOf(v) { if (v instanceof Date) return fmt(v, 'yyyy-MM-dd'); const s = str(v, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''; }
function hhmm(v) { const s = v instanceof Date ? fmt(v, 'HH:mm') : str(v, 5); return /^\d{2}:\d{2}$/.test(s) ? s : ''; }
function timeStr(v) { return v instanceof Date ? fmt(v, 'yyyy/M/d HH:mm') : String(v || ''); }
function newId(prefix) { return prefix + fmt(new Date(), 'yyMMddHHmmss') + Math.floor(Math.random() * 900 + 100); }
function deleteRowsWhere(name, test) {
  const sh = sheet(name), data = sh.getDataRange().getValues();
  let n = 0;
  for (let i = data.length - 1; i >= 1; i--) if (test(data[i])) { sh.deleteRow(i + 1); n++; }
  return n;
}
function findRow(name, col, id) {
  const data = sheet(name).getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (String(data[i][col]) === String(id)) return { row: i + 1, r: data[i] };
  return null;
}

/* ---------- 平台管理員（總管理人）：可以看、管理所有開展隊 ---------- */
let ADMIN_IDS = null;
function isAdmin(uid) { if (!ADMIN_IDS) ADMIN_IDS = rows(SH.ADMINS).map(r => String(r[0]).trim()); return ADMIN_IDS.indexOf(uid) >= 0; }

/* ---------- 使用者 ---------- */
function findPerson(uid) { return findRow(SH.PEOPLE, 0, uid); }
function nameOf(uid) { const f = findPerson(uid); return f ? String(f.r[1]) : ''; }
function meOf(user) { return { userId: user.userId, displayName: user.displayName, name: nameOf(user.userId), isAdmin: isAdmin(user.userId) }; }
function saveProfile(user, name) {
  const nm = str(name, 20);
  if (!nm) throw new Error('請填寫姓名');
  return withLock(() => {
    const f = findPerson(user.userId), row = [user.userId, nm, user.displayName, new Date()];
    if (f) sheet(SH.PEOPLE).getRange(f.row, 1, 1, row.length).setValues([row]);
    else sheet(SH.PEOPLE).appendRow(row);
    // 隊員名單上的名字一起更新
    const sh = sheet(SH.MEMBERS), data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) if (String(data[i][MB.UID]) === user.userId) sh.getRange(i + 1, MB.NAME + 1).setValue(nm);
    return { name: nm };
  });
}

/* ---------- 開展隊 ---------- */
function inviteCode() { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 8; i++) s += c.charAt(Math.floor(Math.random() * c.length)); return s; }
function ownerOf(r) { const m = /\((U[0-9a-f]+)\)\s*$/.exec(String(r[TM.CREATOR] || '')); return m ? m[1] : ''; }
function rowToTeam(r) {
  return { id: String(r[TM.ID]), title: String(r[TM.TITLE]), desc: String(r[TM.DESC] || ''), start: ymdOf(r[TM.START]), end: ymdOf(r[TM.END]),
    theme: THEMES.indexOf(String(r[TM.THEME])) >= 0 ? String(r[TM.THEME]) : 'gospel', code: String(r[TM.CODE] || ''), open: isTrue(r[TM.OPEN]),
    ownerId: ownerOf(r), owner: String(r[TM.CREATOR] || '').replace(/\s*\(U[0-9a-f]+\)\s*$/, ''), created: r[TM.CREATED] instanceof Date ? fmt(r[TM.CREATED], 'yyyy/M/d') : '' };
}
function findTeam(id) { const f = findRow(SH.TEAMS, TM.ID, id); if (!f) throw new Error('找不到這個開展隊，可能已經被刪除'); return f; }
function teamValues(input) {
  const title = str(input.title, 40);
  if (!title) throw new Error('請填寫開展隊名稱');
  return [title, str(input.desc, 300), ymdOf(input.start), ymdOf(input.end), THEMES.indexOf(input.theme) >= 0 ? input.theme : 'gospel'];
}
function createTeam(user, input, myName) {
  if (myName) saveProfile(user, myName);
  const nm = nameOf(user.userId) || user.displayName;
  const v = teamValues(input), id = newId('T');
  withLock(() => {
    sheet(SH.TEAMS).appendRow([id].concat(v, [inviteCode(), true, nm + ' (' + user.userId + ')', new Date()]));
    sheet(SH.MEMBERS).appendRow([id, user.userId, nm, str(input.myTitle, 12) || '隊長', 'owner', new Date()]);
  });
  return rowToTeam(findTeam(id).r);
}
function updateTeam(id, input) {
  const v = teamValues(input), f = findTeam(id);
  sheet(SH.TEAMS).getRange(f.row, 2, 1, v.length).setValues([v]);
  if (input.open != null) sheet(SH.TEAMS).getRange(f.row, TM.OPEN + 1).setValue(!!input.open);
  return rowToTeam(findTeam(id).r);
}
function resetInvite(id) { const f = findTeam(id); sheet(SH.TEAMS).getRange(f.row, TM.CODE + 1).setValue(inviteCode()); return rowToTeam(findTeam(id).r); }
function deleteTeam(id) {
  withLock(() => {
    sheet(SH.TEAMS).deleteRow(findTeam(id).row);
    deleteRowsWhere(SH.MEMBERS, r => String(r[MB.TID]) === id);
    deleteRowsWhere(SH.SESSIONS, r => String(r[SS.TID]) === id);
    deleteRowsWhere(SH.COUNTS, r => String(r[CT.TID]) === id);
    deleteRowsWhere(SH.CARDS, r => String(r[CD.TID]) === id);
  });
}

/* ---------- 隊員與權限 ---------- */
function parsePerms(v) {
  const s = String(v || '');
  if (s === 'owner') return { owner: true, manage: true, session: true, contacts: true, editAll: true };
  const out = { owner: false };
  PERMS.forEach(p => { out[p] = s.split(',').indexOf(p) >= 0; });
  return out;
}
function permsStr(p) { return PERMS.filter(k => p && p[k]).join(','); }
function memberRows(tid) { return rows(SH.MEMBERS).filter(r => String(r[MB.TID]) === String(tid)); }
/** 確認是隊員（平台管理員視同負責人），回傳 { tid, team, uid, name, perms } */
function requireMember(user, tid) {
  if (!tid) throw new Error('缺少開展隊代碼');
  const team = rowToTeam(findTeam(tid).r);
  const m = memberRows(tid).filter(r => String(r[MB.UID]) === user.userId)[0];
  if (!m && !isAdmin(user.userId)) throw new Error('NOT_MEMBER');
  const perms = m ? parsePerms(m[MB.PERMS]) : parsePerms('owner');
  if (isAdmin(user.userId)) PERMS.forEach(p => { perms[p] = true; });
  return { tid: String(tid), team, uid: user.userId, name: (m && String(m[MB.NAME])) || nameOf(user.userId) || user.displayName, perms, member: !!m };
}
function need(ctx, perm) { if (!ctx.perms[perm]) throw new Error('你沒有這個權限，請找開展隊負責人設定'); }
function needOwner(ctx) { if (!ctx.perms.owner && !isAdmin(ctx.uid)) throw new Error('只有建立這個開展隊的人可以刪除'); }
function invitePreview(user, code) {
  const t = rows(SH.TEAMS).map(rowToTeam).filter(x => x.code && x.code === str(code, 20).toUpperCase())[0];
  if (!t) throw new Error('邀請連結已失效，請向負責人索取新的連結');
  const mem = memberRows(t.id);
  return { team: { id: t.id, title: t.title, desc: t.desc, start: t.start, end: t.end, theme: t.theme, owner: t.owner, open: t.open },
    memberCount: mem.length, already: mem.some(r => String(r[MB.UID]) === user.userId), name: nameOf(user.userId) };
}
function joinTeam(user, code, name) {
  const pv = invitePreview(user, code);
  if (pv.already) return { teamId: pv.team.id };
  if (!pv.team.open) throw new Error('這個開展隊目前不開放加入');
  if (name) saveProfile(user, name);
  const nm = nameOf(user.userId);
  if (!nm) throw new Error('請填寫姓名');
  withLock(() => {
    if (!memberRows(pv.team.id).some(r => String(r[MB.UID]) === user.userId)) sheet(SH.MEMBERS).appendRow([pv.team.id, user.userId, nm, '隊員', 'session', new Date()]);
  });
  return { teamId: pv.team.id };
}
function setMember(ctx, uid, title, perms) {
  withLock(() => {
    const sh = sheet(SH.MEMBERS), data = sh.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][MB.TID]) !== ctx.tid || String(data[i][MB.UID]) !== String(uid)) continue;
      if (title != null) sh.getRange(i + 1, MB.TITLE + 1).setValue(str(title, 12));
      if (perms && String(data[i][MB.PERMS]) !== 'owner') sh.getRange(i + 1, MB.PERMS + 1).setValue(permsStr(perms));
      return;
    }
    throw new Error('找不到這位隊員');
  });
}
function removeMember(ctx, uid) {
  if (String(uid) === ctx.team.ownerId) throw new Error('不能移除建立開展隊的人');
  withLock(() => deleteRowsWhere(SH.MEMBERS, r => String(r[MB.TID]) === ctx.tid && String(r[MB.UID]) === String(uid)));
}
function leaveTeam(ctx) {
  if (ctx.perms.owner && ctx.member) throw new Error('你是建立者，不能退出；不再使用可以刪除開展隊');
  withLock(() => deleteRowsWhere(SH.MEMBERS, r => String(r[MB.TID]) === ctx.tid && String(r[MB.UID]) === ctx.uid));
}

/* ---------- 開展時段 ---------- */
function cleanItems(list) { const a = (Array.isArray(list) ? list : []).filter(k => ITEMS.indexOf(k) >= 0); return ITEMS.filter(k => a.indexOf(k) >= 0); }
function sessionValues(input) {
  const date = ymdOf(input.date);
  if (!date) throw new Error('請選擇日期');
  const items = cleanItems(input.items);
  if (!items.length) throw new Error('至少勾選一個計數項目');
  return [str(input.title, 40), date, hhmm(input.start), hhmm(input.end), str(input.place, 80), JSON.stringify(items)];
}
function findSession(ctx, sid) {
  const f = findRow(SH.SESSIONS, SS.ID, sid);
  if (!f || String(f.r[SS.TID]) !== ctx.tid) throw new Error('找不到這個開展時段，可能已經被刪除');
  return f;
}
function canEditSession(ctx, f) { return ctx.perms.manage || String(f.r[SS.CUID]) === ctx.uid; }
function createSessionRow(ctx, input) {
  const v = sessionValues(input), id = newId('S'), now = new Date();
  withLock(() => {
    sheet(SH.SESSIONS).appendRow([id, ctx.tid].concat(v, [ctx.uid, ctx.name, now, str(input.note, 300)]));
    sheet(SH.COUNTS).appendRow([id, ctx.tid, ctx.uid, '{}', now, now]); // 建立者自動加入
  });
  return id;
}
/** 一次建立多個時段（批次／重複），最多 60 個；共用名稱、地點、計數項目、備註 */
function createSessionRows(ctx, base, slots) {
  slots = (Array.isArray(slots) ? slots : []).slice(0, 61);
  if (!slots.length) throw new Error('請選擇日期');
  if (slots.length > 60) throw new Error('一次最多建立 60 個時段');
  const rowsS = [], rowsC = [], ids = [], now = new Date();
  slots.forEach((sl, i) => {
    const v = sessionValues(Object.assign({}, base, { date: sl.date, start: sl.start, end: sl.end }));
    const id = 'S' + fmt(now, 'yyMMddHHmmss') + String(100 + i) + Math.floor(Math.random() * 90 + 10);
    ids.push(id);
    rowsS.push([id, ctx.tid].concat(v, [ctx.uid, ctx.name, now, str(base.note, 300)]));
    rowsC.push([id, ctx.tid, ctx.uid, '{}', now, now]);
  });
  withLock(() => {
    const ss = sheet(SH.SESSIONS), cs = sheet(SH.COUNTS);
    ss.getRange(ss.getLastRow() + 1, 1, rowsS.length, rowsS[0].length).setValues(rowsS);
    cs.getRange(cs.getLastRow() + 1, 1, rowsC.length, rowsC[0].length).setValues(rowsC);
  });
  return ids;
}
function updateSession(ctx, sid, input) {
  const f = findSession(ctx, sid);
  if (!canEditSession(ctx, f)) throw new Error('只有建立這個時段的人可以修改');
  const v = sessionValues(input);
  sheet(SH.SESSIONS).getRange(f.row, SS.TITLE + 1, 1, v.length).setValues([v]);
  sheet(SH.SESSIONS).getRange(f.row, SS.NOTE + 1).setValue(str(input.note, 300));
}
function deleteSessionRow(ctx, sid) {
  const f = findSession(ctx, sid);
  if (!canEditSession(ctx, f)) throw new Error('只有建立這個時段的人可以刪除');
  withLock(() => {
    sheet(SH.SESSIONS).deleteRow(findSession(ctx, sid).row);
    deleteRowsWhere(SH.COUNTS, r => String(r[CT.SID]) === sid);
    deleteRowsWhere(SH.CARDS, r => String(r[CD.SID]) === sid);
  });
}
function joinSession(ctx, sid) {
  findSession(ctx, sid);
  withLock(() => {
    if (!rows(SH.COUNTS).some(r => String(r[CT.SID]) === sid && String(r[CT.UID]) === ctx.uid)) sheet(SH.COUNTS).appendRow([sid, ctx.tid, ctx.uid, '{}', new Date(), new Date()]);
  });
}
function leaveSession(ctx, sid) {
  findSession(ctx, sid);
  if (rows(SH.CARDS).some(r => String(r[CD.SID]) === sid && String(r[CD.UID]) === ctx.uid)) throw new Error('你在這個時段還有記名卡片，請先刪除卡片再退出');
  withLock(() => deleteRowsWhere(SH.COUNTS, r => String(r[CT.SID]) === sid && String(r[CT.UID]) === ctx.uid));
}
function saveCounts(ctx, sid, counts) {
  const f = findSession(ctx, sid), items = parseJson(f.r[SS.ITEMS], ITEMS) || ITEMS, clean = {};
  ITEMS.forEach(k => { const n = Math.floor(Number(counts && counts[k])); if (n > 0) clean[k] = Math.min(n, 99999); });
  return withLock(() => {
    const sh = sheet(SH.COUNTS), data = sh.getDataRange().getValues(), now = new Date();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][CT.SID]) === sid && String(data[i][CT.UID]) === ctx.uid) {
        sh.getRange(i + 1, CT.COUNTS + 1).setValue(JSON.stringify(clean));
        sh.getRange(i + 1, CT.UPDATED + 1).setValue(now);
        return clean;
      }
    }
    sh.appendRow([sid, ctx.tid, ctx.uid, JSON.stringify(clean), now, now]); // 還沒加入就直接加入
    return clean;
  });
}

/* ---------- 記名卡片 ---------- */
const FLAGS = ['fu', 'jia', 'pai', 'qu'];
const FLAG_COL = { fu: CD.FU, jia: CD.JIA, pai: CD.PAI, qu: CD.QU };
function rowToCard(r) {
  return { id: String(r[CD.ID]), sessionId: String(r[CD.SID]), ownerId: String(r[CD.UID]), owner: String(r[CD.UNAME]),
    name: String(r[CD.NAME] || ''), gender: String(r[CD.GENDER] || ''), age: String(r[CD.AGE] || ''), phone: String(r[CD.PHONE] || ''),
    lineId: String(r[CD.LINEID] || ''), address: String(r[CD.ADDR] || ''), open: String(r[CD.OPEN] || ''),
    photos: String(r[CD.PHOTOS] || '').split(/\s+/).filter(u => /^https:\/\//.test(u)),
    fu: isTrue(r[CD.FU]), jia: isTrue(r[CD.JIA]), pai: isTrue(r[CD.PAI]), qu: isTrue(r[CD.QU]), urgent: isTrue(r[CD.URGENT]),
    note: String(r[CD.NOTE] || ''), created: timeStr(r[CD.CREATED]), updated: timeStr(r[CD.UPDATED]) };
}
function canEditCard(ctx, r) { return String(r[CD.UID]) === ctx.uid || ctx.perms.editAll || ctx.perms.manage; }
function cardValues(c) {
  const pick = (v, list) => list.indexOf(String(v || '')) >= 0 ? String(v) : '';
  const photos = (Array.isArray(c.photos) ? c.photos : []).filter(u => /^https:\/\/lh3\.googleusercontent\.com\//.test(u)).slice(0, 3);
  return [str(c.name, 30), pick(c.gender, GENDERS), pick(c.age, AGES), str(c.phone, 30), str(c.lineId, 40), str(c.address, 120), pick(c.open, OPENS), photos.join(' '),
    !!c.fu, !!c.jia, !!c.pai, !!c.qu, !!c.urgent, str(c.note, 300)];
}
function saveCard(ctx, c) {
  const v = cardValues(c), now = new Date();
  if (!v.slice(0, 7).some(x => x) && !v[7]) throw new Error('至少填一個欄位再儲存');
  return withLock(() => {
    const sh = sheet(SH.CARDS);
    if (c.id) {
      const f = findRow(SH.CARDS, CD.ID, c.id);
      if (!f || String(f.r[CD.TID]) !== ctx.tid) throw new Error('找不到這張記名卡片，可能已經被刪除');
      if (!canEditCard(ctx, f.r)) throw new Error('只能修改自己記的名單');
      sh.getRange(f.row, CD.NAME + 1, 1, v.length).setValues([v]);
      sh.getRange(f.row, CD.UPDATED + 1).setValue(now);
      return rowToCard(sh.getRange(f.row, 1, 1, HEADERS['名單卡'].length).getValues()[0]);
    }
    findSession(ctx, c.sessionId);
    if (!rows(SH.COUNTS).some(r => String(r[CT.SID]) === c.sessionId && String(r[CT.UID]) === ctx.uid)) sh.getParent().getSheetByName(SH.COUNTS).appendRow([c.sessionId, ctx.tid, ctx.uid, '{}', now, now]);
    const row = [newId('C'), ctx.tid, c.sessionId, ctx.uid, ctx.name].concat(v, [now, now]);
    sh.appendRow(row);
    return rowToCard(row);
  });
}
function setCardFlags(ctx, id, flags) {
  return withLock(() => {
    const f = findRow(SH.CARDS, CD.ID, id), sh = sheet(SH.CARDS);
    if (!f || String(f.r[CD.TID]) !== ctx.tid) throw new Error('找不到這張記名卡片');
    if (!canEditCard(ctx, f.r)) throw new Error('只能修改自己記的名單');
    FLAGS.forEach(k => { if (flags[k] != null) sh.getRange(f.row, FLAG_COL[k] + 1).setValue(!!flags[k]); });
    if (flags.urgent != null) sh.getRange(f.row, CD.URGENT + 1).setValue(!!flags.urgent);
    sh.getRange(f.row, CD.UPDATED + 1).setValue(new Date());
    return rowToCard(sh.getRange(f.row, 1, 1, HEADERS['名單卡'].length).getValues()[0]);
  });
}
function deleteCard(ctx, id) {
  withLock(() => {
    const f = findRow(SH.CARDS, CD.ID, id);
    if (!f || String(f.r[CD.TID]) !== ctx.tid) throw new Error('找不到這張記名卡片，可能已經被刪除');
    if (!canEditCard(ctx, f.r)) throw new Error('只能刪除自己記的名單');
    sheet(SH.CARDS).deleteRow(f.row);
  });
}

/* ---------- 一次拿到開展隊的全部資料（彙整、代禱牆都在前端算） ---------- */
function teamPayload(user, ctx) {
  const names = {};
  rows(SH.PEOPLE).forEach(r => { names[String(r[0])] = String(r[1]); });
  const members = memberRows(ctx.tid).map(r => {
    const p = parsePerms(r[MB.PERMS]);
    return { userId: String(r[MB.UID]), name: names[String(r[MB.UID])] || String(r[MB.NAME]), title: String(r[MB.TITLE] || ''), perms: p, joined: timeStr(r[MB.JOINED]) };
  });
  const counts = rows(SH.COUNTS).filter(r => String(r[CT.TID]) === ctx.tid);
  const sessions = rows(SH.SESSIONS).filter(r => String(r[SS.TID]) === ctx.tid).map(r => {
    const sid = String(r[SS.ID]);
    return { id: sid, title: String(r[SS.TITLE] || ''), date: ymdOf(r[SS.DATE]), start: hhmm(r[SS.START]), end: hhmm(r[SS.END]), place: String(r[SS.PLACE] || ''),
      items: cleanItems(parseJson(r[SS.ITEMS], ITEMS)), creatorId: String(r[SS.CUID]), creator: names[String(r[SS.CUID])] || String(r[SS.CNAME]),
      created: timeStr(r[SS.CREATED]), note: String(r[SS.NOTE] || ''),
      parts: counts.filter(c => String(c[CT.SID]) === sid).map(c => ({ userId: String(c[CT.UID]), name: names[String(c[CT.UID])] || '', counts: parseJson(c[CT.COUNTS], {}) || {}, updated: timeStr(c[CT.UPDATED]) })) };
  });
  // 沒有「看聯絡資料」權限的人：別人卡片上的手機、LINE ID、地址、照片、備註不送到手機上
  const cards = rows(SH.CARDS).filter(r => String(r[CD.TID]) === ctx.tid).map(r => {
    const c = rowToCard(r);
    c.owner = names[c.ownerId] || c.owner;
    c.canEdit = canEditCard(ctx, r);
    if (!ctx.perms.contacts && c.ownerId !== ctx.uid) { c.phone = c.lineId = c.address = c.note = ''; c.photos = []; c.hidden = true; }
    return c;
  });
  const team = ctx.team;
  if (!ctx.perms.manage) team.code = ctx.team.open ? team.code : '';
  return { team, me: { userId: ctx.uid, name: ctx.name, perms: ctx.perms, member: ctx.member, isAdmin: isAdmin(ctx.uid) }, members, sessions, cards };
}

/** 後台：建立者看自己建立的，平台管理員看全部 */
function needTeamAdmin(user, id) {
  const t = rowToTeam(findTeam(id).r);
  if (t.ownerId !== user.userId && !isAdmin(user.userId)) throw new Error('只有建立「' + t.title + '」的人或平台管理員可以管理');
  return t;
}
function setTeamOpen(id, open) { const f = findTeam(id); sheet(SH.TEAMS).getRange(f.row, TM.OPEN + 1).setValue(open); }
function adminTeams(user) {
  const admin = isAdmin(user.userId), names = {};
  rows(SH.PEOPLE).forEach(r => { names[String(r[0])] = String(r[1]); });
  const mem = rows(SH.MEMBERS), ses = rows(SH.SESSIONS), cards = rows(SH.CARDS), cnt = rows(SH.COUNTS);
  const teams = rows(SH.TEAMS).map(rowToTeam).filter(t => admin || t.ownerId === user.userId).map(t => {
    const ss = ses.filter(r => String(r[SS.TID]) === t.id).map(r => ymdOf(r[SS.DATE])).sort();
    return { id: t.id, title: t.title, desc: t.desc, start: t.start, end: t.end, theme: t.theme, open: t.open, code: t.code,
      owner: names[t.ownerId] || t.owner, mine: t.ownerId === user.userId, created: t.created,
      member: mem.some(r => String(r[MB.TID]) === t.id && String(r[MB.UID]) === user.userId),
      memberCount: mem.filter(r => String(r[MB.TID]) === t.id).length, sessionCount: ss.length, lastDate: ss[ss.length - 1] || '',
      cardCount: cards.filter(r => String(r[CD.TID]) === t.id).length, partCount: cnt.filter(r => String(r[CT.TID]) === t.id).length };
  }).reverse();
  return { isAdmin: admin, teams };
}

function listTeams(user) {
  const admin = isAdmin(user.userId), mem = rows(SH.MEMBERS), ses = rows(SH.SESSIONS), cards = rows(SH.CARDS);
  return rows(SH.TEAMS).map(rowToTeam).map(t => {
    const m = mem.filter(r => String(r[MB.TID]) === t.id), mine = m.filter(r => String(r[MB.UID]) === user.userId)[0];
    if (!mine) return null; // 首頁只列自己加入的；平台管理員在「後台」看全部
    const ss = ses.filter(r => String(r[SS.TID]) === t.id).map(r => ymdOf(r[SS.DATE])).sort();
    return { id: t.id, title: t.title, desc: t.desc, start: t.start, end: t.end, theme: t.theme, owner: t.owner,
      member: !!mine, title2: mine ? String(mine[MB.TITLE] || '') : '', role: mine ? (String(mine[MB.PERMS]) === 'owner' ? 'owner' : (parsePerms(mine[MB.PERMS]).manage ? 'admin' : 'member')) : 'platform',
      memberCount: m.length, sessionCount: ss.length, lastDate: ss[ss.length - 1] || '', cardCount: cards.filter(r => String(r[CD.TID]) === t.id).length };
  }).filter(Boolean).reverse();
}

/* ---------- 照片 ---------- */
function photoFolder() { const it = DriveApp.getFoldersByName(CONFIG.PHOTO_FOLDER); return it.hasNext() ? it.next() : DriveApp.createFolder(CONFIG.PHOTO_FOLDER); }
function uploadImage(user, data, mime) {
  mime = /^image\/(jpeg|png)$/.test(mime) ? mime : 'image/jpeg';
  const b64 = String(data || '').replace(/^data:[^,]+,/, '');
  if (!b64) throw new Error('沒有收到照片');
  if (b64.length > 7000000) throw new Error('照片太大，請換一張小一點的');
  const file = photoFolder().createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, 'card-' + fmt(new Date(), 'yyyyMMdd-HHmmss') + '.jpg'));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  file.setDescription('上傳者：' + user.displayName + ' (' + user.userId + ')');
  return 'https://lh3.googleusercontent.com/d/' + file.getId();
}

/* ---------- 我的資料 ---------- */
function myData(user) {
  const f = findPerson(user.userId);
  const teams = rows(SH.MEMBERS).filter(r => String(r[MB.UID]) === user.userId).length;
  const cards = rows(SH.CARDS).filter(r => String(r[CD.UID]) === user.userId).length;
  return { found: !!f, name: f ? String(f.r[1]) : '', lineName: user.displayName, teams, cards };
}
function deleteMyData(user) {
  return withLock(() => {
    const owned = rows(SH.TEAMS).map(rowToTeam).filter(t => t.ownerId === user.userId);
    if (owned.length) throw new Error('你建立的開展隊（' + owned.map(t => t.title).join('、') + '）還在，請先刪除這些開展隊');
    const cards = deleteRowsWhere(SH.CARDS, r => String(r[CD.UID]) === user.userId);
    deleteRowsWhere(SH.COUNTS, r => String(r[CT.UID]) === user.userId);
    deleteRowsWhere(SH.MEMBERS, r => String(r[MB.UID]) === user.userId);
    deleteRowsWhere(SH.PEOPLE, r => String(r[0]) === user.userId);
    deleteSessionsOf(user.userId);
    return { cards };
  });
}

/** 第一次設定用：管理員還沒有人時，把最早從 LINE 登入平台的人設為平台管理員。只有試算表擁有者能在 Apps Script 執行 */
function addFirstAdmin() {
  const adm = sheet(SH.ADMINS);
  if (adm.getLastRow() > 1) { Logger.log('已經有管理員了'); return; }
  const s = rows(SESSION_SHEET)[0];
  if (!s) throw new Error('還沒有人登入過平台，請先從 LINE 打開平台一次');
  const uid = String(s[1]);
  adm.appendRow([uid, nameOf(uid) || String(s[2])]);
  Logger.log('已設為管理員：' + uid);
}

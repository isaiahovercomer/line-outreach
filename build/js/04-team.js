/* ================= 開展隊 ================= */
let TEAM = null;   // { team, me, members, sessions, cards }
let TAB = 'rec';   // rec 開展紀錄｜ses 時段彙整｜all 累積彙整｜pray 代禱牆｜mem 隊員
let SUB = '';      // 開展紀錄裡打開的時段；時段彙整選的時段
const EDIT = {};   // 正在編輯的記名卡片：{ key: 草稿 }
let NEWN = 0;
const busy = () => Object.keys(EDIT).length > 0 || !!CNT.timer || !!document.querySelector('.modal, .member-edit');

const TABS = [
  { k: 'rec', label: '開展紀錄', icon: 'rec' },
  { k: 'ses', label: '時段彙整', icon: 'ses' },
  { k: 'all', label: '累積彙整', icon: 'all' },
  { k: 'pray', label: '代禱牆', icon: 'pray' },
  { k: 'mem', label: '隊員', icon: 'mem' },
];
function setNav(active) {
  const n = $('bnav');
  if (!active) { n.hidden = true; document.body.classList.remove('has-nav'); return; }
  n.hidden = false; document.body.classList.add('has-nav');
  n.setAttribute('style', themeVars(themeOf(TEAM.team)));
  n.innerHTML = `<div class="bn-inner">${TABS.map(t => `<button type="button" data-act="tab" data-k="${t.k}" ${t.k === active ? 'aria-current="page"' : ''}>${ICON[t.icon]}<span>${t.label}</span></button>`).join('')}</div>`;
}

/* ---------- 資料小工具 ---------- */
const sesById = id => TEAM.sessions.find(s => s.id === id);
const partOf = (s, uid) => s.parts.find(p => p.userId === uid);
const cardsIn = (sid, uid) => TEAM.cards.filter(c => c.sessionId === sid && (!uid || c.ownerId === uid));
const memberName = uid => (TEAM.members.find(m => m.userId === uid) || {}).name || '';
/** 一個人在一個時段的某個計數。「有效名單」至少等於他記的卡片張數 */
function countOf(s, p, k) {
  const v = Math.max(0, +(p.counts || {})[k] || 0);
  return k === 'valid' ? Math.max(v, cardsIn(s.id, p.userId).length) : v;
}
const sesTotal = (s, k) => s.parts.reduce((n, p) => n + countOf(s, p, k), 0);
const sortSes = list => list.slice().sort((a, b) => (b.date + b.start).localeCompare(a.date + a.start));
const canEditSes = s => TEAM.me.perms.manage || s.creatorId === TEAM.me.userId;

function urlFor(tab, sub) {
  const q = new URLSearchParams(); if (DEMO) q.set('demo', '');
  q.set('t', TEAM.team.id); if (tab !== 'rec') q.set('tab', tab); if (sub) q.set('s', sub);
  return `${location.pathname}?${q.toString().replace('demo=&', 'demo&')}`;
}

async function teamFlow(tid, tab, sub, joinCode) {
  TAB = tab || 'rec'; SUB = sub || '';
  if (!TEAM || TEAM.team.id !== tid) view(loading());
  const nav = NAV;
  let r;
  try {
    r = await apiCached('team', { teamId: tid }, fresh => { if (nav === NAV || (TEAM && TEAM.team.id === tid && !busy())) { TEAM = fresh; if (!busy()) renderTeam(true); } });
  } catch (e) {
    if (e.message === 'NOT_MEMBER') {
      if (joinCode) return joinFlow(joinCode);
      view(`${subbar('我的開展隊')}<div class="panel"><h2>你還不是這個開展隊的隊員</h2><p class="muted">請向負責人索取邀請連結，點連結就能加入。</p></div>`);
      return;
    }
    throw e;
  }
  TEAM = r;
  renderTeam();
}
async function reloadTeam(keep = true) {
  const r = await api('team', { teamId: TEAM.team.id });
  TEAM = r; renderTeam(keep);
}

function renderTeam(keepScroll) {
  syncDrafts();
  const t = TEAM.team, me = TEAM.me, th = themeOf(t);
  if (SUB && !sesById(SUB)) SUB = '';
  document.title = t.title;
  history.replaceState(null, '', urlFor(TAB, SUB));
  const myTitle = (TEAM.members.find(m => m.userId === me.userId) || {}).title || '';
  const body = { rec: renderRec, ses: renderSesSum, all: renderAll, pray: renderPray, mem: renderMembers }[TAB]();
  view(`<div class="team-wrap" style="${themeVars(th)}">
    <header class="team-top"><a class="back light home-link plat" href="${location.pathname}${DEMO ? '?demo' : ''}" data-act="home" aria-label="回到首頁">‹ <img src="img/logo.svg" alt="" width="12" height="16"> 開展隊記錄彙整代禱平台</a>
      <div class="tt-row">${teamIcon(t, 'tt-img')}<div><h1>${esc(t.title)}</h1><p>${esc(periodLabel(t.start, t.end))}${t.start || t.end ? '・' : ''}${esc(me.name)}${myTitle ? `（${esc(myTitle)}）` : ''}</p></div></div>
      <button class="help" type="button" data-act="tour" aria-label="使用教學">?</button></header>
    ${DEMO ? `<p class="demo-note">預覽模式：目前使用範例資料。</p>` : ''}
    ${body}</div>`, keepScroll);
  setNav(TAB);
  if (TAB === 'mem' && TEAM_EDIT) bindTeamForm(async team => { const r = await api('updateTeam', { teamId: t.id, team }); TEAM.team = { ...TEAM.team, ...r.team }; TEAM_EDIT = false; HOME = null; toast('已儲存'); renderTeam(); });
  maybeStartTour();
}

/* ================= 傳講工具：人生的奧秘 =================
   連到韓國福音書房（KGBR）官方的「人生的奧秘」互動傳講頁；網站會依手機語言自動顯示繁體中文。
   官方網站不允許被嵌入其他網頁，所以在 LINE 裡用內建瀏覽器打開，關掉就回到平台 */
const GOSPEL = { short: 'https://gospel.kgbr.co.kr/', long: 'https://gospel.kgbr.co.kr/long/', share: 'https://gospel.kgbr.co.kr/share/' };
const gospelCard = compact => `<section class="gospel-card ${compact ? 'compact' : ''} no-shot" id="gospel-card">
    <div class="gc-head"><span class="gc-ic" aria-hidden="true">${ICON.book}</span><div><b>人生的奧秘</b><small>傳講版・跟對方一起看，最後帶他禱告</small></div></div>
    <div class="gc-btns"><button type="button" class="btn send small" data-act="openUrl" data-url="${GOSPEL.short}">1 分鐘版</button><button type="button" class="btn plain small" data-act="openUrl" data-url="${GOSPEL.long}">3 分鐘版</button>
      <button type="button" class="btn plain small" data-act="copyGospel">${ICON.copy} 傳給對方</button></div>
  </section>`;
async function openUrl(url) {
  if (inClient()) { try { await LIFF_READY; liff.openWindow({ url, external: false }); return; } catch (e) {} }
  window.open(url, '_blank', 'noopener');
}

/* ================= 開展紀錄：時段列表 ================= */
function renderRec() {
  if (SUB) return renderSession(sesById(SUB));
  const list = sortSes(TEAM.sessions), me = TEAM.me.userId;
  const groups = [['進行中、今天', list.filter(s => ['進行中', '今天'].includes(sesState(s)))], ['接下來', list.filter(s => sesState(s) === '即將').reverse()], ['已結束', list.filter(s => sesState(s) === '已結束')]];
  return `${gospelCard()}<div class="sec-h"><h2>開展時段</h2>${TEAM.me.perms.session ? `<button class="btn send small" type="button" id="new-ses" data-act="newSes">${ICON.plus} 建立時段</button>` : ''}</div>
    ${list.length ? groups.filter(g => g[1].length).map(([h, l]) => `<h3 class="grp-h">${h}</h3><div class="ses-list">${l.map(s => sesCard(s, me)).join('')}</div>`).join('')
      : `<div class="empty"><p>還沒有開展時段。</p><p class="muted">${TEAM.me.perms.session ? '按右上角「建立時段」，填時間、地點，大家就能加入一起記錄。' : '等負責人或隊友建立開展時段後，就能加入記錄。'}</p></div>`}`;
}
function sesCard(s, me) {
  const d = parseYmd(s.date), st = sesState(s), joined = !!partOf(s, me), mine = cardsIn(s.id, me).length;
  return `<button class="ses-card" type="button" data-act="openSes" data-id="${esc(s.id)}">
    <span class="date"><b>${d ? d.getDate() : ''}</b><small>${d ? `${d.getMonth() + 1}月・${WD[d.getDay()]}` : ''}</small></span>
    <span class="info"><b>${esc(sesName(s))}</b><small>${esc([timeRange(s), s.title ? s.place : ''].filter(Boolean).join('・'))}</small>
      <span class="chips-row"><span class="state s-${{ 進行中: 'on', 今天: 'on', 即將: 'soon', 已結束: 'end' }[st] || 'end'}">${st}</span><span class="state">${s.parts.length} 人參加</span>${joined ? `<span class="state mine">已加入${mine ? `・名單 ${mine}` : ''}</span>` : ''}</span></span>
    <span class="go" aria-hidden="true">›</span></button>`;
}

/* ================= 建立／修改開展時段 ================= */
/** 範本：這個開展隊建立過的時段（名稱、時間、地點、計數項目、備註都一樣的只算一個），新的在前 */
let TPLS = [];
function sesTemplates() {
  const seen = new Set();
  TPLS = sortSes(TEAM.sessions).filter(s => { const k = [s.title, s.place, s.start, s.end, s.items.join(), s.note].join('|'); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 12);
  if (!TPLS.length) return '';
  const th = themeOf(TEAM.team);
  return `<div class="templates"><h2>從建立過的時段帶入<small>點一下就填好，日期改成今天</small></h2>
    <div class="tpl-row">${TPLS.map((t, i) => `<button class="tpl" type="button" data-tpl="${i}" aria-pressed="false" style="--tc:${th.btn}">
      <b>${esc(sesName(t))}</b><small>${esc([timeRange(t), t.title ? t.place : ''].filter(Boolean).join('・') || '—')}</small><small>計數 ${t.items.length} 項${t.note ? '・有備註' : ''}</small><small class="saved">上次 ${esc(dayLabel(t.date))}・${esc(t.creator)}</small></button>`).join('')}</div></div>`;
}
/* ---------- 時間選擇：24 小時制或上午／下午（記住每個人的選擇） ---------- */
const TIME_KEY = 'outreach.time24';
let TIME24 = (() => { try { return localStorage.getItem(TIME_KEY) !== '0'; } catch (e) { return true; } })();
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));
function timePick(attr, val) {
  const m = /^(\d{2}):(\d{2})$/.exec(val || ''), h = m ? +m[1] : null, mi = m ? m[2] : '';
  const mins = mi && !MINUTES.includes(mi) ? [...MINUTES, mi].sort() : MINUTES;
  const opt = (v, l, on) => `<option value="${v}" ${on ? 'selected' : ''}>${l}</option>`;
  const minSel = `<select class="inp tp-m" aria-label="分">${opt('', '分', !m)}${mins.map(x => opt(x, x, x === mi)).join('')}</select>`;
  const hid = `<input type="hidden" ${attr} value="${esc(m ? val : '')}">`;
  if (TIME24) return `<span class="tpick" data-tp>${hid}<select class="inp tp-h" aria-label="時">${opt('', '時', h == null)}${Array.from({ length: 24 }, (_, i) => opt(pad(i), pad(i), h === i)).join('')}</select><b>:</b>${minSel}</span>`;
  const ap = h == null ? '' : h < 12 ? 'am' : 'pm', h12 = h == null ? null : (h % 12 || 12);
  return `<span class="tpick ampm" data-tp>${hid}<select class="inp tp-ap" aria-label="上午或下午">${opt('', '—', !ap)}${opt('am', '上午', ap === 'am')}${opt('pm', '下午', ap === 'pm')}</select>
    <select class="inp tp-h" aria-label="時">${opt('', '時', h12 == null)}${Array.from({ length: 12 }, (_, i) => opt(String(i + 1), String(i + 1), h12 === i + 1)).join('')}</select><b>:</b>${minSel}</span>`;
}
/** 選了時、分（上午／下午）之後，寫回隱藏的 HH:MM 欄位，並通知表單更新預覽 */
function syncTimePick(tp) {
  const h = tp.querySelector('.tp-h'), mi = tp.querySelector('.tp-m'), ap = tp.querySelector('.tp-ap'), hid = tp.querySelector('input[type=hidden]');
  let v = '';
  if (h.value !== '') {
    let hh = +h.value;
    if (ap) { if (!ap.value) ap.value = hh >= 7 && hh <= 11 ? 'am' : 'pm'; hh = (hh % 12) + (ap.value === 'pm' ? 12 : 0); }
    if (!mi.value) mi.value = '00';
    v = `${pad(hh)}:${mi.value}`;
  }
  hid.value = v;
  hid.dispatchEvent(new Event('change', { bubbles: true }));
}
const timeModeHtml = () => `<div class="time-mode"><span>時間顯示</span><div class="seg"><button type="button" data-act="timeMode" data-v="1" aria-selected="${TIME24}">24 小時制</button><button type="button" data-act="timeMode" data-v="0" aria-selected="${!TIME24}">上午／下午</button></div></div>`;
function redrawTimePicks() {
  $$('[data-tp]').forEach(tp => {
    const hid = tp.querySelector('input[type=hidden]');
    const attr = hid.name ? `name="${hid.name}"` : `data-sl="${hid.dataset.sl}"`;
    tp.outerHTML = timePick(attr, hid.value);
  });
  $$('[data-act=timeMode]').forEach(b => b.setAttribute('aria-selected', (b.dataset.v === '1') === TIME24));
}

/* ---------- 批次建立：像設定鬧鐘一樣，可以有好幾組時間，每組可重複（每天／每週／自訂星期） ---------- */
const REPEATS = [['none', '不重複'], ['daily', '每天'], ['weekly', '每週'], ['custom', '自訂']];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // 週一～主日
const WD_NAME = d => d === 0 ? '主日' : '週' + WD[d];
let SLOTS = [], REPEAT = { mode: 'none', days: [], until: '' };
function defaultUntil(from) {
  const e = parseYmd(TEAM.team.end), d = parseYmd(from) || now();
  const four = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 27);
  return ymd(e && e > d ? e : four);
}
/** 依重複規則展開成實際的日期與時間（同一天同一個開始時間只算一次），最多 60 個 */
function expandSlots() {
  const out = [], seen = new Set(), until = parseYmd(REPEAT.until);
  SLOTS.forEach(sl => {
    const d0 = parseYmd(sl.date); if (!d0) return;
    const push = d => { const k = ymd(d) + sl.start; if (!seen.has(k)) { seen.add(k); out.push({ date: ymd(d), start: sl.start, end: sl.end }); } };
    if (REPEAT.mode === 'none' || !until || until < d0) { push(d0); return; }
    for (let d = new Date(d0), n = 0; d <= until && n < 400; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1), n++) {
      const ok = REPEAT.mode === 'daily' || (REPEAT.mode === 'weekly' && d.getDay() === d0.getDay()) || (REPEAT.mode === 'custom' && REPEAT.days.includes(d.getDay()));
      if (ok) push(d);
    }
  });
  return out.sort((x, y) => (x.date + x.start).localeCompare(y.date + y.start));
}
function slotsHtml() {
  const list = expandSlots(), many = list.length > 60;
  return `${SLOTS.map((sl, i) => `<div class="slot" data-slot="${i}">
      <div class="slot-h"><b>${SLOTS.length > 1 ? `第 ${i + 1} 組時間` : '日期與時間'}</b>${i ? `<button type="button" class="link-btn danger" data-act="rmSlot" data-i="${i}">移除</button>` : ''}</div>
      <label class="field"><span>${REPEAT.mode === 'none' ? '日期' : '從哪一天開始'}</span><input type="date" data-sl="date" value="${esc(sl.date)}" required></label>
      <div class="row2"><div class="field"><span>開始</span>${timePick('data-sl="start"', sl.start)}</div><div class="field"><span>結束</span>${timePick('data-sl="end"', sl.end)}</div></div>
    </div>`).join('')}
    <button type="button" class="btn plain small add-slot-btn" data-act="addSlot">${ICON.plus} 再加一組時間</button>
    <div class="field repeat"><span>重複</span><div class="seg">${REPEATS.map(([k, l]) => `<button type="button" data-act="repeat" data-k="${k}" aria-selected="${REPEAT.mode === k}">${l}</button>`).join('')}</div>
      ${REPEAT.mode === 'custom' ? `<div class="wdays">${WEEK_ORDER.map(d => `<button type="button" class="wday" data-act="wday" data-d="${d}" aria-pressed="${REPEAT.days.includes(d)}">${d === 0 ? '日' : WD[d]}</button>`).join('')}</div>` : ''}
      ${REPEAT.mode === 'weekly' ? `<p class="help">每週${SLOTS.map(sl => { const d = parseYmd(sl.date); return d ? WD_NAME(d.getDay()).replace('週', '') : ''; }).filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join('、')}（依每組的開始日期）</p>` : ''}
      ${REPEAT.mode !== 'none' ? `<label class="field until"><span>重複到</span><input type="date" id="rep-until" value="${esc(REPEAT.until)}"></label>` : ''}</div>
    <div class="slot-preview ${many ? 'warn' : ''}"><b>將建立 ${list.length} 個時段</b>${many ? '（一次最多 60 個，請縮短重複期間）' : ''}
      <div class="sp-list">${list.slice(0, 60).map(x => `<span>${esc(dayLabel(x.date))}${x.start ? ' ' + x.start : ''}</span>`).join('')}</div></div>`;
}
function drawSlots() { const el = $('slots'); if (el) el.innerHTML = slotsHtml(); }
function readSlots() {
  $$('#slots [data-slot]').forEach(row => { const sl = SLOTS[+row.dataset.slot]; row.querySelectorAll('[data-sl]').forEach(i => { sl[i.dataset.sl] = i.value; }); });
  const u = $('rep-until'); if (u) REPEAT.until = u.value;
}

function sesFormFlow(s) {
  const isNew = !s;
  s = s || { title: '', date: ymd(now()), start: '', end: '', place: '', items: ITEMS.map(x => x.k), note: '' };
  if (isNew) { SLOTS = [{ date: s.date, start: '', end: '' }]; REPEAT = { mode: 'none', days: [], until: defaultUntil(s.date) }; }
  NAV++;
  setNav(TAB);
  view(`<div class="team-wrap" style="${themeVars(themeOf(TEAM.team))}">${subbar('返回', isNew ? '建立開展時段' : '修改開展時段', 'backRec')}
    ${isNew ? sesTemplates() : ''}
    <form class="panel" id="ses-form" autocomplete="off">
      <label class="field"><span>名稱（選填）</span><input name="title" maxlength="40" value="${esc(s.title)}" placeholder="例如：一中街掃街、社區叩門"></label>
      ${timeModeHtml()}
      ${isNew ? `<div id="slots">${slotsHtml()}</div>` : `<label class="field"><span>日期</span><input type="date" name="date" required value="${esc(s.date)}"></label>
      <div class="row2"><div class="field"><span>開始</span>${timePick('name="start"', s.start)}</div><div class="field"><span>結束</span>${timePick('name="end"', s.end)}</div></div>`}
      <label class="field"><span>地點</span><input name="place" maxlength="80" value="${esc(s.place)}" placeholder="例如：一中街、中興大學、崇德路社區"></label>
      <div class="field"><span>這個時段要計數的項目</span><div class="checks">${ITEMS.map(x => `<label class="check"><input type="checkbox" name="items" value="${x.k}" ${s.items.includes(x.k) ? 'checked' : ''}><span>${x.label}</span></label>`).join('')}</div></div>
      <label class="field"><span>備註（選填）</span><textarea name="note" maxlength="300" placeholder="集合地點、分組、要帶的東西…">${esc(s.note)}</textarea></label>
      <button class="btn send" type="submit">${isNew ? '建立時段' : '儲存'}</button>
    </form></div>`);
  const f = $('ses-form');
  if (isNew) {
    // 改了日期、時間：更新預覽（不重畫輸入框，才不會打斷輸入）
    $('slots').addEventListener('change', e => { if (e.target.matches('[data-sl], #rep-until')) { readSlots(); drawSlots(); } });
  }
  $$('[data-tpl]').forEach(b => b.onclick = () => {
    const t = TPLS[+b.dataset.tpl];
    ['title', 'place', 'note'].forEach(k => { f.elements[k].value = t[k] || ''; });
    readSlots(); SLOTS.forEach(sl => { sl.start = t.start || ''; sl.end = t.end || ''; }); drawSlots();
    $$('#ses-form [name=items]').forEach(i => { i.checked = t.items.includes(i.value); });
    $$('[data-tpl]').forEach(x => x.setAttribute('aria-pressed', x === b));
    toast('已帶入範本，日期請確認');
  });
  f.onsubmit = async e => {
    e.preventDefault();
    const v = n => f.elements[n].value.trim();
    const items = $$('#ses-form [name=items]:checked').map(x => x.value);
    if (!items.length) { toast('至少勾選一個計數項目'); return; }
    const removed = isNew ? [] : s.items.filter(k => !items.includes(k));
    if (removed.length && !await confirmBox({ title: `移除「${removed.map(k => ITEM[k].label).join('、')}」？`, text: '這個時段將不再記錄、統計這些項目。之後加回來，原本記的數字還在。', ok: '移除' })) return;
    const base = { title: v('title'), place: v('place'), items, note: v('note') };
    let slots = [];
    if (isNew) {
      readSlots(); slots = expandSlots();
      if (REPEAT.mode === 'custom' && !REPEAT.days.length) { toast('請勾選要重複的星期'); return; }
      if (!slots.length) { toast('請選擇日期'); return; }
      if (slots.length > 60) { toast('一次最多建立 60 個時段'); return; }
      if (slots.length > 1 && !await confirmBox({ title: `一次建立 ${slots.length} 個時段？`, text: `${dayLabel(slots[0].date)} ～ ${dayLabel(slots[slots.length - 1].date)}。之後每個時段都可以個別修改或刪除。`, ok: '建立', danger: false })) return;
    }
    const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = '建立中…';
    try {
      if (isNew) {
        const r = await api('createSessions', { teamId: TEAM.team.id, ses: base, slots });
        SUB = r.ids.length === 1 ? r.ids[0] : '';
        toast(r.ids.length === 1 ? '時段建立好了，可以邀請大家加入' : `已建立 ${r.ids.length} 個時段`);
      } else { await api('updateSession', { teamId: TEAM.team.id, sessionId: s.id, ses: { ...base, date: v('date'), start: v('start'), end: v('end') } }); toast('已儲存'); }
      TAB = 'rec'; await reloadTeam(false);
    } catch (err) { toast(err.message); btn.disabled = false; btn.textContent = isNew ? '建立時段' : '儲存'; }
  };
}

/* ================= 一個開展時段：我的計數＋記名卡片 ================= */
function renderSession(s) {
  const me = TEAM.me.userId, part = partOf(s, me), st = sesState(s), editable = canEditSes(s);
  const head = `<section class="panel ses-head" id="ses-head">
    <div class="ph-row"><span class="state s-${{ 進行中: 'on', 今天: 'on', 即將: 'soon', 已結束: 'end' }[st] || 'end'}">${st}</span>${tools(`sesinfo:${s.id}`, 'ses-head', `${sesName(s)}-時段`)}</div>
    <h2 class="ses-title">${esc(sesName(s))}</h2>
    <p class="ses-when">${esc(sesLabel(s))}</p>
    ${s.note ? `<p class="ses-note">${esc(s.note)}</p>` : ''}
    <p class="ses-people"><span>建立：${esc(s.creator)}</span><span>參加（${s.parts.length}）：${s.parts.map(p => esc(p.name)).join('、') || '—'}</span></p>
    <div class="act-row no-shot">
      <button class="btn plain small" type="button" data-act="sendSes" data-id="${esc(s.id)}">${ICON.send} 邀請隊友加入</button>
      <button class="btn plain small" type="button" data-act="toSum" data-id="${esc(s.id)}">時段彙整 ›</button>
      ${editable ? `<button class="btn plain small" type="button" data-act="editSes" data-id="${esc(s.id)}">修改</button><button class="btn cancel small" type="button" data-act="delSes" data-id="${esc(s.id)}">刪除時段</button>` : ''}
    </div></section>`;
  if (!part) return `${subbar('開展紀錄', '', 'backRec')}${head}
    <div class="join-box"><p>你還沒加入這個時段。加入後就能記錄計數和有效名單。</p><button class="btn send" type="button" id="join-ses" data-act="joinSes" data-id="${esc(s.id)}">加入這個時段</button></div>`;
  const mine = cardsIn(s.id, me), missing = ITEMS.filter(x => !s.items.includes(x.k));
  const editing = Object.entries(EDIT).filter(([k, d]) => k.startsWith('new') && d.sessionId === s.id);
  return `${subbar('開展紀錄', '', 'backRec')}${head}${gospelCard(true)}
    <section class="panel" id="my-rec">
      <div class="sec-h"><h2>我的計數</h2>${tools(`rec:${s.id}`, 'my-rec', `${sesName(s)}-${TEAM.me.name}`)}</div>
      <p class="shot-only shot-cap">${esc(TEAM.me.name)}・${esc(sesLabel(s))}</p>
      <div class="counters" id="counters">${s.items.map(k => counterHtml(s, part, k, editable)).join('')}</div>
      ${editable && missing.length ? `<div class="add-items no-shot"><span>加回項目：</span>${missing.map(x => `<button class="chip" type="button" data-act="addItem" data-k="${x.k}">+ ${x.label}</button>`).join('')}</div>` : ''}
      <p class="cnt-state no-shot" id="cnt-state" aria-live="polite">${CNT.msg || '數字會自動儲存'}</p>
      <div class="sec-h cards-h"><h2>有效名單記名卡片<span class="n">${mine.length}</span></h2></div>
      <div class="pcards" id="my-cards">${mine.map(c => EDIT[c.id] ? cardEditHtml(c.id, EDIT[c.id]) : cardHtml(c)).join('')}${editing.map(([k, d]) => cardEditHtml(k, d)).join('')}
        ${!mine.length && !editing.length ? '<p class="muted empty-cards">還沒有記名卡片。遇到願意留資料的人，按下面的按鈕記下來。</p>' : ''}</div>
      <button class="btn plain add-card no-shot" type="button" id="new-card" data-act="newCard" data-id="${esc(s.id)}">${ICON.plus} 新增記名卡片</button>
    </section>
    <p class="leave"><a href="#" data-act="leaveSes" data-id="${esc(s.id)}">退出這個時段</a></p>`;
}
function counterHtml(s, part, k, editable) {
  const x = ITEM[k], v = countOf(s, part, k), cards = k === 'valid' ? cardsIn(s.id, part.userId).length : 0;
  return `<div class="counter" data-k="${k}">
    <div class="c-top"><span>${x.label}</span>${editable ? `<button class="c-x no-shot" type="button" data-act="rmItem" data-k="${k}" aria-label="移除${x.label}">×</button>` : ''}</div>
    <div class="c-row"><button class="c-btn no-shot" type="button" data-act="dec" data-k="${k}" aria-label="${x.label}減一">${ICON.minus}</button>
      <input class="c-num" inputmode="numeric" pattern="[0-9]*" data-cnt="${k}" value="${v}" aria-label="${x.label}">
      <button class="c-btn plus no-shot" type="button" data-act="inc" data-k="${k}" aria-label="${x.label}加一">${ICON.plus}</button></div>
    <small>${k === 'valid' ? `已記名 ${cards} 張` : x.unit}</small></div>`;
}

/* ---------- 計數自動儲存 ---------- */
const CNT = { timer: 0, sid: '', msg: '' };
function setCount(k, val) {
  const s = sesById(SUB), p = partOf(s, TEAM.me.userId);
  const cards = k === 'valid' ? cardsIn(s.id, p.userId).length : 0;
  let v = Math.max(0, Math.min(99999, Math.floor(+val || 0)));
  if (k === 'valid' && v < cards) { v = cards; toast(`有效名單不會少於已記名的 ${cards} 張`); }
  p.counts = { ...p.counts, [k]: v };
  const inp = document.querySelector(`[data-cnt="${k}"]`); if (inp) inp.value = v;
  CNT.sid = s.id;
  stateMsg('儲存中…');
  clearTimeout(CNT.timer);
  CNT.timer = setTimeout(flushCounts, 700);
}
function stateMsg(m) { CNT.msg = m; const el = $('cnt-state'); if (el) el.textContent = m; }
async function flushCounts() {
  if (!CNT.timer) return;
  clearTimeout(CNT.timer); CNT.timer = 0;
  const s = sesById(CNT.sid); if (!s) return;
  const p = partOf(s, TEAM.me.userId);
  try {
    await api('saveCounts', { teamId: TEAM.team.id, sessionId: s.id, counts: p.counts });
    const t = now(); stateMsg(`已儲存 ${pad(t.getHours())}:${pad(t.getMinutes())}`);
    delete CACHE[ckey('team', { teamId: TEAM.team.id })]; saveCache();
  } catch (e) { stateMsg('沒有儲存成功：' + e.message + '（再按一次數字就會重試）'); }
}
addEventListener('pagehide', () => { if (CNT.timer) flushCounts(); });

/* ================= 記名卡片 ================= */
const blankCard = sid => ({ sessionId: sid, name: '', gender: '', age: '', phone: '', lineId: '', address: '', open: '', photos: [], fu: false, jia: false, pai: false, qu: false, urgent: false, note: '' });
const cardTags = c => [c.gender, c.age].filter(Boolean).map(x => `<span class="tag">${esc(x)}</span>`).join('') + (c.open ? `<span class="tag open-${c.open}">${esc(openLabel(c.open))}</span>` : '');
function cardHtml(c, opt = {}) {
  const s = sesById(c.sessionId) || {}, can = c.canEdit && !opt.readonly;
  const info = [['手機', c.phone ? `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}">${esc(c.phone)}</a>` : ''], ['LINE ID', esc(c.lineId)], ['地址', esc(c.address)], ['備註', esc(c.note)]].filter(x => x[1]);
  return `<article class="pcard ${c.urgent ? 'urgent' : ''}" id="card-${esc(c.id)}">
    <div class="pc-head"><div class="pc-name"><b>${esc(c.name) || '<span class="muted">（未填姓名）</span>'}</b>${c.urgent ? `<span class="urgent-mark">${ICON.star}迫切代禱</span>` : ''}<div class="tags">${cardTags(c)}</div></div>
      ${tools(`card:${c.id}`, `card-${c.id}`, `${c.name || '記名卡片'}`)}</div>
    <div class="pc-flags">${FLAGS.map(f => `<button class="flag" type="button" style="--fc:${f.color}" aria-pressed="${!!c[f.k]}" ${can ? `data-act="flag" data-id="${esc(c.id)}" data-k="${f.k}"` : 'disabled'} title="${f.label}">${f.short}</button>`).join('')}
      <button class="flag star" type="button" aria-pressed="${!!c.urgent}" ${can ? `data-act="flag" data-id="${esc(c.id)}" data-k="urgent"` : 'disabled'}>${ICON.star}<span>迫切代禱</span></button></div>
    ${info.length ? `<dl class="pc-info">${info.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''}
    ${c.hidden ? '<p class="muted small">手機、LINE ID、地址只有記名的人和有權限的人看得到。</p>' : ''}
    ${c.photos && c.photos.length ? `<div class="pc-photos">${c.photos.map(u => `<img src="${esc(u)}" alt="${esc(c.name)}的照片" loading="lazy" crossorigin="anonymous">`).join('')}</div>` : ''}
    <div class="pc-foot"><span>開展者 ${esc(c.owner)}${opt.showSes && s.date ? `・${esc(dayLabel(s.date))} ${esc(s.place || '')}` : ''}</span>
      ${can ? `<span class="no-shot"><button class="link-btn" type="button" data-act="editCard" data-id="${esc(c.id)}">編輯</button><button class="link-btn danger" type="button" data-act="delCard" data-id="${esc(c.id)}">刪除</button></span>` : ''}</div>
  </article>`;
}
function cardEditHtml(key, d) {
  const isNew = key.startsWith('new');
  const sel = (f, list, label) => `<label class="field"><span>${label}</span><select class="inp" data-f="${f}"><option value="">—</option>${list.map(o => { const v = o.v || o, l = o.label || o; return `<option value="${esc(v)}" ${d[f] === v ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select></label>`;
  return `<article class="pcard editing" id="card-${esc(key)}" data-key="${esc(key)}">
    <p class="pc-edit-h">${isNew ? '新的記名卡片' : '編輯記名卡片'}<small>每一欄都可以不填</small></p>
    <label class="field"><span>姓名</span><input data-f="name" maxlength="30" value="${esc(d.name)}"></label>
    <div class="row2">${sel('gender', GENDERS, '身分')}${sel('age', AGES, '年齡段')}</div>
    <div class="row2"><label class="field"><span>手機</span><input data-f="phone" type="tel" inputmode="tel" maxlength="30" value="${esc(d.phone)}"></label>
      <label class="field"><span>LINE ID</span><input data-f="lineId" maxlength="40" autocapitalize="off" value="${esc(d.lineId)}"></label></div>
    <label class="field"><span>地址</span><input data-f="address" maxlength="120" value="${esc(d.address)}"></label>
    ${sel('open', OPENS, '敞開程度')}
    <div class="field"><span>照片</span><div class="photos">${(d.photos || []).map((u, i) => `<div class="ph"><img src="${esc(u)}" alt=""><button type="button" data-act="rmPhoto" data-key="${esc(key)}" data-i="${i}" aria-label="移除照片">×</button></div>`).join('')}
      ${(d.photos || []).length < 3 ? `<label class="ph add" aria-label="上傳照片">${ICON.image}<span>上傳</span><input type="file" accept="image/*" data-photo="${esc(key)}" hidden></label>` : ''}</div><p class="help" id="ph-st-${esc(key)}"></p></div>
    <div class="field"><span>目前狀態（可複選，勾選後會出現在代禱牆）</span><div class="pc-flags">${FLAGS.map(f => `<button class="flag" type="button" style="--fc:${f.color}" aria-pressed="${!!d[f.k]}" data-act="flagDraft" data-key="${esc(key)}" data-k="${f.k}">${f.label}</button>`).join('')}</div></div>
    <div class="pc-flags"><button class="flag star" type="button" aria-pressed="${!!d.urgent}" data-act="flagDraft" data-key="${esc(key)}" data-k="urgent">${ICON.star}<span>迫切代禱（名字在代禱牆上會特別顯眼）</span></button></div>
    <label class="field"><span>備註（選填）</span><textarea data-f="note" maxlength="300" rows="2">${esc(d.note)}</textarea></label>
    <div class="btn-row"><button class="btn plain" type="button" data-act="cancelCard" data-key="${esc(key)}">取消</button><button class="btn send" type="button" data-act="saveCard" data-key="${esc(key)}">儲存</button></div>
  </article>`;
}
/** 把輸入框的內容收回草稿（重畫畫面前呼叫，才不會弄丟正在打的字） */
function syncDrafts() {
  $$('.pcard.editing').forEach(el => {
    const d = EDIT[el.dataset.key]; if (!d) return;
    el.querySelectorAll('[data-f]').forEach(i => { d[i.dataset.f] = i.value.trim(); });
  });
}
function rerenderCard(key) {
  syncDrafts();
  const el = $(`card-${key}`); if (!el) return renderTeam(true);
  const c = TEAM.cards.find(x => x.id === key);
  el.outerHTML = EDIT[key] ? cardEditHtml(key, EDIT[key]) : c ? cardHtml(c, { showSes: TAB !== 'rec' }) : '';
}
async function uploadPhoto(inp) {
  const key = inp.dataset.photo, file = (inp.files || [])[0], d = EDIT[key];
  inp.value = '';
  if (!file || !d) return;
  const st = $(`ph-st-${key}`); if (st) st.textContent = '上傳中…';
  try {
    const dataUrl = await shrinkImage(file, 1200, 0.82);
    syncDrafts();
    d.photos = [...(d.photos || []), (await api('uploadImage', { data: dataUrl, mime: 'image/jpeg' })).url].slice(0, 3);
    rerenderCard(key);
  } catch (e) { if (st) st.textContent = ''; toast('上傳失敗：' + e.message); }
}
function shrinkImage(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.naturalWidth);
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * scale); c.height = Math.round(img.naturalHeight * scale);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(img.src);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('無法讀取這張圖片'));
    img.src = URL.createObjectURL(file);
  });
}
async function saveCardDraft(key, btn) {
  syncDrafts();
  const d = EDIT[key];
  const card = { ...d, id: key.startsWith('new') ? '' : key };
  const filled = ['name', 'gender', 'age', 'phone', 'lineId', 'address', 'open', 'note'].some(f => card[f]) || (card.photos || []).length;
  if (!filled) { toast('至少填一個欄位再儲存'); return; }
  btn.disabled = true; btn.textContent = '儲存中…';
  try {
    const r = await api('saveCard', { teamId: TEAM.team.id, card });
    const i = TEAM.cards.findIndex(x => x.id === r.card.id);
    if (i >= 0) TEAM.cards[i] = { ...TEAM.cards[i], ...r.card }; else TEAM.cards.push(r.card);
    const s = sesById(r.card.sessionId);
    if (s && !partOf(s, TEAM.me.userId)) s.parts.push({ userId: TEAM.me.userId, name: TEAM.me.name, counts: {} });
    delete EDIT[key];
    toast('已儲存記名卡片');
    renderTeam(true);
  } catch (e) { toast(e.message); btn.disabled = false; btn.textContent = '儲存'; }
}

/* ================= 所有按鈕的動作（用 data-act 統一處理） ================= */
const ACTS = {
  home: () => { flushCounts(); MEM_EDIT = ''; TEAM_EDIT = false; homeFlow(); },
  openTeam: b => teamFlow(b.dataset.id, 'rec', ''),
  newTeam: () => newTeamFlow(),
  mydata: () => myDataFlow(),
  install: () => startInstall(),
  tour: () => startTour(TOUR_STEPS.filter(s => s.where === whereNow())),
  tab: b => { flushCounts(); syncDrafts(); TAB = b.dataset.k; if (TAB !== 'ses') SUB = TAB === 'rec' ? '' : SUB; MEM_EDIT = ''; TEAM_EDIT = false; renderTeam(); },
  backRec: () => { flushCounts(); TAB = 'rec'; SUB = ''; renderTeam(); },
  openSes: b => { TAB = 'rec'; SUB = b.dataset.id; renderTeam(); },
  toSum: b => { flushCounts(); TAB = 'ses'; SUB = b.dataset.id; renderTeam(); },
  newSes: () => sesFormFlow(null),
  addSlot: () => { readSlots(); const last = SLOTS[SLOTS.length - 1], d = parseYmd(last.date) || now(); SLOTS.push({ date: ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)), start: SLOTS[0].start, end: SLOTS[0].end }); drawSlots(); },
  rmSlot: b => { readSlots(); SLOTS.splice(+b.dataset.i, 1); drawSlots(); },
  repeat: b => { readSlots(); REPEAT.mode = b.dataset.k; if (REPEAT.mode === 'custom' && !REPEAT.days.length) { const d = parseYmd(SLOTS[0].date); if (d) REPEAT.days = [d.getDay()]; } drawSlots(); },
  wday: b => { readSlots(); const d = +b.dataset.d; REPEAT.days = REPEAT.days.includes(d) ? REPEAT.days.filter(x => x !== d) : [...REPEAT.days, d]; drawSlots(); },
  editSes: b => sesFormFlow(sesById(b.dataset.id)),
  delSes: async b => {
    const s = sesById(b.dataset.id), n = cardsIn(s.id).length;
    if (!await confirmBox({ title: `刪除「${sesName(s)}」？`, text: `這個時段所有人的計數${n ? `和 ${n} 張記名卡片` : ''}都會一起刪除，無法復原。`, ok: '刪除時段' })) return;
    try { await api('deleteSession', { teamId: TEAM.team.id, sessionId: s.id }); SUB = ''; toast('已刪除時段'); await reloadTeam(false); } catch (e) { toast(e.message); }
  },
  joinSes: async b => {
    b.disabled = true;
    try { await api('joinSession', { teamId: TEAM.team.id, sessionId: b.dataset.id }); const s = sesById(b.dataset.id); s.parts.push({ userId: TEAM.me.userId, name: TEAM.me.name, counts: {} }); toast('已加入，開始記錄吧'); renderTeam(true); }
    catch (e) { toast(e.message); b.disabled = false; }
  },
  leaveSes: async b => {
    if (cardsIn(b.dataset.id, TEAM.me.userId).length) { toast('你在這個時段還有記名卡片，請先刪除卡片再退出'); return; }
    if (!await confirmBox({ title: '退出這個時段？', text: '你在這個時段記的計數會刪除。', ok: '退出' })) return;
    try { CNT.timer && clearTimeout(CNT.timer); CNT.timer = 0; await api('leaveSession', { teamId: TEAM.team.id, sessionId: b.dataset.id }); SUB = ''; await reloadTeam(false); } catch (e) { toast(e.message); }
  },
  sendSes: b => pickAndSend(sesFlex(sesById(b.dataset.id)), '已發出邀請'),
  sendSum: b => pickAndSend(sumFlex(sesById(b.dataset.id)), '已發到 LINE'),
  inc: b => { const k = b.dataset.k, s = sesById(SUB); setCount(k, countOf(s, partOf(s, TEAM.me.userId), k) + 1); },
  dec: b => { const k = b.dataset.k, s = sesById(SUB); setCount(k, countOf(s, partOf(s, TEAM.me.userId), k) - 1); },
  rmItem: async b => {
    const s = sesById(SUB), k = b.dataset.k;
    if (s.items.length <= 1) { toast('至少要留一個計數項目'); return; }
    if (!await confirmBox({ title: `從這個時段移除「${ITEM[k].label}」？`, text: '大家都不會再看到、統計這個項目。之後加回來，原本記的數字還在。', ok: '移除' })) return;
    await saveItems(s, s.items.filter(x => x !== k));
  },
  addItem: b => { const s = sesById(SUB); saveItems(s, ITEMS.map(x => x.k).filter(k => s.items.includes(k) || k === b.dataset.k)); },
  newCard: b => { syncDrafts(); const key = 'new' + (++NEWN); EDIT[key] = blankCard(b.dataset.id); renderTeam(true); const el = $(`card-${key}`); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.querySelector('input').focus({ preventScroll: true }); } },
  editCard: b => { syncDrafts(); const c = TEAM.cards.find(x => x.id === b.dataset.id); EDIT[c.id] = JSON.parse(JSON.stringify(c)); rerenderCard(c.id); },
  cancelCard: b => { delete EDIT[b.dataset.key]; b.dataset.key.startsWith('new') ? ($(`card-${b.dataset.key}`) || {}).remove?.() : rerenderCard(b.dataset.key); },
  saveCard: b => saveCardDraft(b.dataset.key, b),
  delCard: async b => {
    const c = TEAM.cards.find(x => x.id === b.dataset.id);
    if (!await confirmBox({ title: `刪除「${c.name || '這張記名卡片'}」？`, text: '刪除後無法復原，代禱牆上的名字也會一起移除。', ok: '刪除' })) return;
    try { await api('deleteCard', { teamId: TEAM.team.id, cardId: c.id }); TEAM.cards = TEAM.cards.filter(x => x.id !== c.id); toast('已刪除'); renderTeam(true); } catch (e) { toast(e.message); }
  },
  flag: async b => {
    const c = TEAM.cards.find(x => x.id === b.dataset.id), k = b.dataset.k, old = !!c[k];
    c[k] = !old; rerenderCard(c.id);
    if (TAB !== 'rec') renderTeam(true);
    try { await api('setCardFlags', { teamId: TEAM.team.id, cardId: c.id, flags: { [k]: !old } }); }
    catch (e) { c[k] = old; toast(e.message); renderTeam(true); }
  },
  flagDraft: b => { syncDrafts(); const d = EDIT[b.dataset.key], k = b.dataset.k; d[k] = !d[k]; b.setAttribute('aria-pressed', d[k]); },
  rmPhoto: b => { syncDrafts(); EDIT[b.dataset.key].photos.splice(+b.dataset.i, 1); rerenderCard(b.dataset.key); },
  toggleRow: b => { const id = b.dataset.id; OPEN_ROWS.has(id) ? OPEN_ROWS.delete(id) : OPEN_ROWS.add(id); renderTeam(true); },
  listFilter: b => { LIST_FILTER = b.dataset.k; renderTeam(true); },
  prayCard: b => showCardSheet(b.dataset.id),
  copy: b => { const [k, arg] = b.dataset.k.split(':'); syncDrafts(); copyText(COPY[k](arg)); },
  shot: async b => {
    const el = $(b.dataset.id); if (!el) return;
    const label = b.querySelector('span'); const old = label.textContent; label.textContent = '產生中…'; b.disabled = true;
    try { await saveBlob(await shotElement(el, fileName(b.dataset.name)), fileName(b.dataset.name)); }
    catch (e) { toast('存圖失敗：' + e.message); }
    finally { label.textContent = old; b.disabled = false; }
  },
  // 隊員
  sendInvite: () => pickAndSend(inviteFlex(TEAM.team), '已發出邀請'),
  copyInvite: () => copyText(`邀請你加入「${TEAM.team.title}」開展隊，點連結用 LINE 登入就能加入：\n${liffUrl(`join=${TEAM.team.code}`)}`, '已複製邀請連結'),
  resetInvite: async () => {
    if (!await confirmBox({ title: '重設邀請連結？', text: '舊的邀請連結會失效，已經加入的隊員不受影響。', ok: '重設' })) return;
    try { const r = await api('resetInvite', { teamId: TEAM.team.id }); TEAM.team = r.team; toast('已產生新的邀請連結'); renderTeam(true); } catch (e) { toast(e.message); }
  },
  teamEdit: () => { TEAM_EDIT = true; renderTeam(); },
  closeTeamEdit: () => { TEAM_EDIT = false; renderTeam(); },
  delTeam: async () => {
    if (!await confirmBox({ title: `刪除「${TEAM.team.title}」？`, text: '所有時段、計數、記名卡片都會刪除，隊員也看不到了。無法復原。', ok: '刪除開展隊' })) return;
    try { await api('deleteTeam', { teamId: TEAM.team.id }); TEAM = null; HOME = null; TEAM_EDIT = false; toast('已刪除開展隊'); homeFlow(); } catch (e) { toast(e.message); }
  },
  leaveTeam: async () => {
    if (!await confirmBox({ title: '退出這個開展隊？', text: '你記的名單和計數會保留在開展隊裡。之後可以用邀請連結再加入。', ok: '退出' })) return;
    try { await api('leaveTeam', { teamId: TEAM.team.id }); TEAM = null; HOME = null; homeFlow(); } catch (e) { toast(e.message); }
  },
  memEdit: b => { MEM_EDIT = b.dataset.id; renderTeam(true); },
  memCancel: () => { MEM_EDIT = ''; renderTeam(true); },
  titleChip: b => { $('me-title').value = b.dataset.v; },
  permPreset: b => { const admin = b.dataset.v === 'admin'; $$('[data-perm]').forEach(i => { i.checked = admin || i.dataset.perm === 'session'; }); },
  memSave: async b => {
    const perms = {}; $$('[data-perm]').forEach(i => { perms[i.dataset.perm] = i.checked; });
    b.disabled = true;
    try { const r = await api('setMember', { teamId: TEAM.team.id, userId: b.dataset.id, title: $('me-title').value.trim(), perms: $$('[data-perm]').length ? perms : null }); MEM_EDIT = ''; TEAM = { ...TEAM, ...r }; toast('已儲存'); renderTeam(true); }
    catch (e) { toast(e.message); b.disabled = false; }
  },
  memRemove: async b => {
    const m = TEAM.members.find(x => x.userId === b.dataset.id);
    if (!await confirmBox({ title: `把 ${m.name} 移出開展隊？`, text: '他記的名單和計數會保留。之後他可以用邀請連結再加入。', ok: '移出' })) return;
    try { const r = await api('removeMember', { teamId: TEAM.team.id, userId: m.userId }); MEM_EDIT = ''; TEAM = { ...TEAM, ...r }; renderTeam(true); } catch (e) { toast(e.message); }
  },
};
async function saveItems(s, items) {
  const old = s.items;
  s.items = items; renderTeam(true);
  try { await api('updateSession', { teamId: TEAM.team.id, sessionId: s.id, ses: { ...s, items } }); toast('已更新計數項目'); }
  catch (e) { s.items = old; toast(e.message); renderTeam(true); }
}
/** 代禱牆上點名字：跳出那張記名卡片 */
function showCardSheet(id) {
  const c = TEAM.cards.find(x => x.id === id); if (!c) return;
  const box = document.createElement('div');
  box.className = 'modal on';
  box.innerHTML = `<div class="modal-panel wide" style="${themeVars(themeOf(TEAM.team))}">${cardHtml(c, { showSes: true, readonly: true })}<button class="btn plain" type="button" data-close style="margin-top:12px">關閉</button></div>`;
  document.body.append(box);
  box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-close]')) box.remove(); });
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  if (b.tagName === 'A' || b.dataset.act === 'toggleRow') e.preventDefault();
  if (e.target.closest('a[href^="tel:"]')) return;
  const fn = ACTS[b.dataset.act];
  if (fn) Promise.resolve(fn(b, e)).catch(err => toast(err.message));
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('tr[data-act]')) { e.preventDefault(); ACTS.toggleRow(e.target); } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches('[data-cnt]')) setCount(t.dataset.cnt, t.value);
  else if (t.matches('[data-photo]')) uploadPhoto(t);
  else if (t.id === 'sum-pick') { SUB = t.value; renderTeam(true); }
});
document.addEventListener('focusin', e => { if (e.target.matches('[data-cnt]')) e.target.select(); });

/* ================= 使用教學（金框導覽） =================
   之後加功能時：新步驟標上 since: 新版本號，並把 TOUR_VERSION 加 1 */
const TOUR_KEY = 'outreach.tour';
const TOUR_VERSION = 4;
const q1 = sel => document.querySelector(sel);
const TOUR_STEPS = [
  { since: 1, where: 'home', target: () => q1('#new-team'), title: '建立開展隊', text: '任何人都能建立開展隊（例如一次福音開展活動），建立的人就是負責人，可以發邀請連結給大家加入。' },
  { since: 1, where: 'home', target: () => q1('.team-card'), title: '我的開展隊', text: '加入的開展隊都在這裡，點進去就能記錄和看彙整。' },
  { since: 2, where: 'home', target: () => q1('#to-admin'), title: '後台管理', text: '建立開展隊的人可以在後台一次管理自己建立的開展隊：選取、修改、開放或關閉加入、刪除。平台管理員看得到所有開展隊。' },
  { since: 1, where: 'team', tab: 'rec', target: () => q1('#new-ses') || q1('.ses-card'), title: '開展時段', text: '每次出去開展，先建立一個時段（時間、地點、要計數的項目），其他人點進去就能加入一起記錄。' },
  { since: 3, where: 'team', tab: 'rec', target: () => q1('#new-ses'), title: '時段範本', text: '建立過的開展時段會自動變成範本。建立新時段時，點一下範本就帶入名稱、時間、地點和計數項目，只要確認日期。' },
  { since: 4, where: 'team', tab: 'rec', target: () => q1('#new-ses'), title: '一次建立多個時段', text: '像設定鬧鐘一樣：可以加好幾組時間（預設和第一組一樣），選「每天」「每週」或自訂星期（週一～主日），再選重複到哪一天，一次建好整段期間的時段。' },
  { since: 1, where: 'team', tab: 'rec', sub: true, target: () => q1('#counters'), title: '計數器', text: '按＋－記錄接觸人數、叩訪戶數、發單張數…，也可以直接點數字輸入，會自動儲存。' },
  { since: 1, where: 'team', tab: 'rec', sub: true, target: () => q1('#new-card'), title: '記名卡片', text: '遇到願意留資料的人就新增一張記名卡片，欄位都可以不填；勾「福、家、排、區」和「迫切代禱」，名字會出現在代禱牆。' },
  { since: 1, where: 'team', tab: 'rec', sub: true, target: () => q1('#my-rec .tools'), title: '一鍵複製、存成圖片', text: '每個頁面和卡片右上角都有「複製」和「存圖」，可以貼到 LINE 或存到手機相簿。' },
  { since: 1, where: 'team', tab: 'ses', target: () => q1('#sum-ses'), title: '時段彙整', text: '每個時段所有人的計數和名單彙整，點名單的一列可以展開完整的記名卡片。' },
  { since: 1, where: 'team', tab: 'all', target: () => q1('#sum-all'), title: '累積彙整', text: '整個開展期間累積的計數、每個時段、每位隊員的數字，和所有名單。' },
  { since: 1, where: 'team', tab: 'pray', target: () => q1('.blocks'), title: '代禱牆', text: '依福（受浸）、家（家聚會）、排（小排）、區（主日）分區，名字後面是接觸的人；迫切代禱的名字最顯眼。' },
  { since: 1, where: 'team', tab: 'mem', target: () => q1('#invite'), title: '邀請與管理隊員', text: '發邀請連結到 LINE 群組；負責人可以幫每位隊員設定職稱和權限。' },
];
/** 首頁和開展隊頁各有一段教學，第一次進去時各看一次 */
const whereNow = () => TEAM && $app.querySelector('.team-wrap') ? 'team' : 'home';
const tourSeen = w => { try { return parseInt(localStorage.getItem(`${TOUR_KEY}.${w}`) || '0', 10) || 0; } catch (e) { return TOUR_VERSION; } };
const markTour = w => { try { localStorage.setItem(`${TOUR_KEY}.${w}`, String(TOUR_VERSION)); } catch (e) {} };
function maybeStartTour() {
  if (PARAMS.has('notour') || TOUR) return;
  const w = whereNow(), seen = tourSeen(w);
  if (!seen) { if (w === 'home' ? HOME && HOME.teams.length : TAB === 'rec' && !SUB) startTour(TOUR_STEPS.filter(s => s.where === w)); return; }
  if (seen >= TOUR_VERSION) return;
  markTour(w);
  const fresh = TOUR_STEPS.filter(s => s.since > seen && s.where === w);
  if (fresh.length) notice(`新功能：${fresh.map(s => s.title).join('、')}`, '看介紹', () => startTour(fresh));
}
function notice(text, action, fn) {
  const n = $('notice');
  $('notice-text').textContent = text; $('notice-go').textContent = action; n.hidden = false;
  const close = () => { n.hidden = true; };
  $('notice-go').onclick = () => { close(); fn(); };
  $('notice-x').onclick = close;
  setTimeout(close, 15000);
}
let TOUR = null;
const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
function startTour(steps) {
  if (TOUR || !steps.length) return;
  markTour(whereNow());
  const el = document.createElement('div');
  el.className = 'tour';
  el.innerHTML = `<div class="tour-catch"></div><div class="tour-hole" aria-hidden="true"></div>
    <div class="tour-bubble" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
      <div class="tour-head"><h2 id="tour-title"></h2><span class="tour-count"></span></div><p id="tour-text"></p>
      <div class="tour-btns"><button type="button" class="tour-skip">跳過</button><button type="button" class="tour-prev">上一步</button><button type="button" class="tour-next">下一步</button></div></div>`;
  document.body.append(el);
  TOUR = { el, steps, i: -1, from: { tab: TAB, sub: SUB } };
  el.querySelector('.tour-catch').addEventListener('click', e => e.stopPropagation());
  el.querySelector('.tour-skip').onclick = endTour;
  el.querySelector('.tour-prev').onclick = () => tourGo(TOUR.i - 1, -1);
  el.querySelector('.tour-next').onclick = () => tourGo(TOUR.i + 1, 1);
  addEventListener('keydown', tourKey, true);
  addEventListener('resize', placeTour);
  addEventListener('scroll', placeTour, true);
  requestAnimationFrame(() => el.classList.add('on'));
  tourGo(0, 1);
}
function tourKey(e) { if (TOUR && e.key === 'Escape') { e.preventDefault(); endTour(); } }
async function tourGo(i, dir) {
  const t = TOUR;
  if (!t || t.busy || i < 0) return;
  if (i >= t.steps.length) return endTour();
  const s = t.steps[i];
  t.busy = true;
  if (s.where === 'team' && TEAM) {
    const wantSub = s.sub ? (SUB && s.tab === 'rec' ? SUB : (sortSes(TEAM.sessions).find(x => partOf(x, TEAM.me.userId)) || {}).id || '') : (s.tab === 'ses' ? SUB : '');
    if (TAB !== s.tab || (s.tab === 'rec' && SUB !== wantSub)) { TAB = s.tab; SUB = wantSub; renderTeam(); }
  }
  let el = null;
  for (let n = 0; n < 30 && !el; n++) { el = s.target(); if (!el) await sleep(50); }
  t.busy = false;
  if (TOUR !== t) return;
  if (!el) return tourGo(i + dir, dir);
  t.i = i; t.target = el;
  el.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
  t.el.querySelector('#tour-title').textContent = s.title;
  t.el.querySelector('#tour-text').textContent = s.text;
  t.el.querySelector('.tour-count').textContent = `${i + 1} / ${t.steps.length}`;
  t.el.querySelector('.tour-prev').disabled = i === 0;
  t.el.querySelector('.tour-next').textContent = i === t.steps.length - 1 ? '完成' : '下一步';
  placeTour();
  await sleep(reducedMotion() ? 0 : 380);
  placeTour();
  t.el.querySelector('.tour-next').focus({ preventScroll: true });
}
function placeTour() {
  const t = TOUR; if (!t || !t.target) return;
  const PAD = 6, GAP = 14, EDGE = 12, r = t.target.getBoundingClientRect();
  const x = Math.max(r.left - PAD, 4), y = Math.max(r.top - PAD, 4);
  const w = Math.min(r.right + PAD, innerWidth - 4) - x, h = Math.min(r.bottom + PAD, innerHeight - 4) - y;
  const hole = t.el.querySelector('.tour-hole');
  hole.style.width = `${Math.max(0, w)}px`; hole.style.height = `${Math.max(0, h)}px`; hole.style.transform = `translate(${x}px, ${y}px)`;
  const b = t.el.querySelector('.tour-bubble'), bw = b.offsetWidth, bh = b.offsetHeight;
  let by;
  if (innerHeight - (y + h) - GAP - EDGE >= bh) by = y + h + GAP; else if (y - GAP - EDGE >= bh) by = y - GAP - bh; else by = innerHeight - EDGE - bh;
  const bx = Math.min(Math.max(x + w / 2 - bw / 2, EDGE), innerWidth - EDGE - bw);
  b.style.transform = `translate(${bx}px, ${Math.max(EDGE, by)}px)`;
}
function endTour() {
  const t = TOUR; if (!t) return;
  TOUR = null;
  removeEventListener('keydown', tourKey, true); removeEventListener('resize', placeTour); removeEventListener('scroll', placeTour, true);
  t.el.classList.remove('on'); setTimeout(() => t.el.remove(), 220);
  if (TEAM && $app.querySelector('.team-wrap')) { TAB = t.from.tab; SUB = t.from.sub; renderTeam(); }
}

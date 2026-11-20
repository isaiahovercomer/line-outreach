/* ================= 預覽模式的假資料 ================= */
const demo = (() => {
  const people = { U1: '孫學暐', U2: '簡晨光', U3: '王小明', U4: '陳怡君', U5: '林志豪', U6: '黃以琳' };
  const members = [
    { userId: 'U2', title: '隊長', perms: 'owner', joined: '2026/11/1 20:10' },
    { userId: 'U1', title: '副隊長', perms: 'manage,session,contacts,editAll', joined: '2026/11/1 20:31' },
    { userId: 'U4', title: '記錄', perms: 'session,contacts', joined: '2026/11/2 08:02' },
    { userId: 'U3', title: '隊員', perms: 'session', joined: '2026/11/2 09:15' },
    { userId: 'U5', title: '隊員', perms: 'session', joined: '2026/11/3 12:40' },
    { userId: 'U6', title: '代禱', perms: 'session', joined: '2026/11/5 21:05' },
  ];
  const all = ITEMS.map(x => x.k);
  const sessions = [
    { id: 'S1', title: '一中街掃街', date: '2026-11-07', start: '14:00', end: '16:30', place: '一中街', items: all, creatorId: 'U2', note: '' },
    { id: 'S2', title: '大學校園', date: '2026-11-10', start: '18:30', end: '20:30', place: '中興大學', items: ['contact', 'tract', 'preach', 'call', 'valid'], creatorId: 'U1', note: '' },
    { id: 'S3', title: '社區叩門', date: '2026-11-14', start: '09:30', end: '11:30', place: '北屯區崇德路社區', items: ['contact', 'visit', 'tract', 'preach', 'call', 'valid'], creatorId: 'U4', note: '兩人一組，帶福音單張與小冊' },
    { id: 'S4', title: '公園福音', date: '2026-11-17', start: '19:00', end: '20:30', place: '文心森林公園', items: ['contact', 'tract', 'preach', 'call', 'valid'], creatorId: 'U2', note: '' },
    { id: 'S5', title: '一中街掃街', date: '2026-11-20', start: '14:00', end: '17:00', place: '一中街', items: all, creatorId: 'U2', note: '' },
    { id: 'S6', title: '週六社區叩門', date: '2026-11-21', start: '09:30', end: '11:30', place: '西屯區福科路社區', items: ['contact', 'visit', 'tract', 'preach', 'call', 'valid'], creatorId: 'U1', note: '' },
  ];
  let seed = 7; const rnd = n => { seed = (seed * 9301 + 49297) % 233280; return Math.floor(seed / 233280 * n); };
  const counts = [];
  const join = { S1: ['U2', 'U1', 'U3', 'U4'], S2: ['U1', 'U5', 'U6'], S3: ['U4', 'U2', 'U3', 'U5'], S4: ['U2', 'U1', 'U6'], S5: ['U2', 'U1', 'U3'], S6: ['U1'] };
  sessions.forEach(s => (join[s.id] || []).forEach(u => {
    const c = {};
    if (s.id !== 'S6') s.items.forEach(k => { const base = { contact: 14, visit: 6, tract: 30, preach: 8, call: 4, valid: 1 }[k]; const n = base + rnd(base + 2); if (k !== 'valid') c[k] = n; });
    if (s.id === 'S5' && u === 'U2') Object.assign(c, { contact: 9, visit: 3, tract: 22, preach: 5, call: 2 });
    counts.push({ sid: s.id, userId: u, counts: c, updated: '' });
  }));
  const C = (id, sid, uid, o) => Object.assign({ id, sessionId: sid, ownerId: uid, name: '', gender: '', age: '', phone: '', lineId: '', address: '', open: '', photos: [], fu: false, jia: false, pai: false, qu: false, urgent: false, note: '', created: '', updated: '' }, o);
  const cards = [
    C('C1', 'S1', 'U2', { name: '王大明', gender: '男', age: '青職', phone: '0912-345-678', lineId: 'daming88', open: 'A', fu: true, jia: true, urgent: true, note: '剛到台中工作，願意下週來家聚會', created: '2026/11/7 15:02' }),
    C('C2', 'S1', 'U3', { name: '李欣怡', gender: '女', age: '大學', phone: '0933-222-111', open: 'B', jia: true, created: '2026/11/7 15:30' }),
    C('C3', 'S1', 'U4', { name: '張阿姨', gender: '女', age: '年長', address: '台中市北區育才街 12 號', open: 'A', fu: true, created: '2026/11/7 16:01' }),
    C('C4', 'S1', 'U1', { name: '陳冠宇', gender: '男', age: '中學', open: 'B', pai: true, created: '2026/11/7 16:10' }),
    C('C5', 'S2', 'U5', { name: '吳哲安', gender: '男', age: '大學', lineId: 'zhean.wu', open: 'A', pai: true, qu: true, urgent: true, created: '2026/11/10 19:20' }),
    C('C6', 'S2', 'U6', { name: '劉品妤', gender: '女', age: '大學', phone: '0988-555-123', open: 'A', fu: true, pai: true, created: '2026/11/10 19:45' }),
    C('C7', 'S2', 'U1', { name: '蔡承翰', gender: '男', age: '大學', open: 'C', created: '2026/11/10 20:02' }),
    C('C8', 'S3', 'U4', { name: '林媽媽', gender: '女', age: '中壯', address: '北屯區崇德路二段 88 巷 3 號', open: 'A', jia: true, qu: true, created: '2026/11/14 10:05' }),
    C('C9', 'S3', 'U2', { name: '黃先生', gender: '男', age: '中壯', phone: '0921-000-888', open: 'B', jia: true, created: '2026/11/14 10:40' }),
    C('C10', 'S3', 'U3', { name: '小芸', gender: '女', age: '兒童', open: 'A', qu: true, note: '林媽媽的女兒', created: '2026/11/14 10:45' }),
    C('C11', 'S4', 'U6', { name: '鄭伯伯', gender: '男', age: '年長', open: 'A', fu: true, urgent: true, created: '2026/11/17 19:40' }),
    C('C12', 'S4', 'U2', { name: '許嘉玲', gender: '女', age: '青壯', lineId: 'jialing', open: 'B', jia: true, created: '2026/11/17 20:05' }),
    C('C13', 'S5', 'U2', { name: '周子豪', gender: '男', age: '中學', phone: '0955-321-654', open: 'A', pai: true, created: '2026/11/20 14:40' }),
    C('C14', 'S5', 'U1', { name: '楊雅婷', gender: '女', age: '大學', open: 'B', created: '2026/11/20 14:55' }),
  ];
  if (DEMO_MODE === 'first') { delete people.U2; }
  return {
    me: { userId: 'U2', displayName: '晨光', isAdmin: false },
    people, members, sessions, counts, cards,
    team: { id: 'T1', title: '2026 秋季台中一中福音開展隊', desc: '每週出外開展，記錄接觸的人，一起為他們禱告。', start: '2026-11-01', end: '2026-12-20', theme: 'gospel', code: 'K7Q2M9XA', open: true, ownerId: 'U2', owner: '簡晨光', created: '2026/11/1' },
    teams: [{ id: 'T2', title: '寒假校園福音開展', desc: '', start: '2027-01-18', end: '2027-02-10', theme: 'sky', owner: '孫學暐', member: true, title2: '隊員', role: 'member', memberCount: 9, sessionCount: 0, lastDate: '', cardCount: 0 }],
  };
})();
const DPERM = s => { if (s === 'owner') return { owner: true, manage: true, session: true, contacts: true, editAll: true }; const a = String(s).split(','); return { owner: false, ...Object.fromEntries(PERMS.map(p => [p.k, a.includes(p.k)])) }; };
const DPERMSTR = p => PERMS.filter(x => p && p[x.k]).map(x => x.k).join(',');

function demoTeam() {
  const me = demo.me.userId, d = demo;
  const myM = d.members.find(m => m.userId === me);
  const perms = myM ? DPERM(myM.perms) : DPERM('');
  const nm = u => d.people[u] || '';
  return {
    team: { ...d.team },
    me: { userId: me, name: nm(me), perms, member: !!myM, isAdmin: false },
    members: d.members.map(m => ({ userId: m.userId, name: nm(m.userId), title: m.title, perms: DPERM(m.perms), joined: m.joined })),
    sessions: d.sessions.map(s => ({ ...s, creator: nm(s.creatorId), parts: d.counts.filter(c => c.sid === s.id).map(c => ({ userId: c.userId, name: nm(c.userId), counts: { ...c.counts }, updated: c.updated })) })),
    cards: d.cards.map(c => {
      const x = { ...c, photos: [...c.photos], owner: nm(c.ownerId), canEdit: c.ownerId === me || perms.editAll || perms.manage };
      if (!perms.contacts && c.ownerId !== me) { x.phone = x.lineId = x.address = x.note = ''; x.photos = []; x.hidden = true; }
      return x;
    }),
  };
}
async function demoApi(action, p) {
  await sleep(PARAMS.has('slow') ? 1500 : 200);
  const d = demo, me = d.me.userId;
  const S = id => { const s = d.sessions.find(x => x.id === id); if (!s) throw new Error('找不到這個開展時段'); return s; };
  switch (action) {
    case 'home': return { ok: true, me: { ...d.me, name: d.people[me] || '' }, teams: [{ ...d.team, member: true, title2: '隊長', role: 'owner', memberCount: d.members.length, sessionCount: d.sessions.length, lastDate: '2026-11-21', cardCount: d.cards.length }, ...d.teams] };
    case 'saveProfile': if (!String(p.name || '').trim()) throw new Error('請填寫姓名'); d.people[me] = p.name.trim(); return { ok: true, profile: { name: d.people[me] } };
    case 'team': return { ok: true, ...demoTeam() };
    case 'invite': return { ok: true, team: d.team, memberCount: d.members.length, already: DEMO_MODE !== 'join', name: d.people[me] || '' };
    case 'joinTeam': if (p.name) d.people[me] = p.name; if (!d.members.some(m => m.userId === me)) d.members.push({ userId: me, title: '隊員', perms: 'session', joined: '' }); return { ok: true, teamId: 'T1' };
    case 'createTeam': d.team = { ...d.team, ...p.team, id: 'T1' }; return { ok: true, team: d.team };
    case 'updateTeam': Object.assign(d.team, p.team); return { ok: true, team: d.team };
    case 'resetInvite': d.team.code = Math.random().toString(36).slice(2, 10).toUpperCase(); return { ok: true, team: d.team };
    case 'deleteTeam': return { ok: true };
    case 'setMember': { const m = d.members.find(x => x.userId === p.userId); if (p.title != null) m.title = p.title; if (p.perms && m.perms !== 'owner') m.perms = DPERMSTR(p.perms); return { ok: true, ...demoTeam() }; }
    case 'removeMember': d.members = d.members.filter(x => x.userId !== p.userId); return { ok: true, ...demoTeam() };
    case 'leaveTeam': return { ok: true };
    case 'createSession': { const id = 'S' + Date.now(); d.sessions.push({ ...p.ses, id, creatorId: me }); d.counts.push({ sid: id, userId: me, counts: {} }); return { ok: true, sessionId: id }; }
    case 'updateSession': Object.assign(S(p.sessionId), p.ses); return { ok: true };
    case 'deleteSession': d.sessions = d.sessions.filter(x => x.id !== p.sessionId); d.cards = d.cards.filter(c => c.sessionId !== p.sessionId); return { ok: true };
    case 'joinSession': if (!d.counts.some(c => c.sid === p.sessionId && c.userId === me)) d.counts.push({ sid: p.sessionId, userId: me, counts: {} }); return { ok: true };
    case 'leaveSession': d.counts = d.counts.filter(c => !(c.sid === p.sessionId && c.userId === me)); return { ok: true };
    case 'saveCounts': { let c = d.counts.find(x => x.sid === p.sessionId && x.userId === me); if (!c) d.counts.push(c = { sid: p.sessionId, userId: me }); c.counts = { ...p.counts }; return { ok: true, counts: c.counts }; }
    case 'saveCard': {
      const c = p.card;
      if (c.id) { const x = d.cards.find(y => y.id === c.id); Object.assign(x, c, { updated: '剛剛' }); return { ok: true, card: { ...x, owner: d.people[x.ownerId], canEdit: true } }; }
      const x = { ...c, id: 'C' + Date.now(), ownerId: me, created: `${md(now())} ${pad(now().getHours())}:${pad(now().getMinutes())}` };
      d.cards.push(x); return { ok: true, card: { ...x, owner: d.people[me], canEdit: true } };
    }
    case 'setCardFlags': { const x = d.cards.find(y => y.id === p.cardId); Object.assign(x, p.flags); return { ok: true, card: { ...x, owner: d.people[x.ownerId], canEdit: true } }; }
    case 'deleteCard': d.cards = d.cards.filter(y => y.id !== p.cardId); return { ok: true };
    case 'uploadImage': return { ok: true, url: p.data };
    case 'myData': return { ok: true, found: !!d.people[me], name: d.people[me] || '', lineName: '簡晨光 Isaiah', teams: 2, cards: d.cards.filter(c => c.ownerId === me).length };
    case 'deleteMyData': return { ok: true, cards: 0 };
  }
  throw new Error('預覽模式不支援：' + action);
}
if (DEMO) window.liff = { isInClient: () => false, closeWindow() {}, isApiAvailable: () => false, getContext: () => null, isLoggedIn: () => true };

/* ---------- LINE 程式庫在背景載入、初始化：有 60 天通行證時，畫面不用等它 ---------- */
let LIFF_OK = DEMO;
const LIFF_READY = DEMO ? Promise.resolve() : new Promise((ok, bad) => {
  if (window.liff) return ok();
  const sc = document.createElement('script');
  sc.src = 'https://static.line-scdn.net/liff/edge/2/sdk.js';
  sc.onload = ok; sc.onerror = () => bad(new Error('LINE 程式庫載入失敗，請檢查網路'));
  document.head.append(sc);
}).then(() => liff.init({ liffId: LIFF_ID })).then(() => { LIFF_OK = true; });
LIFF_READY.catch(() => {});
const inClient = () => DEMO ? false : LIFF_OK ? liff.isInClient() : /\bLine\//i.test(navigator.userAgent);
async function closeLine() { await LIFF_READY.catch(() => {}); if (LIFF_OK) liff.closeWindow(); }

/* ---------- 平台通行證：登入一次，60 天內不用再登入 ---------- */
const SESSION_KEY = 'outreach.session';
const getSession = () => { try { const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); return s && s.expires > Date.now() + 60000 ? s : null; } catch (e) { return null; } };
const setSession = s => { try { s ? localStorage.setItem(SESSION_KEY, JSON.stringify({ token: s.token, expires: s.expires })) : localStorage.removeItem(SESSION_KEY); } catch (e) {} };

const READS = new Set(['home', 'team', 'invite', 'myData']);
async function api(action, data = {}) {
  if (DEMO) { const r = await demoApi(action, data); if (!READS.has(action) && action !== 'uploadImage' && action !== 'saveCounts') clearCache(); return JSON.parse(JSON.stringify(r)); }
  const body = { action, ...data };
  const s = action === 'session' ? null : getSession();
  if (s) body.session = s.token; else { await LIFF_READY; body.idToken = liff.getIDToken(); }
  const r = await fetch(GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (!j.ok) {
    if (j.error === 'SESSION_EXPIRED') {
      setSession(null); await LIFF_READY;
      if (liff.isLoggedIn()) return api(action, data);
      liff.login({ redirectUri: location.href }); throw new Error('登入已過期，正在重新登入');
    }
    if (j.error === 'TOKEN_EXPIRED') { await LIFF_READY; liff.logout(); liff.login({ redirectUri: location.href }); throw new Error('登入已過期，正在重新登入'); }
    throw new Error(j.error);
  }
  if (!READS.has(action) && action !== 'session' && action !== 'uploadImage' && action !== 'saveCounts') clearCache();
  return j;
}

/* ---------- 加速：先用上次的資料馬上顯示，背景再向後端拿最新的 ---------- */
const CACHE_KEY = 'outreach.cache.v1';
let CACHE = {};
try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); const tk = (getSession() || {}).token || ''; CACHE = !DEMO && c.owner === tk.slice(0, 12) ? c.data || {} : {}; } catch (e) { CACHE = {}; }
let cacheTimer;
function saveCache() {
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => {
    try {
      const keys = Object.keys(CACHE); while (keys.length > 20) delete CACHE[keys.shift()];
      const str = JSON.stringify({ owner: ((getSession() || {}).token || '').slice(0, 12), data: CACHE });
      if (!DEMO && str.length < 3e6) localStorage.setItem(CACHE_KEY, str); else localStorage.removeItem(CACHE_KEY);
    } catch (e) {}
  }, 300);
}
function clearCache() { CACHE = {}; INFLIGHT.clear(); saveCache(); }
const INFLIGHT = new Map();
const ckey = (action, data) => action + ':' + JSON.stringify(data || {});
function apiCached(action, data = {}, onFresh) {
  const k = ckey(action, data), old = CACHE[k];
  let p = INFLIGHT.get(k);
  if (!p) {
    p = api(action, data).then(r => { CACHE[k] = r; saveCache(); return r; }).finally(() => INFLIGHT.delete(k));
    INFLIGHT.set(k, p);
  }
  if (old === undefined) return p;
  p.then(r => { if (onFresh && JSON.stringify(r) !== JSON.stringify(old)) onFresh(r); }).catch(() => {});
  return Promise.resolve(JSON.parse(JSON.stringify(old)));
}

/* ---------- 發到 LINE ---------- */
async function pickAndSend(msg, done = '已發送') {
  if (DEMO) { toast('預覽模式：正式版會在這裡跳出 LINE 的群組、好友選單'); return false; }
  try { await LIFF_READY; } catch (e) { toast(e.message); return false; }
  if (!liff.isLoggedIn()) { toast('發到 LINE 前需要登入一次'); setTimeout(() => liff.login({ redirectUri: location.href }), 600); return false; }
  if (!liff.isApiAvailable('shareTargetPicker')) { toast('無法開啟 LINE 選單，請確認 LIFF 已開啟 Share target picker'); return false; }
  try { const res = await liff.shareTargetPicker([msg], { isMultiple: true }); toast(res ? done : '已取消'); return !!res; }
  catch (e) { toast('發送失敗：' + e.message); return false; }
}
const liffUrl = q => DEMO ? `${location.origin}${location.pathname}?demo&${q}` : `https://liff.line.me/${LIFF_ID}?${q}`;

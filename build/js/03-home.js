/* ================= 入口 ================= */
let ME = null;     // { userId, name, isAdmin }
let HOME = null;   // 首頁的開展隊列表
async function main() {
  try {
    if (PARAMS.has('install')) return installFlow();
    // 從 liff.line.me 進來時，參數包在 liff.state 裡
    const st = PARAMS.get('liff.state');
    if (st) { const q = st.includes('?') ? st.slice(st.indexOf('?') + 1) : ''; new URLSearchParams(q).forEach((v, k) => PARAMS.set(k, v)); }
    if (!DEMO && !getSession()) {
      view(loading());
      await LIFF_READY;
      new URLSearchParams(location.search).forEach((v, k) => PARAMS.set(k, v));
      if (!liff.isLoggedIn()) { liff.login({ redirectUri: location.href }); return; }
      api('session').then(setSession).catch(() => {}); // 背景建立 60 天通行證
    }
    if (PARAMS.has('mydata')) return myDataFlow();
    const join = PARAMS.get('join') || (DEMO_MODE === 'join' ? 'K7Q2M9XA' : '');
    if (join) return joinFlow(join);
    const tid = PARAMS.get('t') || (['team', 'session', 'sum', 'all', 'pray', 'mem', 'card'].includes(DEMO_MODE) ? 'T1' : '');
    if (tid) {
      const tab = { sum: 'ses', all: 'all', pray: 'pray', mem: 'mem' }[DEMO_MODE] || PARAMS.get('tab') || 'rec';
      const sub = PARAMS.get('s') || (['session', 'card'].includes(DEMO_MODE) ? 'S5' : '');
      return teamFlow(tid, tab, sub, PARAMS.get('j'));
    }
    await homeFlow();
  } catch (e) { fatal(e); }
}
function fatal(e) {
  view(`<section class="solo"><div class="ticket"><div class="main"><h2 class="title">無法開啟</h2><p>${esc(e.message)}</p><p class="muted">請關閉後從 LINE 重新開啟一次。</p></div></div>
    <button class="btn plain" style="margin-top:16px" onclick="location.href=location.pathname${DEMO ? "+'?demo'" : ''}">回到首頁</button></section>`);
}

const brandHeader = () => `<header class="top"><div class="brand"><img class="logo" src="img/logo.svg" alt="" width="34" height="44"><h1>開展隊紀錄</h1></div><button class="help" id="help" type="button" aria-label="使用教學" data-act="tour">?</button></header>
  ${DEMO ? `<p class="demo-note">預覽模式：目前使用範例資料。</p>` : ''}`;
const subbar = (label, title, act = 'home') => `<div class="subbar"><button class="back" type="button" data-act="${act}">‹ ${esc(label)}</button>${title ? `<h1>${esc(title)}</h1>` : '<span></span>'}</div>`;

/* ================= 首頁：我的開展隊 ================= */
async function homeFlow() {
  setNav(null);
  document.title = 'LINE 開展隊紀錄與彙整建立平台';
  history.replaceState(null, '', location.pathname + (DEMO ? '?demo' : ''));
  if (!HOME) view(`${brandHeader()}${loading()}`);
  const nav = NAV;
  const r = await apiCached('home', {}, fresh => { HOME = fresh; ME = fresh.me; if (nav === NAV) renderHome(); });
  HOME = r; ME = r.me;
  renderHome();
  maybeStartTour();
}
function renderHome() {
  const teams = HOME.teams || [];
  const role = t => t.role === 'owner' ? '負責人' : t.role === 'admin' ? '管理' : t.role === 'platform' ? '平台管理' : '隊員';
  view(`${brandHeader()}
    <p class="hello">${ME.name ? `平安，${esc(ME.name)}！` : '平安！'}選一個開展隊，或建立新的開展隊。</p>
    <div class="team-list">${teams.map(t => { const th = themeOf(t); return `<button class="team-card" type="button" data-act="openTeam" data-id="${esc(t.id)}" style="--tc:${th.btn};--tn:${th.notch}">
      <span class="tc-band"></span>
      <span class="tc-main"><b>${esc(t.title)}</b><small>${esc(periodLabel(t.start, t.end) || '未設定期間')}・${esc(t.title2 || role(t))}</small>
      <span class="tc-stats"><span><b>${t.sessionCount}</b>時段</span><span><b>${t.cardCount}</b>名單</span><span><b>${t.memberCount}</b>隊員</span></span></span></button>`; }).join('')
      || `<div class="empty"><p>還沒有加入任何開展隊。</p><p class="muted">點負責人傳來的邀請連結就能加入；或自己建立一個開展隊，邀請大家一起來。</p></div>`}</div>
    <button class="btn send" type="button" id="new-team" data-act="newTeam" style="margin-top:18px">${ICON.plus} 建立開展隊</button>
    <div class="page-foot"><a class="mydata-link" href="#" data-act="mydata">我的資料</a><a class="mydata-link" href="#" data-act="install">安裝到手機桌面</a></div>`);
}

/* ================= 建立／修改開展隊 ================= */
function teamForm(t, isNew) {
  t = t || { title: '', desc: '', start: ymd(now()), end: '', theme: 'gospel', open: true };
  const needName = isNew && !(ME && ME.name);
  return `<form class="panel" id="team-form" autocomplete="off">
    ${needName ? `<label class="field"><span>你的姓名（隊員會看到）</span><input name="myname" maxlength="20" required></label>` : ''}
    <label class="field"><span>開展隊名稱</span><input name="title" maxlength="40" required value="${esc(t.title)}" placeholder="例如：2026 秋季一中福音開展隊"></label>
    <label class="field"><span>說明（選填）</span><textarea name="desc" maxlength="300" placeholder="目標、範圍、集合地點…">${esc(t.desc)}</textarea></label>
    <div class="row2"><label class="field"><span>開始日</span><input type="date" name="start" value="${esc(t.start)}"></label><label class="field"><span>結束日（選填）</span><input type="date" name="end" value="${esc(t.end)}"></label></div>
    ${isNew ? `<label class="field"><span>你在這個隊的職稱</span><input name="myTitle" maxlength="12" value="隊長"></label>` : ''}
    <div class="field"><span>色調</span><div class="tones" role="radiogroup">${Object.entries(THEMES).map(([k, th]) => `<button type="button" role="radio" aria-checked="${t.theme === k}" data-tone="${k}" style="--sw:${th.btn};--sw2:${th.notch}"><i></i>${th.name}</button>`).join('')}</div></div>
    ${isNew ? '' : `<label class="switch"><input type="checkbox" name="open" ${t.open ? 'checked' : ''}><span>開放用邀請連結加入</span></label>`}
    <button class="btn send" type="submit">${isNew ? '建立開展隊' : '儲存'}</button>
  </form>`;
}
function bindTeamForm(onSubmit) {
  const f = $('team-form');
  f.querySelectorAll('[data-tone]').forEach(b => b.onclick = () => f.querySelectorAll('[data-tone]').forEach(x => x.setAttribute('aria-checked', x === b)));
  f.onsubmit = async e => {
    e.preventDefault();
    const v = n => (f.elements[n] ? f.elements[n].value : '').trim();
    const theme = (f.querySelector('[data-tone][aria-checked="true"]') || {}).dataset?.tone || 'gospel';
    const btn = f.querySelector('[type=submit]'), label = btn.textContent;
    btn.disabled = true; btn.textContent = '儲存中…';
    try { await onSubmit({ title: v('title'), desc: v('desc'), start: v('start'), end: v('end'), theme, myTitle: v('myTitle'), open: f.elements.open ? f.elements.open.checked : true }, v('myname')); }
    catch (err) { toast(err.message); btn.disabled = false; btn.textContent = label; }
  };
}
function newTeamFlow() {
  view(`${subbar('我的開展隊', '建立開展隊')}${teamForm(null, true)}<p class="caption">建立後，你就是這個開展隊的負責人，可以發邀請連結給大家加入。</p>`);
  bindTeamForm(async (team, myname) => {
    const r = await api('createTeam', { team, name: myname });
    if (myname && ME) ME.name = myname;
    HOME = null;
    teamFlow(r.team.id, 'mem', '');
    toast('開展隊建立好了，發邀請連結給大家吧');
  });
}

/* ================= 用邀請連結加入 ================= */
async function joinFlow(code) {
  view(loading());
  const r = await api('invite', { code });
  if (r.already) return teamFlow(r.team.id, 'rec', '');
  const t = r.team, th = themeOf(t);
  document.title = `加入「${t.title}」`;
  view(`<section class="solo" style="${themeVars(th)}">
    <div class="ticket"><div class="main"><p class="kicker">邀請你加入開展隊</p><h2 class="title">${esc(t.title)}</h2>
      <dl>${t.start || t.end ? `<dt>期間</dt><dd>${esc(periodLabel(t.start, t.end))}</dd>` : ''}<dt>負責人</dt><dd>${esc(t.owner)}</dd><dt>隊員</dt><dd>${r.memberCount} 人</dd></dl>
      ${t.desc ? `<p class="desc">${esc(t.desc)}</p>` : ''}</div>
      <div class="perf"></div>
      <div class="result-msg">${t.open ? `<label class="field"><span>你的姓名（隊員會看到）</span><input id="j-name" maxlength="20" value="${esc(r.name)}"></label>
        <button class="btn send" type="button" id="j-go">加入開展隊</button>` : '<p>這個開展隊目前不開放加入，請向負責人詢問。</p>'}</div></div></section>`);
  const go = $('j-go');
  if (go) go.onclick = async () => {
    const name = $('j-name').value.trim();
    if (!name) { toast('請填寫姓名'); return; }
    go.disabled = true; go.textContent = '加入中…';
    try { const j = await api('joinTeam', { code, name }); HOME = null; if (ME) ME.name = name; toast('已加入，一起出去開展吧！'); teamFlow(j.teamId, 'rec', ''); }
    catch (e) { toast(e.message); go.disabled = false; go.textContent = '加入開展隊'; }
  };
}

/* ================= 我的資料 ================= */
async function myDataFlow() {
  setNav(null);
  view(loading());
  const d = await api('myData');
  view(`${subbar('返回', '我的資料')}
    <div class="panel">
      <label class="field"><span>姓名（顯示在開展隊、記名卡片上）</span><input id="md-name" value="${esc(d.name)}" maxlength="20"></label>
      <button class="btn send" type="button" id="md-save">儲存</button>
      <p class="muted" style="margin-top:14px">LINE：${esc(d.lineName || '')}・加入 ${d.teams} 個開展隊・記了 ${d.cards} 張名單</p>
      <p class="muted" style="margin-top:14px">刪除後，你的姓名、計數、你記的名單都會移除，並退出所有開展隊。你建立的開展隊要先刪除。</p>
      <button class="btn cancel" type="button" id="md-del" style="margin-top:10px">刪除我的資料</button>
    </div>`);
  $('md-save').onclick = async () => { try { const r = await api('saveProfile', { name: $('md-name').value.trim() }); if (ME) ME.name = r.profile.name; HOME = null; toast('已儲存'); } catch (e) { toast(e.message); } };
  $('md-del').onclick = async () => {
    if (!await confirmBox({ title: '刪除我的資料？', text: '你的姓名、計數和你記的所有名單都會刪除，無法復原。', ok: '刪除' })) return;
    try { const r = await api('deleteMyData'); setSession(null); view(`<section class="solo"><div class="ticket"><div class="main"><h2 class="title">已刪除你的資料</h2><p>已移除你的資料${r.cards ? `和 ${r.cards} 張名單` : ''}。</p></div></div></section>`); }
    catch (e) { toast(e.message); }
  };
}

/* ================= 安裝到手機桌面（PWA） ================= */
let installPrompt = null;
addEventListener('beforeinstallprompt', e => { e.preventDefault(); installPrompt = e; });
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
async function startInstall() {
  if (inClient()) { await LIFF_READY; liff.openWindow({ url: `${location.origin}${location.pathname}?install=1`, external: true }); return; }
  installFlow();
}
function installFlow() {
  setNav(null);
  document.title = '安裝「開展隊」';
  const steps = isIOS()
    ? `<ol class="install-steps"><li>用 <b>Safari</b> 開啟這個頁面</li><li>點下方的「分享」按鈕</li><li>往下滑，點「<b>加入主畫面</b>」</li><li>按右上角「新增」</li></ol>`
    : `<ol class="install-steps"><li>點上面的「安裝到手機桌面」</li><li>如果沒有反應：點瀏覽器右上角「⋮」選單</li><li>選「<b>安裝應用程式</b>」或「<b>加到主畫面</b>」</li></ol>`;
  view(`<section class="solo install">
    <img class="app-icon" src="icons/icon-192.png" alt="" width="96" height="96"><h1>開展隊</h1>
    <p class="muted">把「LINE 開展隊紀錄與彙整建立平台」放到手機桌面，出去開展時一點就能記錄。</p>
    ${isStandalone() ? '<p class="posted">已經安裝好了，從桌面的圖示打開即可。</p>' : `<button class="btn send" id="do-install" ${isIOS() ? 'hidden' : ''}>安裝到手機桌面</button>${steps}`}
    <p class="muted small">第一次從桌面打開時，會請你用 LINE 帳號登入一次。</p>
    <button class="btn plain" style="margin-top:14px" onclick="location.href='${location.pathname}?pwa=1'">前往平台</button></section>`);
  const btn = $('do-install');
  if (btn) btn.onclick = async () => {
    if (!installPrompt) { toast('請依照下面的步驟，從瀏覽器選單安裝'); return; }
    installPrompt.prompt();
    const r = await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    toast(r && r.outcome === 'accepted' ? '安裝完成，可以從桌面打開了' : '已取消安裝');
  };
}
if ('serviceWorker' in navigator && location.protocol === 'https:') addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));

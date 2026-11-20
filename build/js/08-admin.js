/* ================= 後台管理 =================
   建立開展隊的人：管理自己建立的開展隊；平台管理員（試算表「管理員」工作表）：管理全部 */
let ADM = null;                 // { isAdmin, teams }
const ADM_SEL = new Set();      // 勾選的開展隊
let ADM_Q = '', ADM_SCOPE = 'all', ADM_EDIT = '';
async function adminFlow() {
  setNav(null); TEAM = null;
  document.title = '後台管理';
  history.replaceState(null, '', location.pathname + (DEMO ? '?demo=admin' : '?admin'));
  if (!ADM) view(`${subbar('我的開展隊', '後台管理')}${loading()}`);
  const nav = NAV;
  const r = await apiCached('adminTeams', {}, fresh => { ADM = fresh; if (nav === NAV && !ADM_EDIT) renderAdmin(true); });
  ADM = r; ADM_SEL.clear(); ADM_EDIT = '';
  renderAdmin();
}
function admShown() {
  const q = ADM_Q.trim().toLowerCase();
  return ADM.teams.filter(t => (ADM_SCOPE !== 'mine' || t.mine) && (!q || `${t.title} ${t.owner} ${t.desc}`.toLowerCase().includes(q)));
}
function renderAdmin(keep) {
  if (ADM_EDIT) return renderAdminEdit(ADM.teams.find(t => t.id === ADM_EDIT));
  const shown = admShown(), sum = k => shown.reduce((n, t) => n + (t[k] || 0), 0);
  [...ADM_SEL].forEach(id => { if (!ADM.teams.some(t => t.id === id)) ADM_SEL.delete(id); });
  const allOn = shown.length && shown.every(t => ADM_SEL.has(t.id));
  view(`${subbar('我的開展隊', '後台管理')}
    <p class="adm-who">${ADM.isAdmin ? '你是<b>平台管理員</b>，可以管理所有開展隊。' : '這裡列出你建立的開展隊，可以修改、開放／關閉加入、刪除。'}</p>
    <section class="panel" id="adm-sum">
      <div class="sec-h"><h2>總覽</h2>${tools('admin', 'adm-sum', '後台總覽')}</div>
      <div class="tiles"><div class="tile"><b>${shown.length}</b><small>開展隊</small></div><div class="tile"><b>${sum('memberCount')}</b><small>隊員</small></div><div class="tile"><b>${sum('sessionCount')}</b><small>時段</small></div>
        <div class="tile"><b>${sum('partCount')}</b><small>參與人次</small></div><div class="tile"><b>${sum('cardCount')}</b><small>名單</small></div><div class="tile"><b>${shown.filter(t => t.open).length}</b><small>開放加入</small></div></div>
    </section>
    <div class="adm-bar no-shot">
      <input class="inp" id="adm-q" type="search" placeholder="搜尋開展隊名稱、建立者" value="${esc(ADM_Q)}">
      ${ADM.isAdmin ? `<div class="seg" role="tablist"><button type="button" data-act="admScope" data-k="all" aria-selected="${ADM_SCOPE === 'all'}">全部 ${ADM.teams.length}</button><button type="button" data-act="admScope" data-k="mine" aria-selected="${ADM_SCOPE === 'mine'}">我建立的 ${ADM.teams.filter(t => t.mine).length}</button></div>` : ''}
    </div>
    <div class="adm-head no-shot"><label class="check-inline"><input type="checkbox" id="adm-all" ${allOn ? 'checked' : ''}><span>全選</span></label><span class="muted small">${shown.length} 個開展隊</span></div>
    <div class="adm-list">${shown.map(admRow).join('') || `<div class="empty"><p>${ADM_Q ? '找不到符合的開展隊。' : '還沒有建立任何開展隊。'}</p></div>`}</div>
    ${ADM_SEL.size ? `<div class="adm-dock no-shot"><div class="inner"><span><b>${ADM_SEL.size}</b> 個已選</span>
      <button class="btn plain small" type="button" data-act="admBulkOpen" data-v="1">開放加入</button><button class="btn plain small" type="button" data-act="admBulkOpen" data-v="0">關閉加入</button>
      <button class="btn danger-fill small" type="button" data-act="admBulkDel">刪除</button></div></div>` : ''}`, keep);
  const q = $('adm-q');
  q.oninput = () => { ADM_Q = q.value; const pos = q.selectionStart; renderAdmin(true); const n = $('adm-q'); n.focus(); n.setSelectionRange(pos, pos); };
  $('adm-all').onchange = e => { shown.forEach(t => e.target.checked ? ADM_SEL.add(t.id) : ADM_SEL.delete(t.id)); renderAdmin(true); };
}
function admRow(t) {
  const th = themeOf(t);
  return `<article class="adm-row ${ADM_SEL.has(t.id) ? 'sel' : ''}" style="--tc:${th.btn};--tn:${th.notch}">
    <label class="adm-check no-shot" aria-label="選取 ${esc(t.title)}"><input type="checkbox" data-adm-sel="${esc(t.id)}" ${ADM_SEL.has(t.id) ? 'checked' : ''}></label>
    <div class="adm-main">
      <div class="adm-t"><b>${esc(t.title)}</b><span class="state ${t.open ? 's-on' : 's-end'}">${t.open ? '開放加入' : '不開放'}</span></div>
      <p class="muted small">${esc(periodLabel(t.start, t.end) || '未設定期間')}・建立者 ${esc(t.owner)}${t.mine ? '（我）' : ''}・${esc(t.created)} 建立</p>
      <p class="adm-stats"><span><b>${t.memberCount}</b>隊員</span><span><b>${t.sessionCount}</b>時段</span><span><b>${t.partCount || 0}</b>人次</span><span><b>${t.cardCount}</b>名單</span>${t.lastDate ? `<span class="muted small">最近 ${esc(dayLabel(t.lastDate))}</span>` : ''}</p>
      <div class="adm-acts no-shot">
        <button class="btn send small" type="button" data-act="admOpenTeam" data-id="${esc(t.id)}">進入</button>
        <button class="btn plain small" type="button" data-act="admEdit" data-id="${esc(t.id)}">修改</button>
        <button class="btn plain small" type="button" data-act="admToggle" data-id="${esc(t.id)}">${t.open ? '關閉加入' : '開放加入'}</button>
        <button class="btn cancel small" type="button" data-act="admDel" data-id="${esc(t.id)}">刪除</button>
      </div></div></article>`;
}
function renderAdminEdit(t) {
  if (!t) { ADM_EDIT = ''; return renderAdmin(); }
  view(`${subbar('後台管理', '修改開展隊', 'admBack')}${teamForm(t, false)}<p class="caption">建立者：${esc(t.owner)}・隊員 ${t.memberCount} 人</p>`);
  bindTeamForm(async team => {
    await api('adminUpdate', { teamId: t.id, team });
    ADM_EDIT = ''; HOME = null; toast('已儲存');
    const r = await api('adminTeams'); ADM = r; renderAdmin();
  });
}
async function admDelete(ids) {
  const list = ADM.teams.filter(t => ids.includes(t.id));
  const cards = list.reduce((n, t) => n + t.cardCount, 0), ses = list.reduce((n, t) => n + t.sessionCount, 0);
  const title = list.length === 1 ? `刪除「${list[0].title}」？` : `刪除選取的 ${list.length} 個開展隊？`;
  if (!await confirmBox({ title, text: `${list.length > 1 ? list.map(t => `「${t.title}」`).join('、') + '。' : ''}會一併刪除 ${ses} 個時段、所有計數和 ${cards} 張記名卡片，隊員也看不到了，無法復原。`, ok: '刪除' })) return;
  const r = await api('adminDelete', { teamIds: ids });
  ids.forEach(id => ADM_SEL.delete(id)); ADM = r; HOME = null; TEAM = null;
  toast(`已刪除 ${list.length} 個開展隊`); renderAdmin(true);
}
async function admSetOpen(ids, open) {
  const r = await api('adminSetOpen', { teamIds: ids, open });
  ADM = r; HOME = null; toast(open ? '已開放加入' : '已關閉加入'); renderAdmin(true);
}
Object.assign(ACTS, {
  admin: () => { ADM = null; adminFlow(); },
  admBack: () => { ADM_EDIT = ''; renderAdmin(); },
  admScope: b => { ADM_SCOPE = b.dataset.k; renderAdmin(true); },
  admOpenTeam: b => teamFlow(b.dataset.id, 'rec', ''),
  admEdit: b => { ADM_EDIT = b.dataset.id; renderAdmin(); },
  admToggle: b => { const t = ADM.teams.find(x => x.id === b.dataset.id); return admSetOpen([t.id], !t.open); },
  admDel: b => admDelete([b.dataset.id]),
  admBulkDel: () => admDelete([...ADM_SEL]),
  admBulkOpen: b => admSetOpen([...ADM_SEL], b.dataset.v === '1'),
});
document.addEventListener('change', e => { const id = e.target.dataset && e.target.dataset.admSel; if (id) { e.target.checked ? ADM_SEL.add(id) : ADM_SEL.delete(id); renderAdmin(true); } });
COPY.admin = () => { const l = admShown(); return [`【開展隊後台】${l.length} 個開展隊`, ...l.map((t, i) => `${i + 1}. ${t.title}（${t.open ? '開放加入' : '不開放'}）建立者 ${t.owner}・隊員 ${t.memberCount}・時段 ${t.sessionCount}・名單 ${t.cardCount}`)].join('\n'); };

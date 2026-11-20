/* ================= 彙整共用：名單表格（點一列展開完整記名卡片） ================= */
const OPEN_ROWS = new Set();
let LIST_FILTER = 'all';
function listTable(cards, id, opt = {}) {
  if (!cards.length) return '<p class="muted empty-cards">還沒有有效名單。</p>';
  return `<div class="tbl-wrap"><table class="tbl names-tbl" id="${id}"><thead><tr><th>#</th><th>姓名</th><th>身分</th><th>年齡段</th><th>敞開</th><th>開展者</th></tr></thead><tbody>
    ${cards.map((c, i) => `<tr class="row ${c.urgent ? 'urgent' : ''}" data-act="toggleRow" data-id="${esc(c.id)}" aria-expanded="${OPEN_ROWS.has(c.id)}" tabindex="0">
      <td>${i + 1}</td><td class="nm">${c.urgent ? `<span class="star-s">${ICON.star}</span>` : ''}${esc(c.name) || '—'}${FLAGS.filter(f => c[f.k]).map(f => `<i class="fl" style="--fc:${f.color}">${f.short}</i>`).join('')}</td>
      <td>${esc(c.gender) || '—'}</td><td>${esc(c.age) || '—'}</td><td>${c.open ? `<span class="tag open-${c.open}">${c.open}</span>` : '—'}</td><td>${esc(c.owner)}</td></tr>
      ${OPEN_ROWS.has(c.id) ? `<tr class="detail"><td colspan="6">${cardHtml(c, { showSes: opt.showSes })}</td></tr>` : ''}`).join('')}
  </tbody></table></div><p class="tbl-hint no-shot">點一列可以展開完整的記名卡片。</p>`;
}
/** 計數表：每一列一個人（或一個時段），最後一列合計 */
function countTable(rows, items, firstCol) {
  const tot = items.map(k => rows.reduce((n, r) => n + (r.v[k] || 0), 0));
  return `<div class="tbl-wrap"><table class="tbl num-tbl"><thead><tr><th>${firstCol}</th>${items.map(k => `<th>${ITEM[k].short}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(r => `<tr><td class="nm">${r.label}</td>${items.map(k => `<td>${r.v[k] == null ? '<span class="muted">–</span>' : r.v[k]}</td>`).join('')}</tr>`).join('')}
    </tbody><tfoot><tr><td>合計</td>${tot.map(n => `<td>${n}</td>`).join('')}</tr></tfoot></table></div>`;
}

/* ================= 時段彙整 ================= */
function renderSesSum() {
  const list = sortSes(TEAM.sessions);
  if (!list.length) return `<div class="empty"><p>還沒有開展時段。</p><p class="muted">在「開展紀錄」建立時段、記錄之後，這裡會自動彙整。</p></div>`;
  const s = sesById(SUB) || list.find(x => sesState(x) !== '即將') || list[0];
  SUB = s.id;
  const cards = sortCards(cardsIn(s.id));
  return `<label class="field ses-pick"><span>選擇開展時段</span><select class="inp" id="sum-pick">${list.map(x => `<option value="${esc(x.id)}" ${x.id === s.id ? 'selected' : ''}>${esc(dayLabel(x.date))} ${esc(sesName(x))}（${sesState(x)}）</option>`).join('')}</select></label>
    <section class="panel sum" id="sum-ses">
      <div class="sec-h stack"><div><h2>${esc(sesName(s))}</h2><p class="muted small">${esc(sesLabel(s))}・${s.parts.length} 人參加</p></div>${tools(`sum:${s.id}`, 'sum-ses', `${sesName(s)}-時段彙整`, `<button type="button" class="tool" data-act="sendSum" data-id="${esc(s.id)}" aria-label="發到 LINE">${ICON.send}<span>LINE</span></button>`)}</div>
      <div class="tiles">${s.items.map(k => `<div class="tile"><b>${sesTotal(s, k)}</b><small>${ITEM[k].label}</small></div>`).join('')}</div>
      <h3 class="tbl-h">計數彙整</h3>
      ${s.parts.length ? countTable(s.parts.map(p => ({ label: esc(p.name), v: Object.fromEntries(s.items.map(k => [k, countOf(s, p, k)])) })), s.items, '開展者') : '<p class="muted">還沒有人加入。</p>'}
      <h3 class="tbl-h">名單彙整<span class="n">${cards.length}</span></h3>
      ${listTable(cards, 'tbl-ses')}
    </section>`;
}
/** 名單排序：迫切的在前，再依敞開程度 A→B→C */
const sortCards = list => list.slice().sort((a, b) => (b.urgent - a.urgent) || ((a.open || 'Z').localeCompare(b.open || 'Z')));

/* ================= 累積彙整 ================= */
function renderAll() {
  const ss = sortSes(TEAM.sessions).filter(s => sesState(s) !== '即將' || s.parts.some(p => Object.keys(p.counts || {}).length));
  const used = ITEMS.map(x => x.k).filter(k => ss.some(s => s.items.includes(k)));
  const tot = k => ss.reduce((n, s) => n + (s.items.includes(k) ? sesTotal(s, k) : 0), 0);
  const people = {};
  ss.forEach(s => s.parts.forEach(p => {
    const r = people[p.userId] || (people[p.userId] = { label: esc(p.name), n: 0, v: {} });
    r.n++;
    s.items.forEach(k => { r.v[k] = (r.v[k] || 0) + countOf(s, p, k); });
  }));
  const all = sortCards(TEAM.cards);
  const filters = [['all', '全部', all.length], ['A', 'A 非常敞開', all.filter(c => c.open === 'A').length], ['B', 'B 普通', all.filter(c => c.open === 'B').length], ['C', 'C 較無興趣', all.filter(c => c.open === 'C').length], ['urgent', '迫切代禱', all.filter(c => c.urgent).length]];
  const shown = all.filter(c => LIST_FILTER === 'all' || (LIST_FILTER === 'urgent' ? c.urgent : c.open === LIST_FILTER));
  const t = TEAM.team;
  return `<section class="panel sum" id="sum-all">
      <div class="sec-h stack"><div><h2>累積到目前</h2><p class="muted small">${esc(periodLabel(t.start, t.end))}${t.start || t.end ? '・' : ''}${ss.length} 個時段・${Object.values(people).reduce((n, r) => n + r.n, 0)} 人次</p></div>${tools('all', 'sum-all', `${t.title}-累積彙整`)}</div>
      <div class="tiles">${used.map(k => `<div class="tile"><b>${tot(k)}</b><small>${ITEM[k].label}</small></div>`).join('') || '<p class="muted">還沒有紀錄。</p>'}</div>
      ${ss.length ? `<h3 class="tbl-h">各時段計數</h3>${countTable(ss.map(s => ({ label: `${esc(dayLabel(s.date))}<small>${esc(sesName(s))}</small>`, v: Object.fromEntries(used.map(k => [k, s.items.includes(k) ? sesTotal(s, k) : null])) })), used, '時段')}
      <h3 class="tbl-h">各隊員計數</h3>${countTable(Object.values(people).map(r => ({ label: `${r.label}<small>${r.n} 次</small>`, v: r.v })), used, '隊員')}` : ''}
    </section>
    <section class="panel sum" id="sum-list">
      <div class="sec-h"><h2>累積名單<span class="n">${all.length}</span></h2>${tools('list', 'sum-list', `${t.title}-累積名單`)}</div>
      <div class="chips no-shot">${filters.map(([k, l, n]) => `<button class="chip ${LIST_FILTER === k ? 'on' : ''}" type="button" data-act="listFilter" data-k="${k}">${l} ${n}</button>`).join('')}</div>
      ${LIST_FILTER !== 'all' ? `<p class="shot-only shot-cap">篩選：${filters.find(f => f[0] === LIST_FILTER)[1]}</p>` : ''}
      ${listTable(shown, 'tbl-all', { showSes: true })}
    </section>`;
}

/* ================= 代禱牆 ================= */
function prayNames(k) { return sortCards(TEAM.cards.filter(c => c[k])).sort((a, b) => b.urgent - a.urgent); }
function renderPray() {
  const urgent = TEAM.cards.filter(c => c.urgent);
  return `<section class="pray-wall" id="pray-wall">
    <div class="sec-h"><div><h2>代禱牆</h2><p class="muted small">${esc(TEAM.team.title)}</p></div>${tools('pray', 'pray-wall', `${TEAM.team.title}-代禱牆`)}</div>
    ${urgent.length ? `<p class="urgent-sum">${ICON.star} 迫切代禱 ${urgent.length} 人：${urgent.map(c => esc(c.name || '（未填姓名）')).join('、')}</p>` : ''}
    <div class="blocks">${FLAGS.map(f => { const l = prayNames(f.k); return `<div class="pblock" id="pb-${f.k}" style="--fc:${f.color}">
      <div class="pb-h"><span class="pb-ch">${f.short}</span><b>${f.label.slice(2, -1)}</b><span class="n">${l.length}</span>${tools(`pray:${f.k}`, `pb-${f.k}`, `代禱牆-${f.label}`)}</div>
      <div class="pb-names">${l.map(c => `<span class="pn ${c.urgent ? 'hot' : ''}" data-act="prayCard" data-id="${esc(c.id)}">${c.urgent ? ICON.star : ''}${esc(c.name || '（未填姓名）')}<small>（${esc(c.owner)}）</small></span>`).join('') || '<span class="muted small">還沒有人</span>'}</div></div>`; }).join('')}</div>
    <p class="muted small no-shot pray-tip">在記名卡片上勾選「福、家、排、區」，名字就會出現在相應的區塊；勾「迫切代禱」的名字會特別顯眼。點名字可以看記名卡片。</p>
  </section>`;
}

/* ================= 一鍵複製的文字 ================= */
const line = '────────';
function cardText(c, withSes = true) {
  const s = sesById(c.sessionId) || {};
  const L = [`【${c.name || '（未填姓名）'}】${c.urgent ? '★迫切代禱' : ''}`];
  const tag = [c.gender, c.age, c.open ? openLabel(c.open) : ''].filter(Boolean).join('／'); if (tag) L.push(tag);
  if (c.phone) L.push(`手機：${c.phone}`);
  if (c.lineId) L.push(`LINE ID：${c.lineId}`);
  if (c.address) L.push(`地址：${c.address}`);
  const fl = FLAGS.filter(f => c[f.k]).map(f => f.label); if (fl.length) L.push(`狀態：${fl.join('、')}`);
  if (c.note) L.push(`備註：${c.note}`);
  L.push(`開展者：${c.owner}${withSes && s.date ? `（${dayLabel(s.date)} ${s.place || ''}）`.replace(' ）', '）') : ''}`);
  return L.join('\n');
}
const countLine = (s, get) => s.items.map(k => `${ITEM[k].label} ${get(k)}`).join('｜');
const cardBrief = (c, i) => `${i + 1}. ${c.name || '（未填姓名）'}${c.urgent ? '★' : ''}（${[c.gender, c.age, c.open].filter(Boolean).join('／') || '—'}）${c.owner}`;
const COPY = {
  card: id => cardText(TEAM.cards.find(c => c.id === id)),
  sesinfo: id => { const s = sesById(id); return [`【開展時段】${sesName(s)}`, sesLabel(s), s.note, `建立：${s.creator}`, `參加：${s.parts.map(p => p.name).join('、') || '—'}`, `加入：${liffUrl(`t=${encodeURIComponent(TEAM.team.id)}&s=${encodeURIComponent(s.id)}`)}`].filter(Boolean).join('\n'); },
  rec: id => {
    const s = sesById(id), p = partOf(s, TEAM.me.userId), cards = cardsIn(id, TEAM.me.userId);
    return [`【開展紀錄】${sesName(s)}`, sesLabel(s), `開展者：${TEAM.me.name}`, countLine(s, k => countOf(s, p, k)), ...(cards.length ? [line, '有效名單：', ...cards.map(cardBrief)] : [])].join('\n');
  },
  sum: id => {
    const s = sesById(id), cards = sortCards(cardsIn(id));
    return [`【時段彙整】${sesName(s)}`, sesLabel(s), `參加 ${s.parts.length} 人`, `合計：${countLine(s, k => sesTotal(s, k))}`, line,
      ...s.parts.map(p => `${p.name}：${countLine(s, k => countOf(s, p, k))}`), line, `名單（${cards.length}）：`, ...cards.map(cardBrief)].join('\n');
  },
  all: () => {
    const ss = sortSes(TEAM.sessions).filter(s => sesState(s) !== '即將' || s.parts.some(p => Object.keys(p.counts || {}).length));
    const used = ITEMS.filter(x => ss.some(s => s.items.includes(x.k)));
    return [`【累積彙整】${TEAM.team.title}`, `${ss.length} 個時段`, used.map(x => `${x.label} ${ss.reduce((n, s) => n + (s.items.includes(x.k) ? sesTotal(s, x.k) : 0), 0)}`).join('｜'), line,
      ...ss.map(s => `${dayLabel(s.date)} ${sesName(s)}：${countLine(s, k => sesTotal(s, k))}`)].join('\n');
  },
  list: () => {
    const all = sortCards(TEAM.cards).filter(c => LIST_FILTER === 'all' || (LIST_FILTER === 'urgent' ? c.urgent : c.open === LIST_FILTER));
    return [`【累積名單】${TEAM.team.title}（${all.length} 人）`, ...all.map(cardBrief)].join('\n');
  },
  pray: k => {
    const block = f => { const l = prayNames(f.k); return [`【${f.label}】${l.length} 人`, ...l.map(c => `${c.urgent ? '★' : '・'}${c.name || '（未填姓名）'}（${c.owner}）`)].join('\n'); };
    if (k) return block(FLAGS.find(f => f.k === k));
    return [`【代禱牆】${TEAM.team.title}`, ...FLAGS.map(block)].join('\n\n') + '\n\n★＝迫切代禱';
  },
};

/* ================= 發到 LINE 的圖卡（Flex Message） ================= */
const flexInfo = (k, v, th) => ({ type: 'box', layout: 'baseline', spacing: 'md', contents: [
  { type: 'text', text: String(k), color: '#7A7A72', size: 'sm', flex: 0 },
  { type: 'text', text: String(v === '' || v == null ? '—' : v), wrap: true, color: '#22302A', size: 'sm', flex: 1, weight: 'bold' } ] });
const flexBtn = (label, uri, th) => ({ type: 'box', layout: 'vertical', paddingAll: '16px', contents: [
  { type: 'box', layout: 'horizontal', spacing: 'md', contents: [
    { type: 'box', layout: 'vertical', width: '6px', cornerRadius: '3px', backgroundColor: th.notch, contents: [] },
    { type: 'button', style: 'primary', color: th.btn, height: 'sm', flex: 1, action: { type: 'uri', label: String(label).slice(0, 20), uri } } ] }] });
/** 圖卡上方：開展隊圖標（有的話）＋小標＋標題 */
function flexHead(t, kicker, title, th) {
  const texts = { type: 'box', layout: 'vertical', flex: 1, contents: [
    { type: 'text', text: kicker, size: 'xs', color: th.btn, weight: 'bold', wrap: true },
    { type: 'text', text: title, weight: 'bold', size: 'xl', color: '#22302A', wrap: true, margin: 'sm' }] };
  if (!isHttps(t.image)) return [texts];
  return [{ type: 'box', layout: 'horizontal', spacing: 'lg', contents: [
    { type: 'box', layout: 'vertical', width: '64px', height: '64px', cornerRadius: '14px', flex: 0, contents: [{ type: 'image', url: t.image, size: 'full', aspectMode: 'cover', aspectRatio: '1:1' }] },
    texts] }];
}
const bubble = (th, body, footer) => ({ type: 'bubble', size: 'mega', styles: { body: { backgroundColor: th.paper }, footer: { backgroundColor: th.paper } },
  body: { type: 'box', layout: 'vertical', paddingAll: '20px', contents: body }, footer });
function inviteFlex(t) {
  const th = themeOf(t);
  const body = [...flexHead(t, '邀請你加入開展隊', t.title, th),
    { type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm', contents: [flexInfo('期間', periodLabel(t.start, t.end), th), flexInfo('負責人', t.owner, th)] }];
  if (t.desc) body.push({ type: 'text', text: t.desc.slice(0, 300), size: 'sm', color: '#66675F', wrap: true, margin: 'lg' });
  return { type: 'flex', altText: `邀請你加入「${t.title}」`, contents: bubble(th, body, flexBtn('加入開展隊', liffUrl(`join=${t.code}`), th)) };
}
function sesFlex(s) {
  const t = TEAM.team, th = themeOf(t);
  const body = [...flexHead(t, `${t.title}・開展時段`, sesName(s), th),
    { type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm', contents: [flexInfo('日期', dayLabel(s.date), th), flexInfo('時間', timeRange(s), th), flexInfo('地點', s.place, th), flexInfo('參加', `${s.parts.length} 人`, th)] }];
  if (s.note) body.push({ type: 'text', text: s.note.slice(0, 300), size: 'sm', color: '#66675F', wrap: true, margin: 'lg' });
  const q = `t=${encodeURIComponent(t.id)}&s=${encodeURIComponent(s.id)}${t.open && t.code ? `&j=${t.code}` : ''}`;
  return { type: 'flex', altText: `一起來開展：${sesLabel(s)}`, contents: bubble(th, body, flexBtn('加入這個時段', liffUrl(q), th)) };
}
function sumFlex(s) {
  const t = TEAM.team, th = themeOf(t), cards = sortCards(cardsIn(s.id));
  const body = [...flexHead(t, `${t.title}・時段彙整`, sesName(s), th),
    { type: 'text', text: `${sesLabel(s)}・${s.parts.length} 人參加`, size: 'xs', color: '#66675F', wrap: true, margin: 'sm' },
    { type: 'box', layout: 'vertical', margin: 'lg', spacing: 'sm', contents: s.items.map(k => flexInfo(ITEM[k].label, sesTotal(s, k), th)) }];
  if (cards.length) {
    body.push({ type: 'separator', margin: 'lg' }, { type: 'text', text: `有效名單（${cards.length}）`, size: 'sm', weight: 'bold', color: '#22302A', margin: 'lg' });
    body.push({ type: 'text', text: cards.slice(0, 40).map((c, i) => `${i + 1}. ${c.name || '—'}${c.urgent ? '★' : ''}（${[c.gender, c.age, c.open].filter(Boolean).join('／') || '—'}）${c.owner}`).join('\n'), size: 'sm', color: '#22302A', wrap: true, margin: 'sm' });
  }
  return { type: 'flex', altText: `時段彙整：${sesName(s)} ${dayLabel(s.date)}`, contents: bubble(th, body, flexBtn('看完整彙整', liffUrl(`t=${encodeURIComponent(t.id)}&tab=ses&s=${encodeURIComponent(s.id)}`), th)) };
}

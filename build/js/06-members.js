/* ================= 隊員：邀請、職稱、權限、開展隊設定 ================= */
let MEM_EDIT = '';   // 正在設定的隊員 userId
let TEAM_EDIT = false;
const permBadges = p => p.owner ? '<span class="tag gold">負責人</span>' : PERMS.filter(x => p[x.k] && x.k !== 'session').map(x => `<span class="tag">${{ manage: '管理', contacts: '看聯絡資料', editAll: '編輯所有卡片' }[x.k]}</span>`).join('') + (p.session ? '' : '<span class="tag muted-tag">不能建時段</span>');
function renderMembers() {
  const t = TEAM.team, me = TEAM.me, can = me.perms.manage;
  if (TEAM_EDIT && can) return `${subbar('隊員', '開展隊設定', 'closeTeamEdit')}${teamForm(t, false)}
    ${me.perms.owner ? `<div class="danger-zone"><p>刪除開展隊會一併刪除所有時段、計數和名單，無法復原。</p><button class="btn cancel" type="button" data-act="delTeam">刪除開展隊</button></div>` : ''}`;
  const stats = uid => { const n = TEAM.sessions.filter(s => partOf(s, uid)).length, c = TEAM.cards.filter(x => x.ownerId === uid).length; return `${n} 個時段・${c} 張名單`; };
  const members = TEAM.members.slice().sort((a, b) => (b.perms.owner - a.perms.owner) || (b.perms.manage - a.perms.manage));
  return `<section class="panel invite" id="invite">
      <h2>邀請隊員</h2>
      ${t.code && t.open ? `<p class="muted small">把邀請連結發到 LINE 群組，大家點了就能用 LINE 登入加入。</p>
        <div class="invite-link"><code>${esc(liffUrl(`join=${t.code}`))}</code></div>
        <div class="btn-row"><button class="btn send" type="button" data-act="sendInvite">${ICON.send} 發到 LINE</button><button class="btn plain" type="button" data-act="copyInvite">${ICON.copy} 複製連結</button></div>
        ${can ? `<p class="small"><a href="#" data-act="resetInvite">重設邀請連結</a>（舊連結會失效）</p>` : ''}`
      : `<p class="muted">${t.open ? '只有負責人和管理者可以發邀請連結。' : '目前不開放加入。'}${can ? '可以在「開展隊設定」打開。' : ''}</p>`}
    </section>
    <div class="sec-h"><h2>隊員<span class="n">${TEAM.members.length}</span></h2>${tools('members', 'mem-list', `${t.title}-隊員`, can ? `<button class="btn plain small" type="button" data-act="teamEdit">開展隊設定</button>` : '')}</div>
    <ul class="members" id="mem-list">${members.map(m => `<li>
      <div class="line1"><span class="nm">${esc(m.name)}${m.userId === me.userId ? '<small>（我）</small>' : ''}</span><span class="ttl">${esc(m.title || '隊員')}</span></div>
      <div class="line2"><span class="badges">${permBadges(m.perms)}</span><span class="muted small">${stats(m.userId)}</span></div>
      ${can && MEM_EDIT !== m.userId ? `<button class="link-btn no-shot" type="button" data-act="memEdit" data-id="${esc(m.userId)}">設定職稱與權限</button>` : ''}
      ${MEM_EDIT === m.userId ? memberEditor(m) : ''}</li>`).join('')}</ul>
    <p class="muted small perm-help">權限說明：${PERMS.map(p => `<b>${p.label}</b>＝${p.help}`).join('；')}。每個人都可以記錄自己的計數和名單。</p>
    ${me.perms.owner && me.member ? '' : `<p class="leave"><a href="#" data-act="leaveTeam">退出這個開展隊</a></p>`}`;
}
function memberEditor(m) {
  const owner = m.perms.owner;
  return `<div class="member-edit no-shot" id="mem-edit">
    <label class="field"><span>職稱</span><input id="me-title" maxlength="12" value="${esc(m.title)}"></label>
    <div class="chips">${TITLE_CHIPS.map(x => `<button class="chip" type="button" data-act="titleChip" data-v="${x}">${x}</button>`).join('')}</div>
    ${owner ? '<p class="muted small">建立開展隊的人擁有所有權限。</p>' : `<div class="perm-presets"><span>快速套用：</span><button class="chip" type="button" data-act="permPreset" data-v="admin">管理者</button><button class="chip" type="button" data-act="permPreset" data-v="member">一般隊員</button></div>
    <div class="checks">${PERMS.map(p => `<label class="check"><input type="checkbox" data-perm="${p.k}" ${m.perms[p.k] ? 'checked' : ''}><span>${p.label}<small>${p.help}</small></span></label>`).join('')}</div>`}
    <div class="btn-row"><button class="btn plain" type="button" data-act="memCancel">取消</button><button class="btn send" type="button" data-act="memSave" data-id="${esc(m.userId)}">儲存</button></div>
    ${owner || m.userId === TEAM.me.userId ? '' : `<button class="link-btn danger" type="button" data-act="memRemove" data-id="${esc(m.userId)}">把 ${esc(m.name)} 移出開展隊</button>`}
  </div>`;
}
COPY.members = () => [`【${TEAM.team.title}】隊員 ${TEAM.members.length} 人`, ...TEAM.members.map((m, i) => `${i + 1}. ${m.name}（${m.title || '隊員'}）`)].join('\n');

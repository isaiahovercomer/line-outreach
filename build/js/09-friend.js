/* ================= 加 LINE 好友：顯示自己的 LINE QR 碼給對方掃 =================
   LINE 不提供讀取個人 QR 碼的方式，所以請使用者貼一次「我的 QR 碼」的連結（或 LINE ID），存在自己的資料裡，之後一按就顯示 */
const myFriendLink = () => (TEAM && TEAM.me && TEAM.me.friendLink) || (ME && ME.friendLink) || '';
function setMyFriendLink(v) { if (TEAM && TEAM.me) TEAM.me.friendLink = v; if (ME) ME.friendLink = v; clearCache(); }
let QR_LIB = null;
function loadQrLib() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  return QR_LIB || (QR_LIB = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'lib/qrcode-generator.js';
    s.onload = () => window.qrcode ? res(window.qrcode) : rej(new Error('QR 碼工具載入失敗'));
    s.onerror = () => { QR_LIB = null; rej(new Error('QR 碼工具載入失敗，請再試一次')); };
    document.head.appendChild(s);
  }));
}
async function qrSvg(text) {
  const qrcode = await loadQrLib();
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag({ cellSize: 8, margin: 2, scalable: true });
}
function sheetBox(inner) {
  $$('.modal.friend').forEach(x => x.remove());
  const box = document.createElement('div');
  box.className = 'modal friend on';
  box.innerHTML = `<div class="modal-panel friend-panel">${inner}</div>`;
  document.body.append(box);
  box.addEventListener('click', e => { if (e.target === box || e.target.closest('[data-close]')) box.remove(); });
  return box;
}
async function showFriendQr() {
  const link = myFriendLink();
  if (!link) return friendSetup();
  const name = (TEAM && TEAM.me && TEAM.me.name) || (ME && ME.name) || '';
  const box = sheetBox(`<div class="qr-card" id="qr-card"><p class="qr-k">掃我加 LINE 好友</p><div class="qr-img">${loading()}</div><p class="qr-name">${esc(name)}</p><p class="qr-tip">打開 LINE →「加入好友」→「行動條碼」掃描</p></div>
    <div class="btn-row no-shot"><button type="button" class="btn plain" data-act="shot" data-id="qr-card" data-name="${esc(name)}-LINE QR碼"><span>存成圖片</span></button><button type="button" class="btn plain" data-act="friendSetup">修改連結</button></div>
    <button type="button" class="btn send" data-close style="margin-top:10px">關閉</button>`);
  try { box.querySelector('.qr-img').innerHTML = await qrSvg(link); }
  catch (e) { box.querySelector('.qr-img').textContent = e.message; }
}
function friendSetup() {
  const box = sheetBox(`<h2>設定我的 LINE QR 碼</h2>
    <p class="muted small">設定一次，之後按「加 LINE 好友」就會顯示你的 QR 碼，讓對方用 LINE 掃描加你。</p>
    <ol class="fr-steps"><li>打開 LINE，點主頁右上角的「加入好友」圖示</li><li>點「行動條碼」→ 下方的「我的 QR 碼」</li><li>點「複製連結」，回到這裡貼上</li></ol>
    <label class="field"><span>我的 QR 碼連結（或 LINE ID）</span><input class="inp" id="fr-link" inputmode="url" autocapitalize="off" placeholder="https://line.me/ti/p/…" value="${esc(myFriendLink())}"></label>
    <p class="muted small">連結只存在平台的試算表裡，用來產生你的 QR 碼。</p>
    <div class="btn-row"><button type="button" class="btn plain" data-close>取消</button><button type="button" class="btn send" id="fr-save">儲存並顯示</button></div>`);
  const inp = box.querySelector('#fr-link'), btn = box.querySelector('#fr-save');
  inp.focus();
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = '儲存中…';
    try { const r = await api('saveFriendLink', { link: inp.value.trim() }); setMyFriendLink(r.friendLink); box.remove(); if (r.friendLink) showFriendQr(); else toast('已清除'); }
    catch (e) { toast(e.message); btn.disabled = false; btn.textContent = '儲存並顯示'; }
  };
}
Object.assign(ACTS, { myQr: () => showFriendQr(), friendSetup: () => friendSetup() });

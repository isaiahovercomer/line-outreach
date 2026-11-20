/* ======== 只需要改這兩行 ======== */
const LIFF_ID = '2012412693-u3yd2OOT';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwReI86HH_MunOwHiBdGuu6bHsJzoZtPep8bsX5IqNelgG5OC7MV9AozfQZ33ITIWgg/exec';
/* ================================ */

let PARAMS = new URLSearchParams(location.search);
// LIFF 還沒設定，或網址帶 ?demo 時，用範例資料預覽畫面
const DEMO = LIFF_ID.startsWith('請填') || PARAMS.has('demo');
const DEMO_MODE = PARAMS.get('demo') || '';

const $app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let NAV = 0; // 每換一次畫面加 1；背景抓到新資料時，只在使用者還停在同一個畫面才重畫
const view = (html, keepScroll) => { NAV++; const y = scrollY; $app.innerHTML = html; window.scrollTo(0, keepScroll ? y : 0); };
const $ = id => document.getElementById(id);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const loading = () => `<div class="loading" role="status"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const isHttps = u => /^https:\/\//.test(u || '');

let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ================= 日期 ================= */
const WD = '日一二三四五六';
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = s => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || ''); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; };
const md = d => `${d.getMonth() + 1}/${d.getDate()}`;
const dayLabel = s => { const d = parseYmd(s); return d ? `${md(d)}（${WD[d.getDay()]}）` : ''; };
const periodLabel = (a, b) => a || b ? `${a ? dayLabel(a) : ''}～${b ? dayLabel(b) : ''}` : '';
const timeRange = s => s.start || s.end ? `${s.start || ''}${s.end ? '–' + s.end : ''}` : '';
/** 時段的標題：「11/20（四）14:00–16:00・一中街」 */
const sesLabel = s => [`${dayLabel(s.date)} ${timeRange(s)}`.trim(), s.place].filter(Boolean).join('・');
const sesName = s => s.title || s.place || '開展時段';
/** 時段狀態：還沒開始／進行中／已結束 */
function sesState(s) {
  const now = DEMO ? DEMO_NOW : new Date();
  const d = parseYmd(s.date); if (!d) return '';
  const at = t => { const m = /^(\d{2}):(\d{2})$/.exec(t || ''); const x = new Date(d); if (m) x.setHours(+m[1], +m[2]); return x; };
  const st = s.start ? at(s.start) : d, en = s.end ? at(s.end) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59);
  if (now < st) return ymd(now) === s.date ? '今天' : '即將';
  if (now > en) return '已結束';
  return '進行中';
}

/* ================= 固定的選項 ================= */
const ITEMS = [
  { k: 'contact', label: '接觸人數', short: '接觸', unit: '人' },
  { k: 'visit', label: '叩訪戶數', short: '叩訪', unit: '戶' },
  { k: 'tract', label: '發單張數', short: '發單', unit: '張' },
  { k: 'preach', label: '傳講人數', short: '傳講', unit: '人' },
  { k: 'call', label: '呼求人數', short: '呼求', unit: '人' },
  { k: 'valid', label: '有效名單', short: '名單', unit: '人' },
];
const ITEM = Object.fromEntries(ITEMS.map(x => [x.k, x]));
const GENDERS = ['男', '女'];
const AGES = ['年長', '中壯', '青壯', '青職', '大學', '中學', '兒童'];
const OPENS = [{ v: 'A', label: 'A 非常敞開' }, { v: 'B', label: 'B 普通不排斥' }, { v: 'C', label: 'C 較無興趣' }];
const openLabel = v => (OPENS.find(o => o.v === v) || {}).label || '';
const FLAGS = [
  { k: 'fu', short: '福', label: '福（受浸）', color: '#B5543C' },
  { k: 'jia', short: '家', label: '家（家聚會）', color: '#C08A2E' },
  { k: 'pai', short: '排', label: '排（小排）', color: '#2C6E5A' },
  { k: 'qu', short: '區', label: '區（主日）', color: '#3A5A8C' },
];
const PERMS = [
  { k: 'manage', label: '管理隊員與設定', help: '設定職稱與權限、邀請連結、修改開展隊' },
  { k: 'session', label: '建立開展時段', help: '可以開新的開展時段' },
  { k: 'contacts', label: '看所有聯絡資料', help: '看得到別人記名卡片上的手機、LINE ID、地址、照片' },
  { k: 'editAll', label: '編輯所有記名卡片', help: '可以修改、刪除別人記的名單' },
];
const TITLE_CHIPS = ['隊長', '副隊長', '組長', '記錄', '代禱', '隊員'];

/* ================= 開展隊色調 ================= */
const THEMES = {
  gospel:  { name: '福音綠', btn: '#2C5B47', notch: '#C49356', paper: '#FFFDF8', band: '#22483A' },
  classic: { name: '海軍藍', btn: '#2F3343', notch: '#C49356', paper: '#FFFDF8', band: '#2F3343' },
  sky:     { name: '晴空藍', btn: '#2B5C8A', notch: '#9CC3E4', paper: '#F7FAFD', band: '#244E76' },
  harvest: { name: '禾場金', btn: '#8A5A1E', notch: '#E2B25C', paper: '#FFFAF0', band: '#6E4818' },
  dawn:    { name: '晨曦紅', btn: '#A2432F', notch: '#EBA67A', paper: '#FFF8F3', band: '#86362A' },
  youth:   { name: '青年紫', btn: '#5E3D8F', notch: '#F2B84B', paper: '#FBF8FF', band: '#4B3075' },
  kids:    { name: '兒童橘', btn: '#B4470F', notch: '#F4C542', paper: '#FFFBEF', band: '#923A0C' },
  service: { name: '湖水綠', btn: '#1F6F78', notch: '#8FC1C7', paper: '#F4FAFA', band: '#185A62' },
};
const themeOf = t => THEMES[t && t.theme] || THEMES.gospel;
const themeVars = th => `--line:${th.btn};--line-dark:${th.band};--chrome:${th.band};--marigold:${th.notch};--paper:${th.paper}`;

/* ================= 確認視窗 ================= */
function confirmBox({ title, text = '', ok = '確定', danger = true }) {
  return new Promise(res => {
    const box = document.createElement('div');
    box.className = 'modal';
    box.innerHTML = `<div class="modal-panel" role="alertdialog" aria-modal="true" aria-labelledby="mb-t">
      <h2 id="mb-t">${esc(title)}</h2>${text ? `<p>${esc(text)}</p>` : ''}
      <div class="modal-btns"><button type="button" class="btn plain" data-r="0">取消</button><button type="button" class="btn ${danger ? 'danger-fill' : 'send'}" data-r="1">${esc(ok)}</button></div></div>`;
    document.body.append(box);
    requestAnimationFrame(() => box.classList.add('on'));
    const done = v => { box.remove(); removeEventListener('keydown', key, true); res(v); };
    const key = e => { if (e.key === 'Escape') { e.preventDefault(); done(false); } };
    addEventListener('keydown', key, true);
    box.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (b) done(b.dataset.r === '1'); else if (e.target === box) done(false); });
    box.querySelector('[data-r="1"]').focus();
  });
}

/* ================= 一鍵複製、一鍵存成圖片 =================
   每個頁面、卡片的右上角都有一組按鈕：tools('複製的種類:參數', '要截圖的元素 id', '檔名') */
const tools = (copyKey, shotId, name, extra = '') => `<div class="tools no-shot">
  ${extra}<button type="button" class="tool" data-act="copy" data-k="${esc(copyKey)}" aria-label="複製文字">${ICON.copy}<span>複製</span></button>
  <button type="button" class="tool" data-act="shot" data-id="${esc(shotId)}" data-name="${esc(name)}" aria-label="存成圖片">${ICON.image}<span>存圖</span></button></div>`;
function copyText(text, done = '已複製，可以貼到 LINE') {
  const fallback = () => {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
    document.body.append(ta); ta.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
    ta.remove(); toast(ok ? done : '無法複製，請長按文字自行複製');
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => toast(done), fallback); else fallback();
}
let SHOT_LIB = null;
function loadShotLib() {
  if (window.modernScreenshot) return Promise.resolve(window.modernScreenshot);
  return SHOT_LIB || (SHOT_LIB = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'lib/modern-screenshot.js';
    s.onload = () => window.modernScreenshot ? res(window.modernScreenshot) : rej(new Error('截圖工具載入失敗'));
    s.onerror = () => { SHOT_LIB = null; rej(new Error('截圖工具載入失敗，請再試一次')); };
    document.head.appendChild(s);
  }));
}
async function shotElement(el, filename) {
  const ms = await loadShotLib();
  el.classList.add('shooting');
  try {
    const w = Math.ceil(Math.max(el.scrollWidth, el.getBoundingClientRect().width));
    const blob = await ms.domToBlob(el, {
      scale: Math.min(3, Math.max(2, window.devicePixelRatio || 2)), type: 'image/png', width: w,
      font: false, timeout: 15000,
      style: { margin: '0', boxShadow: 'none', transform: 'none', animation: 'none', transition: 'none' },
      filter: n => !(n.classList && n.classList.contains('no-shot')),
      fetch: { requestInit: { mode: 'cors', cache: 'force-cache' }, placeholderImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=' },
    });
    return blob;
  } finally { el.classList.remove('shooting'); }
}
const fileName = s => `${String(s || '開展紀錄').replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 40)}-${ymd(new Date())}.png`;
/** 手機（含 LINE 內建瀏覽器）：<a download> 常常沒反應，所以在畫面上打開圖片，讓使用者長按存到相簿，或按「分享／儲存」 */
const isMobileUA = () => { const ua = navigator.userAgent || ''; return /Android|iPhone|iPad|iPod|Line\//i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1); };
async function saveBlob(blob, filename) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (!isMobileUA()) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = filename; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    toast('已下載圖片'); return;
  }
  const r = new FileReader();
  r.onload = () => {
    $$('.save-sheet').forEach(x => x.remove());
    const canShare = !!(navigator.canShare && navigator.share && (() => { try { return navigator.canShare({ files: [file] }); } catch (e) { return false; } })());
    const box = document.createElement('div');
    box.className = 'save-sheet'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', '存成圖片');
    box.innerHTML = `<div class="ss-panel"><p class="ss-tip"><b>長按下面的圖片</b>，選「儲存圖片」或「加入照片」，就會存到手機相簿；也可以直接分享到 LINE。</p>
      <img class="ss-img" alt="${esc(filename)}" src="${r.result}">
      <div class="ss-btns">${canShare ? '<button type="button" class="btn send small" id="ss-share">分享／儲存</button>' : ''}
        <a class="btn plain small" href="${r.result}" download="${esc(filename)}">下載</a><button type="button" class="btn plain small" id="ss-close">關閉</button></div></div>`;
    document.body.append(box);
    const close = () => box.remove();
    box.addEventListener('click', e => { if (e.target === box) close(); });
    box.querySelector('#ss-close').onclick = close;
    const sh = box.querySelector('#ss-share');
    if (sh) sh.onclick = async () => { try { await navigator.share({ files: [file], title: filename }); close(); } catch (e) { if (!e || e.name !== 'AbortError') toast('這個瀏覽器不能直接分享，請長按圖片儲存'); } };
  };
  r.readAsDataURL(blob);
}

/* ================= 小圖示 ================= */
const svg = (d, extra = '') => `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const ICON = {
  copy: svg('<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>'),
  image: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>'),
  rec: svg('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  ses: svg('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h7"/>'),
  all: svg('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  pray: svg('<path d="M21 12a8.5 8.5 0 0 1-12.4 7.6L3 21l1.5-5A8.5 8.5 0 1 1 21 12z"/><path d="M12 15.5s-3.5-2-3.5-4.2a1.8 1.8 0 0 1 3.5-.6 1.8 1.8 0 0 1 3.5.6c0 2.2-3.5 4.2-3.5 4.2z"/>'),
  mem: svg('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.2a5 5 0 0 1 6 4.8"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  minus: svg('<path d="M5 12h14"/>'),
  star: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="m12 2.5 2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
  phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>'),
  send: svg('<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>'),
};

/* ================= 預覽模式用的「現在時間」 ================= */
const DEMO_NOW = new Date(2026, 10, 20, 15, 10); // 11/20（五）下午，正在開展
const now = () => DEMO ? DEMO_NOW : new Date();

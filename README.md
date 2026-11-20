# 開展隊記錄彙整代禱平台（LINE 開展隊紀錄與彙整建立平台）

在 LINE 裡建立「開展隊」，記錄每次出外開展的計數與有效名單，自動彙整，並有代禱牆。

沿用「LINE簡易活動登記建立平台」「全時間工作重點回報」的做法：LINE LIFF＋Google Apps Script＋Google 試算表＋GitHub Pages。全部免費，不用官方帳號。

- 網站：https://isaiahovercomer.github.io/line-outreach/
- 預覽（範例資料）：`?demo`（首頁）、`?demo=team`（開展紀錄）、`?demo=session`（一個時段）、`?demo=sum`（時段彙整）、`?demo=all`（累積彙整）、`?demo=pray`（代禱牆）、`?demo=mem`（隊員）、`?demo=join`（邀請加入）、`?demo=admin`（後台，平台管理員）；加 `&notour` 跳過教學

## 部署資料

- 入口：https://liff.line.me/2012412693-u3yd2OOT（LIFF「開展隊紀錄」，掛在 LINE Login channel「活動報名」2012412693）
- 試算表「開展隊紀錄」：https://docs.google.com/spreadsheets/d/15iNk3nE6N3Yn5vkV43R5bpdbAT5fI-8ik7kw3T7ZYIQ/edit
- Apps Script「開展隊紀錄後端」：https://script.google.com/home/projects/1Rj6WN8xmaK5gy1B4vvJVYg4fFCNPzA_RnNllpoi1_qUa1_QayBQWcjF2/edit
- 網頁應用程式（部署作業網址不變，更新時建立新版本）：`build/js/01-core.js` 的 `GAS_URL`

## 功能

1. **開展隊**：任何人都能建立，建立者是負責人。可上傳圖片或貼圖片網址當圖標，顯示在列表、頁首、邀請與彙整圖卡上。用邀請連結（可發到 LINE 群組）讓大家加入
2. **隊員與權限**：負責人可替每個人設定職稱（隊長、副隊長、記錄…）和權限：
   - 管理隊員與設定｜建立開展時段｜看所有聯絡資料｜編輯所有記名卡片
3. **開展紀錄**：任何有權限的人建立開展時段（名稱、日期、時間、地點、要計數的項目），其他人自由加入
   - 一次建立多個時段（像設定鬧鐘）：可加好幾組時間（預設和第一組一樣），重複方式選「不重複／每天／每週／自訂星期（週一～主日，可複選）」並選重複到哪一天；一次最多 60 個
   - 時間可選「24 小時制」或「上午／下午」顯示（每人記住自己的選擇），分鐘以 5 分鐘為單位
   - 建立過的時段會自動變成範本：建立新時段時點一下就帶入名稱、時間、地點、計數項目、備註（日期預設今天）
   - 「人生的奧秘」傳講版卡片：打開官方互動頁（韓國福音書房 gospel.kgbr.co.kr，依手機語言自動顯示繁體中文）1 分鐘或 3 分鐘版，或複製分享連結傳給對方；圖示用官方網站的 app 圖示
   - 「加 LINE 好友」：顯示自己的 LINE QR 碼給對方掃（第一次貼上 LINE「我的 QR 碼」的連結或 LINE ID，存在「使用者」工作表的「加好友連結」欄），可存成圖片
   - 計數器：接觸人數、叩訪戶數、發單張數、傳講人數、呼求人數、有效名單（＋－或直接輸入，自動儲存）
   - 建立者可隨時移除或加回計數項目（移除會跳確認視窗）
   - 有效名單記名卡片：姓名、身分、年齡段、手機、LINE ID、地址、敞開程度、照片、備註，全部選填；可儲存、編輯、刪除，隨時再新增一張
   - 每張卡片可勾「福、家、排、區」（可複選）和「迫切代禱」
4. **時段彙整**：每個時段所有人的計數表＋名單表（點一列展開完整卡片），可發到 LINE
5. **累積彙整**：整個期間的總數、各時段、各隊員的計數，和累積名單（可篩選敞開程度、迫切代禱）
6. **代禱牆**：福（受浸）、家（家聚會）、排（小排）、區（主日）四區，名字後面括號是接觸者；迫切代禱的名字最顯眼
7. **後台管理**（首頁的「後台管理」按鈕）：建立開展隊的人管理自己建立的開展隊；平台管理員（試算表「管理員」工作表）管理全部。可搜尋、勾選多個，修改、開放／關閉加入、刪除，並看隊員、時段、人次、名單總數
8. 每個頁面、卡片都有 **一鍵複製**（文字可直接貼到 LINE）和 **一鍵存成圖片**

「有效名單」計數至少等於自己記的卡片張數；沒有記卡片的名單也可以直接按＋。
沒有「看所有聯絡資料」權限的人，看不到別人卡片上的手機、LINE ID、地址、照片、備註（後端就不送出）。

## 檔案

- `index.html`：前端（單一檔案）。**由 `build/build.sh` 產生**，請改 `build/js/*.js`、`build/base.css`、`build/extra.css`，再執行 `build/build.sh`
- `Code.gs`：Apps Script 後端
- `manifest.webmanifest`、`sw.js`、`icons/`、`img/`：安裝到手機桌面（PWA）
- `lib/modern-screenshot.js`：存成圖片用（MIT）

## 試算表工作表

`使用者`、`開展隊`、`隊員`（職稱、權限）、`時段`、`計數`（每人每時段一列，JSON）、`名單卡`（記名卡片，福家排區各一欄）、`管理員`（平台總管理人）、隱藏的 `登入`（60 天通行證）

## 第一次設定

1. **LINE**：在 LINE Developers 的 LINE Login channel（活動報名，2012412693）新增 LIFF：Size Full、Endpoint `https://isaiahovercomer.github.io/line-outreach/`、scopes 勾 openid、profile、chat_message.write、開啟 Share target picker
2. **Google**：新建試算表「開展隊紀錄」→ 擴充功能 → Apps Script，貼上 `Code.gs` → 執行 `setup()` → 部署為網頁應用程式（執行身分：我；存取權：所有人）
3. 把 LIFF ID 和 Apps Script 網址填到 `build/js/01-core.js` 最上面兩行，執行 `build/build.sh`，推上 GitHub
4. 從 LINE 打開平台登入一次，再到 Apps Script 執行 `addFirstAdmin()`，把自己設為平台管理員

## 更新

- 前端：改 `build/` → `build/build.sh` → push
- 後端：Apps Script 換成新的 `Code.gs` → 有新工作表或欄位時執行 `setup()` → 部署 → 管理部署作業 → 鉛筆 → 建立新版本
- 新功能要在教學加一步（`since: 新版本`）並把 `TOUR_VERSION` 加 1

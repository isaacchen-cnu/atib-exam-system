# ATIB 運動防護員模擬考試系統：Netlify 建置指南

## 網站位置
- 前台考生：`https://你的網站.netlify.app/`
- 後台管理：`https://你的網站.netlify.app/admin.html`

## 系統架構
- Netlify Identity：考生與管理者登入、Email 確認、角色權限。
- Netlify Functions：題庫、作答、管理、發布 API。
- Netlify Blobs：草稿題庫、正式發布題庫、作答紀錄。
- 管理流程：草稿 → 管理者複核 → 核准 → 發布快照 → 前台考生使用。

## 建議部署方法：GitHub + Netlify
1. 建立一個新的 GitHub repository，例如 `atib-exam-system`。
2. 把本資料夾內「所有檔案與資料夾」上傳到 repository 根目錄。不要只上傳 index.html。
3. 到 Netlify → Add new project → Import an existing project → GitHub。
4. 選擇剛剛的 repository。
5. Build settings 應自動讀取 `netlify.toml`：
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`
6. 按 Deploy / Publish。
7. 部署成功後，到專案的 Identity → Enable Identity。
8. Identity → Registration → Registration preferences：
   - 學生可自行註冊：選 Open。
   - 只允許您邀請的學生：選 Invite only。
9. 保留 Email confirmation；不要啟用 autoconfirm。學生必須點信箱確認連結後才可登入。
10. 打開前台網址 `/`，用您的 Email 註冊一個帳號，填姓名、單位與密碼，完成 Email 驗證。
11. 回到 Netlify → Identity → Users → 點您的帳號 → Edit settings → Roles，加入 `admin`。
12. 登出網站再重新登入，讓新的 admin role 進入新的登入 token。
13. 開啟 `/admin.html`，應可看到管理後台。
14. 建議再到 Project configuration → Environment variables 新增：
    - Key: `ADMIN_EMAILS`
    - Value: 您的管理員 Email
    這是 admin role 之外的備援白名單。新增後重新 deploy。

## 第一次後台使用
1. 先看「草稿題庫」，術科 104–115 年既有整理會先存在草稿，不會自動公開。
2. 每題可修改：年度、梯次、題號、考科、題幹、選項、答案、解析、題目來源、答案來源、學理來源、複核註記。
3. 不確定題目維持 `needs-review`，不要核准。
4. 確定無誤後勾選 `approvedForPublish` / 核准發布。
5. 按「發布考生版」。只有這一步之後，核准題目才會出現在學生前台。
6. 前台學生永遠只讀「最後一次正式發布快照」，不會看到您正在後台修改的草稿。

## 題庫匯入
- 正式學科題庫可由後台官方同步功能或 JSON 匯入。
- 範本：`server-data/academic-import-template.json`
- 官方歷屆入口：`https://www.sports.gov.tw/News/5170`
- 已知官方更正規則已保留在 `server-data/source-manifest.json`。
- 無法安全判讀的題目應維持草稿並人工複核，不應發布。

## 如何測試權限
### 管理者測試
- 用 admin 帳號登入。
- 開啟 `/admin.html` 應能載入草稿題庫。
- 修改一題但不要發布；學生端不應看到變更。
- 核准並發布後，學生端才應看到新版本。

### 一般學生測試
- 用另一個 Email 註冊一般帳號，不設定 admin role。
- 可登入 `/` 作答。
- 直接輸入 `/admin.html` 時，管理 API 應回傳 403，不能修改或發布題庫。

## 更新網站程式
如果使用 GitHub：
1. 更新 repository 中的檔案。
2. Commit / push。
3. Netlify 會自動重新 build 與 deploy。
4. Netlify Blobs 中的草稿題庫、正式題庫和作答資料會跨 deploy 保留。

## 網址建議
可在 Domain management / Project configuration 中把專案名稱改成較清楚的名稱，例如：
`cnu-atib-exam.netlify.app`

## 安全原則
- 不要把管理者密碼寫入 HTML、JavaScript 或 GitHub。
- `ADMIN_EMAILS` 放在 Netlify Environment variables，不要寫死在程式。
- 一般學生不要加入 `admin` role。
- 題目未核對，不要核准發布。

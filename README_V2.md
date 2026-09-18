# ATIB 運動防護員模擬試題系統 — 後台發布版 v2

這一版改成真正的「草稿 → 管理者複核 → 發布 → 考生使用」架構。

## 權限
- 考生：只能讀取「已發布」題庫、作答、看自己的紀錄。
- 管理者：admin role 或 `ADMIN_EMAILS` 白名單；可同步、匯入、編輯、核准與發布。
- 管理 API 在伺服器端再次檢查 admin 權限，因此一般考生即使知道 API 網址也不能修改題庫。

## Email / 姓名
考生註冊需填 Email、姓名、單位與密碼。Netlify Identity 預設會寄 Email confirmation；
請不要開啟 autoconfirm，如此未驗證 Email 的帳號不能正常登入。

## 題庫發布流程
1. 官方 PDF 同步或 JSON 匯入只進「草稿題庫」。
2. 管理者在 `/admin.html` 修改題目、答案、分類、來源與解析。
3. 不確定題目維持 `needs-review`，不可發布。
4. 確認後勾選「我已核對，核准發布」，或使用批次核准。
5. 按「發布考生版」後才建立新的唯讀 published snapshot。
6. 考生端只讀 published snapshot；草稿修改不會立即影響考生。

## 初始資料
- 術科：104–115 年既有整理 247 個考點，全部先進草稿，預設未核准發布。
- 學科：不再內建 32 題示範題。正式學科須由官方 PDF 同步或人工複核 JSON 匯入。
- 官方更正覆寫：113-1 基礎 Q15、Q45、Q94；114-1 基礎 Q72、Q94 已保留於 source manifest。

## Netlify 部署
這一版因為有真正登入、權限、Functions 與 Blobs，不再是單一 HTML 靜態檔。

建議：
1. 將整個專案放到 GitHub。
2. Netlify → Add new project → Import from Git。
3. Build command / publish / functions 已寫在 `netlify.toml`。
4. Netlify → Identity → Enable Identity。
5. 保留 Email confirmation，不要開 autoconfirm。
6. 用考生頁註冊您自己的帳號。
7. Netlify Identity → Users → 您的帳號 → Roles 加入 `admin`。
8. 重新登入後前往 `/admin.html`。
9. 可另外設定環境變數 `ADMIN_EMAILS=您的Email` 作為備援管理員白名單。

## 官方來源
主要歷屆入口：運動部
https://www.sports.gov.tw/News/5170

現有批次解析器保留 TATS 直接 PDF URL 作為備援來源。正式答案以官方 PDF 與官方更正公告為優先；
無法安全解析的題目應留在草稿中人工複核。

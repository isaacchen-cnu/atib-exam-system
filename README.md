# 運動防護員檢定模擬試題系統

Netlify 可部署的考生練習網站。包含：

- Email / 密碼註冊與登入（Netlify Identity）
- 註冊欄位：Email、簡稱、單位
- 學科：依年度、官方大類、系統細分考科或隨機出題
- 術科：依年度、術科範圍、技能類型或隨機實作站
- 學科交卷即時計分與逐題檢討
- 術科以實作自評 + 檢核點 + 教學解析呈現
- 練習紀錄保存
- 管理端：最常錯題目、考科錯誤率、單位使用量
- 官方 PDF 同步與完整性檢核
- 官方更正公告覆寫機制
- 掃描檔/解析不完整題目不進自動計分
- 題目疑義回報

## 1. 部署到 Netlify

1. 將整個專案推到 GitHub，或在 Netlify 建立新專案並上傳專案。
2. Build command：`npm run build`
3. Publish directory：`dist`
4. Functions directory：`netlify/functions`
5. Netlify 會依 `netlify.toml` 自動套用上述設定。

## 2. 開啟 Netlify Identity

在 Netlify 專案中開啟 Identity，允許 Email/password 註冊。新版本前端使用 `@netlify/identity`，不使用舊的 Identity Widget。

建議保留 Email confirmation，避免他人用不存在的 Email 建帳。

## 3. 設定管理員

先以一般使用者完成註冊。建議在 Netlify 的 Environment variables 新增 `ADMIN_EMAILS`，值填您的登入 Email；多位管理員以逗號分隔。系統也支援帳號的 `admin` role。之後即可進入：

`https://您的網域/admin.html`

管理頁只有 `ADMIN_EMAILS` 白名單或 `admin` role 可以存取統計與官方題庫同步 API。

## 4. 第一次同步官方題庫

在 `/admin.html` 的「官方題庫來源與同步」逐一按下「同步與檢核」。

同步規則：

- PDF 必須能安全解析成「完整題幹 + 完整選項（四選一；若原題為是非題則允許二選一）+ 官方答案」。
- 預期每一個學科大類為 100 題；後台會顯示 `安全計分題數 / 100`。
- 題目解析不完整、缺選項、缺答案時，一律不發布成學生自動計分題。
- 113-1、114-1 已內建目前查得的官方更正公告覆寫規則。
- 100–103 為掃描型來源，程式刻意不以 OCR 猜答案，需人工複核後使用 JSON 匯入。
- 112-1 若文字層不足，也會自動停在人工複核狀態。

## 5. 答案可信度政策

`verificationStatus`：

- `official-pdf`：答案由官方 PDF 解析。
- `official-corrected`：答案依官方更正公告更新。
- `official-bonus`：官方公告送分。
- `manual-reviewed`：人工複核後匯入。
- `needs-review`：缺資料或完整性不符；不得自動計分。
- `teaching-reviewed`：術科/示範題的教學整理，不宣稱等同官方逐字評分表。

**重要：官方答案與「學理詳解已人工審查」是兩個不同層級。** 系統可以先依官方答案安全計分；若詳解尚未逐題人工複核，考後頁會明確標示，而不是由 AI 猜一段看似合理的解析。

## 6. 統計資料

每次交卷會以獨立 Blob 儲存，避免多位學生同時作答時互相覆寫。管理端會彙整：

- 練習份數
- 不重複考生數
- 整體正確率
- 題目錯誤率與作答次數
- 考科錯誤率
- 單位使用量

這個架構適合小到中型培訓班。若未來有大量使用者、需要複雜的 cohort / 班級 / 時間序列分析，建議把 attempt 資料移至 Netlify Database/Postgres。

## 7. 人工複核 JSON 格式

```json
{
  "items": [
    {
      "id": "O-103-B-001",
      "type": "academic",
      "year": 103,
      "exam": "103",
      "group": "運動防護基礎科學",
      "subject": "人體解剖學與實驗",
      "number": 1,
      "text": "題幹",
      "options": {"A":"...","B":"...","C":"...","D":"..."},
      "acceptedAnswers": ["B"],
      "explanation": "經人工審核的詳解",
      "verificationStatus": "manual-reviewed",
      "official": true
    }
  ]
}
```

## 8. 本機測試

Netlify Identity 與 Blobs 在本機應使用 Netlify CLI：

```bash
npm install
npx netlify dev
```

單純 `vite` 可以看靜態介面，但無法完整模擬 Identity / Blobs 執行環境。

## 9. 考科分類版本說明

網站的學科分類以 **115 年度第一次資格檢定考試簡章附件九** 的正式『檢定範圍』為準：基礎科學 8 科、專業科學 8 科。`運動防護實習` 雖列在報考所需修習課程中，但不在附件九目前列出的專業科學筆試 8 科範圍內，因此網站不把它當成獨立的學科考科。

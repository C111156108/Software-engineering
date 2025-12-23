台灣吸菸行為數據監測儀表板 (Taiwan Smoking Data Dashboard)

📊 一個基於 D3.js 與 TopoJSON 的互動式視覺化專案，旨在動態展示台灣各縣市不同族群的吸菸行為趨勢。

📖 專案說明

本專案整合了「衛生福利部國民健康署」的開放資料，透過數據清洗與轉換技術，將原本分散的 CSV 檔案整合為統一格式。使用者可以透過地圖互動掌握以下核心指標：

    15 歲以上成人：每日平均吸菸支數 (支/日)。

    高中職學生：目前吸菸率 (%)。

    國中學生：目前吸菸率 (%)。

專案亮點：

    數據預處理：使用 Python 腳本自動處理縣市名稱不一與缺失值問題。

    熱力圖呈現：根據數值高低動態生成顏色分佈。

    全台平均計算：即時計算並顯示選定年份的全台數據摘要。

🚀 專案啟動方式

由於專案涉及讀取外部 JSON 與數據檔案，直接雙擊 index.html 會因瀏覽器的安全性限制（CORS Error）而無法顯示地圖。請選擇以下任一方式啟動：

方法一：VS Code - Live Server (最推薦)

    使用 VS Code 開啟專案資料夾。

    安裝 "Live Server" 擴充功能。

    在編輯器下方狀態列點擊 "Go Live"，或在 index.html 上按右鍵選擇 "Open with Live Server"。

方法二：Python 簡易伺服器

如果你有安裝 Python，在專案根目錄開啟終端機並輸入：
```Bash
# Python 3.x
python -m http.server 8000
```
接著在瀏覽器輸入 http://localhost:8000 即可查看。

方法三：GitHub Pages 部署

    將專案推送到 GitHub 儲存庫。

    進入儲存庫的 Settings > Pages。

    選擇 Main 分支並儲存，稍等片刻即可透過 GitHub 產生的網址直接觀看。

📂 專案結構

本專案採用模組化設計，將原始數據、處理腳本與網頁資源分開存放。
```Plaintext
Software-engineering/
├── css/
│   └── style.css          # 網頁樣式表
├── data/
│   ├── data.json          # 由 convert.py 產出的清洗後數據
│   └── taiwan.json        # 台灣地圖 TopoJSON 圖資
├── js/
│   └── script.js          # D3.js 繪圖與互動邏輯
├── script/
│   └── convert.py         # Python ETL 資料轉換腳本
├── source/                # 原始資料存儲 (CSV 檔案)
│   ├── 15歲以上吸菸者每天平均吸菸支數.csv
│   ├── 高中職生目前吸菸率.csv
│   └── 國中生目前吸菸率.csv
├── .gitattributes         # Git 屬性設定 (確保編碼一致)
├── LICENSE                # MIT 開源授權協議
├── README.md              # 專案安裝與執行說明
└── index.html             # 儀表板主入口 (根目錄)
```
🛠 使用技術

    前端渲染：D3.js v7

    圖資處理：TopoJSON

    數據處理：Python (Pandas & JSON)

    介面設計：HTML5, CSS3 (Flexbox & Responsive Design)

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
├── index.html             # 儀表板主入口 (根目錄)
├── LICENSE                # MIT 開源授權協議
└── README.md              # 專案安裝與執行說明
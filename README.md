專案根目錄/
├── index.html            # 主網頁
├── style.css             # 樣式表
├── script.js             # 網頁邏輯 (改為讀取 data/data.json)
├── taiwan.json           # 地圖圖資 (放在根目錄方便讀取)
├── data/
│   └── data.json         # 由 Python 生成的統一資料格式
├── script/
│   └── convert.py        # 你的 Python 轉換腳本
└── source/               # 原始 CSV 檔案
    ├── 15歲以上吸菸者每天平均吸菸支數.csv
    ├── 高中職生目前吸菸率.csv
    └── 國中生目前吸菸率.csv
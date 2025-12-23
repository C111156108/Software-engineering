import os
import subprocess
import sys

# 自動檢查並安裝 pandas
try:
    import pandas as pd
except ImportError:
    print("正在為您安裝 pandas...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pandas"])
    import pandas as pd

import glob
import json

def process_data():
    files = glob.glob("drug_data*.csv")
    if not files:
        print("錯誤：找不到任何 drug_data*.csv 檔案")
        return

    full_df = []
    for f in files:
        # 跳過第二行中文標題
        df_temp = pd.read_csv(f, skiprows=[1])
        full_df.append(df_temp)

    df = pd.concat(full_df, ignore_index=True)
    
    # 統一縣市名稱 (修正 台/臺)
    df['city'] = df['oc_addr'].str.slice(0, 3).str.replace("台", "臺")
    df['kind'] = df['kind'].fillna("未知").str.strip()

    # 統計
    stats = df.groupby(['city', 'kind']).size().reset_index(name='count')
    total_stats = df.groupby('city').size().reset_index(name='count')
    total_stats['kind'] = '全部'

    # 組合 JSON
    combined = pd.concat([stats, total_stats])
    pivot_data = {}
    for _, row in combined.iterrows():
        city, kind, count = row['city'], row['kind'], row['count']
        if city not in pivot_data: pivot_data[city] = {}
        pivot_data[city][kind] = int(count)

    options = ["全部"] + sorted([k for k in df['kind'].unique() if k != "全部"])
    
    with open("drug_stats.json", "w", encoding="utf-8") as f:
        json.dump({"options": options, "data": pivot_data}, f, ensure_ascii=False)
    
    print(f"成功！已處理 {len(files)} 個檔案，生成 drug_stats.json")

if __name__ == "__main__":
    process_data()
import pandas as pd
import glob
import json

def process_data():
    files = sorted(glob.glob('drug_data*.csv'))
    all_dfs = []
    for f in files:
        # 跳過第二行的中文欄位描述 (skiprows=[1])
        df = pd.read_csv(f, skiprows=[1])
        all_dfs.append(df)
    
    full_df = pd.concat(all_dfs, ignore_index=True)
    full_df['city'] = full_df['oc_addr'].str.strip().str[:3]
    full_df['kind'] = full_df['kind'].str.strip()
    
    # 統計各縣市各毒品數量
    summary = full_df.groupby(['city', 'kind']).size().reset_index(name='count')
    
    result = {"kinds": ["全部"], "data": {}}
    kinds_set = set()
    
    for city in summary['city'].unique():
        city_data = summary[summary['city'] == city]
        result["data"][city] = {row['kind']: int(row['count']) for _, row in city_data.iterrows()}
        result["data"][city]["全部"] = int(city_data['count'].sum())
        kinds_set.update(city_data['kind'].tolist())
        
    result["kinds"] += sorted(list(kinds_set))
    
    with open('drug_summary.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

if __name__ == "__main__":
    process_data()
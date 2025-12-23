import pandas as pd
import json
import re
import os

def clean_county_name(name):
    if not isinstance(name, str): return ""
    name = re.sub(r'.*=', '', name)
    return name.replace("台", "臺").strip()

def process_data():
    # 定義路徑：以 script 資料夾為基準往上找
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.dirname(current_dir)
    source_dir = os.path.join(root_dir, "source")
    output_dir = os.path.join(root_dir, "data")

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    output = {"adult": [], "highschool": [], "junior": []}

    # A. 成人資料
    try:
        df = pd.read_csv(os.path.join(source_dir, "15歲以上吸菸者每天平均吸菸支數.csv"))
        df = df[df['分析項目'].str.contains("縣市別", na=False)]
        for _, row in df.iterrows():
            val = pd.to_numeric(row['整體吸菸者平均吸菸支數之平均值(支)'], errors='coerce')
            output["adult"].append({
                "year": row['年度'].replace("民國", "").replace("年", ""),
                "name": clean_county_name(row['分析項目']),
                "value": float(val) if pd.notnull(val) else 0
            })
    except Exception as e: print(f"Error Adult: {e}")

    # B. 學生資料共用邏輯
    def process_students(file_name, key):
        try:
            df = pd.read_csv(os.path.join(source_dir, file_name))
            df = df[df['分析項目'].str.contains("縣市別", na=False)]
            for _, row in df.iterrows():
                county = clean_county_name(row['分析項目'])
                for col in df.columns:
                    if "吸菸率(%)" in col and "男性" not in col and "女性" not in col:
                        year = re.search(r'\d+', col).group()
                        val = pd.to_numeric(row[col], errors='coerce')
                        output[key].append({"year": year, "name": county, "value": float(val) if pd.notnull(val) else 0})
        except Exception as e: print(f"Error {key}: {e}")

    process_students("高中職生目前吸菸率.csv", "highschool")
    process_students("國中生目前吸菸率.csv", "junior")

    with open(os.path.join(output_dir, "data.json"), 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=4)
    print("🚀 data.json 已成功生成於 data/ 資料夾")

if __name__ == "__main__":
    process_data()
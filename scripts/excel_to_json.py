import pandas as pd
import json
import os

# 1. 填入您的 Google Sheet ID（網址中 /d/ 到 /edit 中間那一串字元）
SPREADSHEET_ID = "1X7gYxlJaUcbzPNgeLO-hjsz1tVGc7TZDAB5817B8BaI"

import urllib.parse

def get_sheet_df(sheet_name):
    # 使用 urllib 將分頁名稱進行安全的 URL 編碼
    encoded_name = urllib.parse.quote(sheet_name)
    url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"
    
    print(f"正在嘗試讀取工作表 [{sheet_name}]...")
    df = pd.read_csv(url)
    df.columns = df.columns.str.strip()
    return df

try:
    print("正在從 Google Sheets 抓取資料...")
    df_nodes = get_sheet_df('nodes_ALL')
    df_links = get_sheet_df('link_ALL')
    df_n_color = get_sheet_df('nodes_color')
    df_l_color = get_sheet_df('links_color')

    # 色碼對應
    node_colors = dict(zip(df_n_color['node_Group'].dropna(), df_n_color['color'].dropna()))
    clean_l_color = df_l_color[df_l_color['color'].astype(str).str.startswith('#')]
    link_colors = dict(zip(clean_l_color['link_group'], clean_l_color['color']))

    nodes = []
    for _, row in df_nodes.iterrows():
        if pd.isna(row['id']):
            continue
        group = str(row['node_Group']).strip() if pd.notna(row['node_Group']) else '其他'
        nodes.append({
            'id': str(row['id']).strip(),
            'group': group,
            'info': str(row['info']).strip() if pd.notna(row['info']) else '',
            'start_year': str(row['start_year']) if pd.notna(row['start_year']) else '',
            'end_year': str(row['end_year']) if pd.notna(row['end_year']) else '',
            'link': str(row['相關連結']).strip() if pd.notna(row['相關連結']) else '',
            'color': node_colors.get(group, '#888888')
        })

    links = []
    for _, row in df_links.iterrows():
        if pd.isna(row['Node_A']) or pd.isna(row['Node_B']):
            continue
        label = str(row['label']).strip() if pd.notna(row['label']) else ''
        links.append({
            'source': str(row['Node_A']).strip(),
            'target': str(row['Node_B']).strip(),
            'relation': label,
            'info': str(row['info']).strip() if pd.notna(row['info']) else '',
            'date': str(row['Date']) if pd.notna(row['Date']) else '',
            'color': link_colors.get(label, '#CCCCCC')
        })

    os.makedirs('public', exist_ok=True)
    with open('public/data.json', 'w', encoding='utf-8') as f:
        json.dump({'nodes': nodes, 'links': links, 'node_colors': node_colors, 'link_colors': link_colors}, f, ensure_ascii=False, indent=2)

    print("成功！已從 Google Sheets 更新並產生 public/data.json")

except Exception as e:
    print(f"抓取或轉換失敗: {e}")
    raise e

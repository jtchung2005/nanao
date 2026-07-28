import pandas as pd
import json
import os
import urllib.parse

# 1. 請確認這是您的 Google Sheet ID
SPREADSHEET_ID = "1X7gYxlJaUcbzPNgeLO-hjsz1tVGc7TZDAB5817B8BaI"

def get_sheet_df(sheet_name):
    encoded_name = urllib.parse.quote(sheet_name)
    url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet={encoded_name}"
    print(f"正在嘗試讀取工作表 [{sheet_name}]...")
    df = pd.read_csv(url)
    # 清理欄位名稱：去除前後空白
    df.columns = df.columns.astype(str).str.strip()
    return df

try:
    print("正在從 Google Sheets 抓取資料...")
    df_nodes = get_sheet_df('nodes_ALL')
    df_links = get_sheet_df('link_ALL')
    df_n_color = get_sheet_df('nodes_color')
    df_l_color = get_sheet_df('links_color')

    # 動態匹配 nodes_ALL 欄位名稱 (不分大小寫)
    id_col = next((col for col in df_nodes.columns if col.lower() == 'id'), None)
    group_col = next((col for col in df_nodes.columns if col.lower() in ['node_group', 'group']), 'node_Group')
    info_col = next((col for col in df_nodes.columns if col.lower() == 'info'), 'info')
    start_col = next((col for col in df_nodes.columns if col.lower() == 'start_year'), 'start_year')
    end_col = next((col for col in df_nodes.columns if col.lower() == 'end_year'), 'end_year')
    link_col = next((col for col in df_nodes.columns if col.lower() in ['相關連結', 'link']), '相關連結')

    if not id_col:
        raise ValueError(f"在 nodes_ALL 中找不到 id 欄位！目前欄位有: {list(df_nodes.columns)}")

    # 處理顏色對應
    n_group_col = next((col for col in df_n_color.columns if col.lower() in ['node_group', 'group']), df_n_color.columns[0])
    n_color_col = next((col for col in df_n_color.columns if col.lower() == 'color'), df_n_color.columns[1] if len(df_n_color.columns) > 1 else df_n_color.columns[0])
    node_colors = dict(zip(df_n_color[n_group_col].dropna(), df_n_color[n_color_col].dropna()))

    l_group_col = next((col for col in df_l_color.columns if col.lower() in ['link_group', 'group']), df_l_color.columns[0])
    l_color_col = next((col for col in df_l_color.columns if col.lower() == 'color'), df_l_color.columns[1] if len(df_l_color.columns) > 1 else df_l_color.columns[0])
    clean_l_color = df_l_color[df_l_color[l_color_col].astype(str).str.startswith('#')]
    link_colors = dict(zip(clean_l_color[l_group_col], clean_l_color[l_color_col]))

    nodes = []
    for _, row in df_nodes.iterrows():
        # 修正點：使用變數 id_col 檢查，而非寫死的 'id'
        if pd.isna(row[id_col]) or str(row[id_col]).strip() == '':
            continue
            
        group = str(row[group_col]).strip() if group_col in row and pd.notna(row[group_col]) else '其他'
        nodes.append({
            'id': str(row[id_col]).strip(),
            'group': group,
            'info': str(row[info_col]).strip() if info_col in row and pd.notna(row[info_col]) else '',
            'start_year': str(row[start_col]) if start_col in row and pd.notna(row[start_col]) else '',
            'end_year': str(row[end_col]) if end_col in row and pd.notna(row[end_col]) else '',
            'link': str(row[link_col]).strip() if link_col in row and pd.notna(row[link_col]) else '',
            'color': node_colors.get(group, '#888888')
        })

    # 動態匹配 link_ALL 欄位名稱
    node_a_col = next((col for col in df_links.columns if col.lower() in ['node_a', 'source']), None)
    node_b_col = next((col for col in df_links.columns if col.lower() in ['node_b', 'target']), None)
    label_col = next((col for col in df_links.columns if col.lower() in ['label', 'relation']), 'label')
    date_col = next((col for col in df_links.columns if col.lower() == 'date'), 'Date')
    link_info_col = next((col for col in df_links.columns if col.lower() == 'info'), 'info')

    if not node_a_col or not node_b_col:
        raise ValueError(f"在 link_ALL 中找不到 Node_A 或 Node_B 欄位！目前欄位有: {list(df_links.columns)}")

    links = []
    for _, row in df_links.iterrows():
        if pd.isna(row[node_a_col]) or pd.isna(row[node_b_col]):
            continue
        label = str(row[label_col]).strip() if label_col in row and pd.notna(row[label_col]) else ''
        links.append({
            'source': str(row[node_a_col]).strip(),
            'target': str(row[node_b_col]).strip(),
            'relation': label,
            'info': str(row[link_info_col]).strip() if link_info_col in row and pd.notna(row[link_info_col]) else '',
            'date': str(row[date_col]) if date_col in row and pd.notna(row[date_col]) else '',
            'color': link_colors.get(label, '#CCCCCC')
        })

    os.makedirs('public', exist_ok=True)
    with open('public/data.json', 'w', encoding='utf-8') as f:
        json.dump({'nodes': nodes, 'links': links, 'node_colors': node_colors, 'link_colors': link_colors}, f, ensure_ascii=False, indent=2)

    print("成功！已從 Google Sheets 更新並產生 public/data.json")

except Exception as e:
    print(f"抓取或轉換失敗: {e}")
    raise e

import pandas as pd
import json
import os

# 1. Google Sheet ID 與各分頁 gid 填寫
SPREADSHEET_ID = "1X7gYxlJaUcbzPNgeLO-hjsz1tVGc7TZDAB5817B8BaI"

SHEET_GIDS = {
    'nodes_ALL': '422651298',
    'link_ALL': '1851835395',
    'nodes_color': '443146848',
    'links_color': '623413879'
}

DEFAULT_NODE_COLORS = {
    '人物': '#E63946',
    '政府機關': '#FF8E8E',
    '非營利組織': '#4CC9F0',
    '私人企業': '#F4A261',
    '大學': '#A8DABB',
    '空間': '#2A9D8F',
    '事件': '#E9C46A',
    '物件': '#83C5BE',
    '產業': '#A8DADC',
    '行動/活動': '#9D4EDD',
    '族群': '#B5838D',
    '健康議題': '#06D6A0',
    '群體': '#C77DFF',
    '在地學校': '#52B788'
}

DEFAULT_LINK_COLORS = {
    '空間關係': '#E63946',
    '人際關係': '#457B9D',
    '政策推動': '#F4A261',
    '產業關聯': '#E63946',
    '活動/行動 參與': '#F4A261',
    '人地關係': '#F4A261',
    '組織關聯': '#2A9D8F',
    '事地關係': '#1D3557',
    '物件關聯': '#A8DADC',
    '社會關聯': '#B5838D',
    '健康議題關係': '#06D6A0'
}

def get_sheet_df_by_gid(sheet_key):
    gid = SHEET_GIDS.get(sheet_key)
    if not gid:
        raise ValueError(f"未設定 {sheet_key} 的 gid！")
        
    url = f"https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/export?format=csv&gid={gid}"
    print(f"正在嘗試讀取工作表 [{sheet_key}] (gid: {gid})...")
    
    df = pd.read_csv(url)
    df.columns = df.columns.astype(str).str.strip()
    return df

try:
    print("正在從 Google Sheets 抓取資料...")
    df_nodes = get_sheet_df_by_gid('nodes_ALL')
    df_links = get_sheet_df_by_gid('link_ALL')
    df_n_color = get_sheet_df_by_gid('nodes_color')
    df_l_color = get_sheet_df_by_gid('links_color')

    # 1. 解析節點分類與顏色對應（先載入預設，再用 Sheet 的設定覆蓋）
    node_colors = DEFAULT_NODE_COLORS.copy()
    n_group_col = df_n_color.columns[0]
    n_color_col = df_n_color.columns[1]
    for _, row in df_n_color.iterrows():
        grp = str(row[n_group_col]).strip() if pd.notna(row[n_group_col]) else ''
        clr = str(row[n_color_col]).strip() if pd.notna(row[n_color_col]) else ''
        if grp and clr.startswith('#'):
            node_colors[grp] = clr

    # 2. 解析關係類別與顏色對應
    link_colors = DEFAULT_LINK_COLORS.copy()
    l_group_col = df_l_color.columns[0]
    l_color_col = df_l_color.columns[1]
    for _, row in df_l_color.iterrows():
        grp = str(row[l_group_col]).strip() if pd.notna(row[l_group_col]) else ''
        clr = str(row[l_color_col]).strip() if pd.notna(row[l_color_col]) else ''
        if grp and clr.startswith('#'):
            link_colors[grp] = clr

    # 3. 處理 Nodes 資料
    id_col = next((col for col in df_nodes.columns if col.lower() == 'id'), None)
    group_col = next((col for col in df_nodes.columns if col.lower() in ['node_group', 'group']), 'node_Group')
    info_col = next((col for col in df_nodes.columns if col.lower() == 'info'), 'info')
    start_col = next((col for col in df_nodes.columns if col.lower() == 'start_year'), 'start_year')
    end_col = next((col for col in df_nodes.columns if col.lower() == 'end_year'), 'end_year')
    link_col = next((col for col in df_nodes.columns if col.lower() in ['相關連結', 'link']), '相關連結')

    nodes = []
    for _, row in df_nodes.iterrows():
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

    # 4. 處理 Links 資料
    node_a_col = next((col for col in df_links.columns if col.lower() in ['node_a', 'source']), None)
    node_b_col = next((col for col in df_links.columns if col.lower() in ['node_b', 'target']), None)
    label_col = next((col for col in df_links.columns if col.lower() in ['label', 'relation', 'link_group']), 'label')
    date_col = next((col for col in df_links.columns if col.lower() == 'date'), 'Date')
    link_info_col = next((col for col in df_links.columns if col.lower() == 'info'), 'info')

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

    # 5. 輸出至網頁正確讀取的檔名與位置：data/graph.json
    os.makedirs('data', exist_ok=True)
    with open('data/graph.json', 'w', encoding='utf-8') as f:
        json.dump({'nodes': nodes, 'links': links, 'node_colors': node_colors, 'link_colors': link_colors}, f, ensure_ascii=False, indent=2)

    print("成功！已從 Google Sheets 更新並產生 data/graph.json（包含完整色彩設定）")

except Exception as e:
    print(f"抓取或轉換失敗: {e}")
    raise e

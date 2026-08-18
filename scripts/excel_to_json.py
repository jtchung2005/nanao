import pandas as pd
import json
import os
import re

# 1. Google Sheet ID 與各分頁 gid 填寫
SPREADSHEET_ID = "1X7gYxlJaUcbzPNgeLO-hjsz1tVGc7TZDAB5817B8BaI"

SHEET_GIDS = {
    'nodes_ALL': '422651298',
    'link_ALL': '1851835395',
    'nodes_color': '443146848',
    'links_color': '623413879',
    'supabase_data': '68415004'
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

    # 1. 解析節點分類與顏色對應
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

    # 3.5 整合 Supabase 後台資料 (Append 追加模式)
    try:
        df_supabase = get_sheet_df_by_gid('supabase_data')
        node_dict = {n['id']: n for n in nodes}
        
        for _, row in df_supabase.iterrows():
            target_raw = str(row['target_node_id']).strip() if 'target_node_id' in row and pd.notna(row['target_node_id']) else ''
            if not target_raw or target_raw.upper() in ['NEW', 'NAN', 'NONE']:
                continue
            
            target_ids = [t.strip() for t in target_raw.replace('，', ',').split(',')]
            
            for tid in target_ids:
                if tid not in node_dict:
                    continue
                n = node_dict[tid]
                
                # 1. 追加文字敘述
                if pd.notna(row.get('content')) and str(row['content']).strip():
                    new_content = str(row['content']).strip()
                    formatted_new = f"【南澳記憶庫】\n{new_content}"
                    existing_info = n.get('info', '').strip()
    
                # 只有當現有內容與新內容（純文字或帶標題）不一致時才追加
        if existing_info:
        if existing_info != new_content and existing_info != formatted_new:
            n['info'] = f"{existing_info}\n\n{formatted_new}"
        else:
        n['info'] = new_content
            
                
                # 2. 補齊地理座標
                try:
                    if pd.notna(row.get('latitude')) and str(row['latitude']).strip():
                        n['Lat'] = float(row['latitude'])
                    if pd.notna(row.get('longitude')) and str(row['longitude']).strip():
                        n['Lon'] = float(row['longitude'])
                except ValueError:
                    pass
                
                # 3. 補充圖片 URL
                if pd.notna(row.get('image_url')) and str(row['image_url']).strip():
                    n['Image'] = str(row['image_url']).strip()
                
                # 4. 補充詳細地址
                if pd.notna(row.get('place_name')) and str(row['place_name']).strip():
                    n['address'] = str(row['place_name']).strip()
                
                # 5. 補齊年份
                '''if pd.notna(row.get('period_text')) and str(row['period_text']).strip():
                    years = re.findall(r'\d{4}', str(row['period_text']))
                    if years and not n.get('start_year'):
                        n['start_year'] = years[0]'''
                
                # 6. 補充投稿來源與分享者
                sharer = str(row['sharer_name']).strip() if pd.notna(row.get('sharer_name')) else ''
                source = str(row['source_label']).strip() if pd.notna(row.get('source_label')) else ''
                credits_parts = [p for p in [source, sharer] if p and p.lower() not in ['nan', 'none']]
                if credits_parts:
                    n['credits'] = ' / '.join(credits_parts)

        print("✅ 已成功以 Append 模式整合 Supabase 資料！")
    except Exception as e:
        print(f"⚠️ Supabase 資料整合失敗: {e}")

    # 5. 輸出至網頁檔名與位置：data/graph.json
    output_data = {
        'nodes': nodes,
        'links': links,
        'node_colors': node_colors,
        'link_colors': link_colors
    }
    
    os.makedirs('data', exist_ok=True)
    with open('data/graph.json', 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
        
    print("🎉 資料轉換與整合成功完成！檔案已更新至 data/graph.json（包含完整色彩設定）")

except Exception as e:
    print(f"❌ 抓取或轉換失敗: {e}")
    raise e

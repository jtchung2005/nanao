"""
自動幫節點分派主題標籤（用於進站主題選擇畫面）。
規則：現有 group 欄位 + 節點名稱/介紹文字關鍵字比對，人工審核調整用的第一版。
讀取 data/graph.json，輸出 src/data/themeTags.json（主題 id -> 節點 id 陣列）。
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'data' / 'graph.json'
DEST = ROOT / 'src' / 'data' / 'themeTags.json'

ORG_GROUPS = {'政府機關', '政府機構', '非營利組織', '私人企業', '大學', '組織'}

RULES = {
    '泰雅人物': lambda n, t: group(n) in ('人物', '族群', '群體'),
    '部落遷徙與歷史事件': lambda n, t: group(n) == '事件' or re.search(
        '遷村|理蕃|遷徙|討伐|侵墾|舊社|禁伐政策|林班地衝突|山地平地化', t),
    '尋根活動與文化傳承': lambda n, t: (
        group(n) == '行動/活動' and re.search(
            '尋根|文化|織布|弓織|陷阱|家屋|返鄉|文物|傳承|部落生活|飛魚|營|畢業典禮', t)
    ) or re.search('傳統家屋|武塔泰雅家屋|紀錄片|藤編|織布|莎韻之鐘|羅大春開路紀念碑|南澳觀音像', t),
    '段木香菇產業與林下經濟': lambda n, t: group(n) == '產業' or re.search(
        '香菇|菌種|段木|林下經濟|批發|零售|農業|畜牧|經濟學觀點|杜英|赤楊|青剛櫟|楓香', t),
    '在地美食與飲食文化': lambda n, t: re.search(
        '美食|飲食|餐盤|小米|醃|刺蔥|馬告|料理|食譜|菜餚|飲食歌', t),
    '健康與日夜節律研究': lambda n, t: group(n) == '健康議題' or re.search(
        '光照|節律|睡眠|光復能|健康促進|護理|Apple Watch|WeWish|生理時鐘', t),
    '部落空間與地景': lambda n, t: group(n) in ('空間', '地點') or re.search(
        '部落|聚落|村(?!民代表會)', n.get('id', '')),
    '在地組織與計畫': lambda n, t: group(n) in ORG_GROUPS or re.search(
        '計畫|工作站|委員會|代表會|協會|聯盟', t),
}

# 規則比對不到的節點，人工指定歸類。
# 跑完腳本若印出「未分類」節點，比照這裡的格式把它加進來，再重跑一次。
EXTRA_OVERRIDES = {
    '流星少女彩繪鋼琴': ['尋根活動與文化傳承'],
    '不一樣的月光': ['尋根活動與文化傳承'],
    '昭和草': ['在地美食與飲食文化'],
    '泰雅歌舞動起來': ['尋根活動與文化傳承'],
    '坐式泰雅傳統歌舞運動訓練': ['尋根活動與文化傳承', '健康與日夜節律研究'],
    '狩獵季': ['健康與日夜節律研究'],
    '早起早歸模式': ['健康與日夜節律研究'],
    '內外互動性': ['健康與日夜節律研究'],
    '山林智慧': ['健康與日夜節律研究'],
    '教會活動 (禮拜天)': ['健康與日夜節律研究'],
    '採藤': ['尋根活動與文化傳承'],
    '室內活動為主': ['健康與日夜節律研究'],
    '長時間看電視': ['健康與日夜節律研究'],
    '光環境量測': ['健康與日夜節律研究'],
    '心律頻譜': ['健康與日夜節律研究'],
    '獻馘碑': ['部落遷徙與歷史事件'],
    '南澳神社': ['部落遷徙與歷史事件'],
    '社群同步性': ['健康與日夜節律研究'],
}


def group(n):
    return (n.get('group') or '').strip()


def node_text(n):
    return n.get('id', '') + ' ' + (n.get('info') or '')


def main():
    raw = json.loads(SRC.read_text(encoding='utf-8'))
    nodes = [n for n in raw['nodes'] if group(n) != '自動增加']

    theme_nodes = {k: set() for k in RULES}
    uncovered = []
    for n in nodes:
        t = node_text(n)
        hit = False
        for theme_id, rule in RULES.items():
            if rule(n, t):
                theme_nodes[theme_id].add(n['id'])
                hit = True
        for theme_id in EXTRA_OVERRIDES.get(n['id'], []):
            theme_nodes[theme_id].add(n['id'])
            hit = True
        if not hit:
            uncovered.append(n['id'])

    out = {k: sorted(v) for k, v in theme_nodes.items()}
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(
        json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8'
    )

    print(f'總節點數：{len(nodes)}')
    for k, v in out.items():
        print(f'  {k}: {len(v)}')
    if uncovered:
        print(f'\n未分類到任何主題的節點（{len(uncovered)} 個），請加進 EXTRA_OVERRIDES：')
        for nid in uncovered:
            print(f'  - {nid}')
    else:
        print('\n所有節點都至少有一個主題。')


if __name__ == '__main__':
    main()

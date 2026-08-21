# 主題選擇入口 + 圖譜介面簡化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在南澳知識圖譜網站加上一個「進站先選主題」的全螢幕選擇畫面，選完主題後只顯示相關節點；同時拿掉圖譜畫面上目前用不到的左側分群側欄與底部時間軸／篩選面板，改用底部主題切換列取代。全程在獨立分支開發、本地預覽，不動 `main` 分支或正式網站。

**Architecture:** 沿用現有 React + Vite + D3 force-directed graph 架構。新增一層獨立的「主題」資料（Python 腳本從 `data/graph.json` 用關鍵字＋既有分類自動產生節點對照表），在 `App.jsx` 裡疊加在既有的 `mg`/`mr`/`years` 篩選結果之上；新增兩個 UI 元件（進站蓋板、底部主題切換列），拿掉三個舊元件的掛載點（`GroupSidebar`、`TimelineSlider`、`Legend`、`RelationFilter`，檔案保留不刪除，只是 `App.jsx` 不再引用）。

**Tech Stack:** React 19、Vite 7、D3 7、純 CSS（沿用 `src/styles/paper.css` / `tokens.css` 既有樣式系統，不新增 CSS 檔案）、Python 3（僅用於一次性產生主題對照表）。

**Spec:** `docs/superpowers/specs/2026-08-21--theme-entry-gate.md`

## Global Constraints

- 不修改 `data/graph.json` 原始資料或 `scripts/excel_to_json.py` 資料管線
- 不刪除 `GroupSidebar.jsx` / `TimelineSlider.jsx` / `Legend.jsx` / `RelationFilter.jsx` 檔案，只移除 `App.jsx` 對它們的引用
- 所有開發在新分支進行，禁止 push 到 `origin` 或合併回 `main`，直到使用者在本地預覽後明確同意
- 本專案目前沒有自動化測試框架（無 vitest/jest），驗證方式為：`npm run build` 確認可編譯 + 實際啟動 `npm run dev` 用瀏覽器操作確認
- 視覺風格必須沿用現有 `.paper-card` / `.chip` / `.btn` / `.title-1` / `.caption` / `.tiny` 等既有 CSS class，不新增樣式檔案

---

## Task 1: 建立測試分支

**Files:** 無檔案異動，純 git 操作

- [ ] **Step 1: 確認目前工作目錄乾淨**

Run: `cd "/Users/cheryl/Documents/cheryl agent/nanao" && git status`
Expected: `nothing to commit, working tree clean`（如果不是，先停下來確認是不是有未存的工作，不要直接動它）

- [ ] **Step 2: 建立新分支**

```bash
cd "/Users/cheryl/Documents/cheryl agent/nanao"
git checkout -b feat/theme-entry-gate
```

- [ ] **Step 3: 確認在新分支上**

Run: `git branch --show-current`
Expected: `feat/theme-entry-gate`

---

## Task 2: 主題分類腳本，產生節點主題對照表

**Files:**
- Create: `nanao/scripts/generate_theme_tags.py`
- Create (由腳本產生): `nanao/src/data/themeTags.json`

**Interfaces:**
- Produces: `src/data/themeTags.json`，格式為 `{ [themeId: string]: string[] }`（主題 id → 節點 id 陣列，id 直接用中文主題名稱字串，跟 `data/graph.json` 節點的 `id` 對應）。Task 5、6 會 `import themeTags from '../data/themeTags.json'` 使用。

- [ ] **Step 1: 寫腳本**

建立 `nanao/scripts/generate_theme_tags.py`，內容如下（規則已用實際資料驗證過，339 個真實節點全部至少對應一個主題，不會有漏網節點）：

```python
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
    '泰雅人物與英雄故事': lambda n, t: group(n) in ('人物', '族群', '群體'),
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
```

- [ ] **Step 2: 執行腳本**

Run: `cd "/Users/cheryl/Documents/cheryl agent/nanao" && python3 scripts/generate_theme_tags.py`

Expected output（數字需完全符合，因為規則已經先驗證過一次）：
```
總節點數：339
  泰雅人物與英雄故事: 64
  部落遷徙與歷史事件: 44
  尋根活動與文化傳承: 59
  段木香菇產業與林下經濟: 63
  在地美食與飲食文化: 20
  健康與日夜節律研究: 90
  部落空間與地景: 61
  在地組織與計畫: 59

所有節點都至少有一個主題。
```

若數字不符或出現「未分類」清單，代表 `data/graph.json` 內容跟規劃時不同，需要停下來回報差異，不要憑感覺調規則。

- [ ] **Step 3: 確認產生的檔案**

Run: `cat "/Users/cheryl/Documents/cheryl agent/nanao/src/data/themeTags.json" | python3 -m json.tool | head -20`
Expected: 看得到合法 JSON，第一個主題底下是排序過的節點 id 陣列。

- [ ] **Step 4: Commit**

```bash
cd "/Users/cheryl/Documents/cheryl agent/nanao"
git add scripts/generate_theme_tags.py src/data/themeTags.json
git commit -m "feat: 新增主題自動分類腳本與節點主題對照表"
```

---

## Task 3: 主題定義設定檔

**Files:**
- Create: `nanao/src/data/themes.js`

**Interfaces:**
- Consumes: 無（純靜態資料，`id` 需與 Task 2 產生的 `themeTags.json` 的 key 完全一致）
- Produces: `THEMES`，陣列，每個元素 `{ id: string, desc: string }`，順序即畫面顯示順序。Task 4、5、6 會 `import { THEMES } from '../data/themes.js'`。

- [ ] **Step 1: 寫檔案**

建立 `nanao/src/data/themes.js`：

```js
export const THEMES = [
  { id: '泰雅人物與英雄故事', desc: '頭目、耆老、青年、學者等人物故事' },
  { id: '部落遷徙與歷史事件', desc: '遷村、理蕃、討伐等歷史事件' },
  { id: '尋根活動與文化傳承', desc: '尋根之旅、織布課程、文物展、家屋' },
  { id: '段木香菇產業與林下經濟', desc: '產業、菌種、樹種、批發零售' },
  { id: '在地美食與飲食文化', desc: '小米醃肉、刺蔥、健康餐盤等飲食物件' },
  { id: '健康與日夜節律研究', desc: '睡眠、光照、慢性病等健康議題' },
  { id: '部落空間與地景', desc: '部落、聚落、據點' },
  { id: '在地組織與計畫', desc: '政府機關、非營利組織、私人企業、大學' },
];
```

- [ ] **Step 2: 確認 id 跟 themeTags.json 的 key 完全對應**

Run:
```bash
cd "/Users/cheryl/Documents/cheryl agent/nanao"
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { THEMES } from './src/data/themes.js';
const themeTags = JSON.parse(readFileSync('./src/data/themeTags.json', 'utf-8'));
const a = THEMES.map(t => t.id).sort();
const b = Object.keys(themeTags).sort();
console.log('themes.js 有但 themeTags.json 沒有:', a.filter(x => !b.includes(x)));
console.log('themeTags.json 有但 themes.js 沒有:', b.filter(x => !a.includes(x)));
"
```
Expected: 兩行都印出空陣列 `[]`

- [ ] **Step 3: Commit**

```bash
cd "/Users/cheryl/Documents/cheryl agent/nanao"
git add src/data/themes.js
git commit -m "feat: 新增主題定義設定檔"
```

---

## Task 4: ThemeGate 元件（進站主題選擇蓋板）

**Files:**
- Create: `nanao/src/panels/ThemeGate.jsx`

**Interfaces:**
- Consumes: `THEMES`（Task 3）的形狀 `{ id, desc }[]`
- Produces: `ThemeGate` React 元件，props：
  - `themes: { id: string, desc: string }[]`
  - `themeCounts: { [id: string]: number }`
  - `onEnter: (selectedIds: string[]) => void`
  - `onSkip: () => void`

Task 6 會這樣使用：`<ThemeGate themes={THEMES} themeCounts={themeCounts} onEnter={handleGateEnter} onSkip={handleGateSkip} />`

- [ ] **Step 1: 寫元件**

建立 `nanao/src/panels/ThemeGate.jsx`：

```jsx
import React, { useState } from 'react';

/**
 * 進站主題選擇蓋板：多選主題卡片，選好後進圖譜，或直接跳過看全部。
 * 每次重新整理網站都會出現（不用 localStorage 記憶）。
 */
export default function ThemeGate({ themes, themeCounts, onEnter, onSkip }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="paper-bg fade-in"
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflowY: 'auto',
      }}
    >
      <div className="title-1" style={{ marginBottom: 8, textAlign: 'center' }}>南澳知識圖譜</div>
      <div className="caption" style={{ marginBottom: 28, textAlign: 'center' }}>
        你想從哪裡開始探索？可以選一個或多個主題
      </div>

      <div
        style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
          maxWidth: 680, marginBottom: 32,
        }}
      >
        {themes.map((t) => {
          const active = selected.has(t.id);
          return (
            <button
              key={t.id}
              className={`btn${active ? ' active' : ''}`}
              onClick={() => toggle(t.id)}
              style={{
                flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                padding: '14px 18px', width: 220, textAlign: 'left', cursor: 'pointer',
              }}
            >
              <span className="body" style={{ fontWeight: 700 }}>{t.id}</span>
              <span
                className="tiny"
                style={{ color: active ? 'inherit' : 'var(--ink-faint)' }}
              >
                {t.desc}・{themeCounts?.[t.id] ?? 0} 個節點
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <button
          className="btn"
          style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)' }}
          onClick={onSkip}
        >
          跳過，看全部
        </button>
        <button
          className="btn active"
          disabled={selected.size === 0}
          style={{
            opacity: selected.size === 0 ? 0.4 : 1,
            cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
          }}
          onClick={() => onEnter(Array.from(selected))}
        >
          進入圖譜 →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 確認可以編譯**

Run: `cd "/Users/cheryl/Documents/cheryl agent/nanao" && npx vite build 2>&1 | tail -30`
Expected: 這一步 `App.jsx` 還沒接上 `ThemeGate`，所以 build 應該跟 Task 4 之前一樣正常成功（`ThemeGate.jsx` 目前是孤立檔案，vite 不會因為它報錯，除非語法有問題）。若出現 `ThemeGate.jsx` 相關的語法錯誤，修正後重跑。

- [ ] **Step 3: Commit**

```bash
cd "/Users/cheryl/Documents/cheryl agent/nanao"
git add src/panels/ThemeGate.jsx
git commit -m "feat: 新增 ThemeGate 進站主題選擇元件"
```

---

## Task 5: ThemeNavBar 元件（底部主題切換列）

**Files:**
- Create: `nanao/src/panels/ThemeNavBar.jsx`

**Interfaces:**
- Consumes: `THEMES` 的形狀 `{ id, desc }[]`
- Produces: `ThemeNavBar` React 元件，props：
  - `ref`（React 19 可直接把 `ref` 當一般 prop 傳入函式元件，不需要 `forwardRef`）：掛在最外層 DOM 節點，供 `App.jsx` 用 `ResizeObserver` 量測高度
  - `themes: { id: string, desc: string }[]`
  - `activeThemes: Set<string>`
  - `onSwitchTheme: (id: string) => void`
  - `onShowAll: () => void`

根 DOM 節點 `id="tour-theme-nav"`，供 Task 6 的導覽步驟用來定位聚光燈。

Task 6 會這樣使用：`<ThemeNavBar ref={bottomRef} themes={THEMES} activeThemes={activeThemes} onSwitchTheme={handleSwitchTheme} onShowAll={handleShowAll} />`

- [ ] **Step 1: 寫元件**

建立 `nanao/src/panels/ThemeNavBar.jsx`：

```jsx
import React from 'react';

/**
 * 進圖譜後的底部主題切換列：顯示目前未選中的主題 + 「顯示全部」。
 * 點主題 chip 會切換（取代）成只看該主題；點「顯示全部」清空主題篩選看完整圖譜。
 */
export default function ThemeNavBar({ ref, themes, activeThemes, onSwitchTheme, onShowAll }) {
  const showingAll = activeThemes.size === 0;
  const inactiveThemes = themes.filter((t) => !activeThemes.has(t.id));

  return (
    <div
      ref={ref}
      id="tour-theme-nav"
      className="paper-card"
      style={{
        position: 'absolute', bottom: 12, left: 12, right: 12,
        padding: '10px 16px', zIndex: 25,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="tiny" style={{ color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>切換主題</span>
        <button
          className="chip"
          style={{
            cursor: 'pointer',
            background: showingAll ? 'var(--ink-primary)' : 'var(--paper-bg)',
            color: showingAll ? 'var(--paper-bg)' : 'var(--ink-secondary)',
            borderColor: showingAll ? 'var(--ink-primary)' : 'var(--paper-edge)',
          }}
          onClick={onShowAll}
        >
          顯示全部
        </button>
        {inactiveThemes.map((t) => (
          <button
            key={t.id}
            className="chip"
            style={{ cursor: 'pointer' }}
            onClick={() => onSwitchTheme(t.id)}
          >
            {t.id}
          </button>
        ))}
      </div>
      <div
        className="tiny"
        style={{
          borderTop: '1px solid var(--ink-line)', paddingTop: 4, textAlign: 'center',
          color: 'var(--ink-faint)', fontSize: 10, lineHeight: 1.5,
        }}
      >
        © 國立陽明交通大學跨領域設計科學研究中心 (TDIS) ・ 曾聖凱 助理教授・
        <a href="mailto:sky@arch.nycu.edu.tw" style={{ color: 'inherit', textDecoration: 'none' }}>
          sky@arch.nycu.edu.tw
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 確認可以編譯**

Run: `cd "/Users/cheryl/Documents/cheryl agent/nanao" && npx vite build 2>&1 | tail -30`
Expected: 成功（`ThemeNavBar.jsx` 此時仍是孤立檔案，同 Task 4 說明）

- [ ] **Step 3: Commit**

```bash
cd "/Users/cheryl/Documents/cheryl agent/nanao"
git add src/panels/ThemeNavBar.jsx
git commit -m "feat: 新增 ThemeNavBar 底部主題切換元件"
```

---

## Task 6: App.jsx 整合 — 接上主題蓋板／切換列，移除舊分群側欄與底部篩選面板

**Files:**
- Modify: `nanao/src/App.jsx`（整檔取代）

**Interfaces:**
- Consumes: `THEMES`（Task 3）、`themeTags.json`（Task 2）、`ThemeGate`（Task 4）、`ThemeNavBar`（Task 5）
- Produces: 無（頂層元件）

這個 task 把 `App.jsx` 整檔換成下面的版本。跟原本的差異：
1. 拿掉 `GroupSidebar` / `TimelineSlider` / `Legend` / `RelationFilter` 的 import 與渲染（檔案不刪）
2. 拿掉只服務左側分群側欄的 state／函式：`collapsedGroups`、`groupHighlight`、`sidebarOpen`、`applyGroupHighlight`、`handleHighlightIds`、`focusNodeGroup`、`toggleSetIn`、`demoGroup`／`demoGroupIds`／`demoGroupKey`
3. 新增主題狀態：`themeGateOpen`、`activeThemes`、`themeNodeSets`、`themeCounts`，以及疊加在既有 `filtered` 之上的 `themeFiltered`（真正餵給圖譜渲染的資料）
4. 新增 `ThemeGate`（`themeGateOpen` 為 true 時全螢幕顯示）與 `ThemeNavBar`（`themeGateOpen` 為 false 時顯示在底部，取代原本的底部面板；`bottomRef` 量測高度的邏輯沿用，只是換了掛的元件）
5. 首次導覽的觸發時機從「資料載入後 900ms」改成「主題蓋板關閉後 900ms」；導覽步驟拿掉介紹側欄跟時間軸的兩步，改成介紹底部主題切換列
6. 「重置篩選」按鈕（↺）維持原本重置 `mg`/`mr`/`bt`/`od`/`years`／清空選中節點的行為，另外加上把 `activeThemes` 清空（等同「顯示全部」）
7. 既有的 `mg`/`mr`/`years`/`bt`/`od` URL 篩選機制、`filtered` 計算邏輯完全不動——UI 勾選介面拿掉了，但底層資料流原封不動保留，`themeFiltered` 是疊加在它上面的新一層

- [ ] **Step 1: 整檔取代 App.jsx**

把 `nanao/src/App.jsx` 的內容整個換成：

```jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphData } from './state/useGraphData.js';
import { useUrlState, codecs } from './state/useUrlState.js';
import { ForceGraph } from './graph/ForceGraph.js';
import LabelLayer from './graph/LabelLayer.jsx';
import HoverTooltip from './graph/HoverTooltip.jsx';
import { computeNeighbors } from './utils/highlight.js';
import { setNodeSizeScale } from './graph/Renderer.js';
import { getNodeLonLat } from './graph/ForceGraph.js';
import InfoCard from './panels/InfoCard.jsx';
import Search from './panels/Search.jsx';
import Minimap from './panels/Minimap.jsx';
import GraphControl from './panels/GraphControl.jsx';
import OnboardingTour from './panels/OnboardingTour.jsx';
import ThemeGate from './panels/ThemeGate.jsx';
import ThemeNavBar from './panels/ThemeNavBar.jsx';
import { THEMES } from './data/themes.js';
import themeTags from './data/themeTags.json';

const URL_PARAMS = {
  node:   { default: '', ...codecs.string },
  mg:     { default: new Set(), ...codecs.setOfStrings },
  mr:     { default: new Set(), ...codecs.setOfStrings },
  bt:     { default: false, ...codecs.bool },
  od:     { default: false, ...codecs.bool },
  years:  { default: null, parse: codecs.intRange.parse, serialize: (v) => v ? codecs.intRange.serialize(v) : '' },
};

const BP_MOBILE = 768;
const DEFAULTS = { fontSize: 12, nodeScale: 1.0, charge: -360 };

export default function App() {
  const { data, loading, error } = useGraphData();
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const bottomRef = useRef(null);
  const ctrlRef = useRef(null);

  const [hover, setHover] = useState({ node: null, x: 0, y: 0 });
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [ctrlOpen, setCtrlOpen] = useState(window.innerWidth >= BP_MOBILE);
  const [bottomBarH, setBottomBarH] = useState(150);
  const [ctrlH, setCtrlH] = useState(40);

  const [fontSize, setFontSize] = useState(DEFAULTS.fontSize);
  const [nodeScale, setNodeScale] = useState(DEFAULTS.nodeScale);
  const [charge, setCharge] = useState(DEFAULTS.charge);
  const [spatialMode, setSpatialMode] = useState(true);

  const [urlState, setUrlState] = useUrlState(URL_PARAMS);
  const isMobile = vp.w < BP_MOBILE;

  // ── 主題選擇 ──────────────────────────────────────
  const [themeGateOpen, setThemeGateOpen] = useState(true);
  const [activeThemes, setActiveThemes] = useState(new Set());

  const themeNodeSets = useMemo(() => {
    const m = new Map();
    for (const [themeId, ids] of Object.entries(themeTags)) m.set(themeId, new Set(ids));
    return m;
  }, []);

  const themeCounts = useMemo(() => {
    const c = {};
    for (const [themeId, set] of themeNodeSets) c[themeId] = set.size;
    return c;
  }, [themeNodeSets]);

  const handleGateEnter = (ids) => {
    setActiveThemes(new Set(ids));
    setThemeGateOpen(false);
  };
  const handleGateSkip = () => {
    setActiveThemes(new Set());
    setThemeGateOpen(false);
  };
  const handleSwitchTheme = (id) => setActiveThemes(new Set([id]));
  const handleShowAll = () => setActiveThemes(new Set());

  // 初始化 URL state
  useEffect(() => {
    if (!data) return;
    setUrlState((s) => {
      const next = { ...s };
      if (s.mg.size === 0) next.mg = new Set(data.meta_groups.filter((g) => g.count > 0).map((g) => g.id));
      if (s.mr.size === 0) next.mr = new Set(data.meta_relations.filter((r) => r.count > 0).map((r) => r.id));
      if (!s.years) next.years = data.stats.year_range.slice();
      return next;
    });
  }, [data, setUrlState]);

  // 視窗縮放
  useEffect(() => {
    const onResize = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      if (window.innerWidth < BP_MOBILE) {
        setCtrlOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 量測底部主題列高度
  useEffect(() => {
    if (!bottomRef.current) return;
    const ro = new ResizeObserver((es) => setBottomBarH(es[0].contentRect.height));
    ro.observe(bottomRef.current);
    return () => ro.disconnect();
  }, [themeGateOpen]);

  useEffect(() => {
    if (!ctrlRef.current) { setCtrlH(40); return; }
    const ro = new ResizeObserver((es) => setCtrlH(es[0].contentRect.height));
    ro.observe(ctrlRef.current);
    return () => ro.disconnect();
  }, [ctrlOpen]);

  // 計算 lat/lon bounds（自動修正 swap）
  const spatialInfo = useMemo(() => {
    if (!data) return { bounds: null, count: 0 };
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    let count = 0;
    for (const n of data.nodes) {
      const ll = getNodeLonLat(n);
      if (!ll) continue;
      if (ll.lon < minLon) minLon = ll.lon;
      if (ll.lon > maxLon) maxLon = ll.lon;
      if (ll.lat < minLat) minLat = ll.lat;
      if (ll.lat > maxLat) maxLat = ll.lat;
      count++;
    }
    if (!count) return { bounds: null, count: 0 };
    const padLon = (maxLon - minLon) * 0.05 || 0.001;
    const padLat = (maxLat - minLat) * 0.05 || 0.001;
    return {
      bounds: {
        minLon: minLon - padLon, maxLon: maxLon + padLon,
        minLat: minLat - padLat, maxLat: maxLat + padLat,
      },
      count,
    };
  }, [data]);

  // 過濾（類別／關係／年份 —— UI 已拿掉，實際上永遠是全開，維持底層邏輯不變）
  const filtered = useMemo(() => {
    if (!data) return null;
    const ag = urlState.mg.size ? urlState.mg : new Set(data.meta_groups.map((g) => g.id));
    const ar = urlState.mr.size ? urlState.mr : new Set(data.meta_relations.map((r) => r.id));
    const [yMin, yMax] = urlState.years || data.stats.year_range;
    const nodes = data.nodes.filter((n) => {
      if (!ag.has(n.meta_group)) return false;
      if (urlState.bt && !n.breakthrough_note) return false;
      if (urlState.od && n.start_year == null && n.end_year == null) return false;
      if (n.start_year != null) {
        const ns = n.start_year;
        const ne = n.end_year ?? ns;
        if (ne < yMin || ns > yMax) return false;
      }
      return true;
    });
    const ids = new Set(nodes.map((n) => n.id));
    const links = data.links.filter((l) => {
      if (!ar.has(l.meta_relation)) return false;
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return ids.has(s) && ids.has(t);
    });
    return { nodes, links };
  }, [data, urlState.mg, urlState.mr, urlState.bt, urlState.od, urlState.years]);

  // 主題篩選層：疊加在 filtered 之上，真正餵給圖譜渲染的是這一層
  const themeFiltered = useMemo(() => {
    if (!filtered) return filtered;
    if (activeThemes.size === 0) return filtered;
    const allowIds = new Set();
    for (const themeId of activeThemes) {
      const set = themeNodeSets.get(themeId);
      if (set) for (const id of set) allowIds.add(id);
    }
    const nodes = filtered.nodes.filter((n) => allowIds.has(n.id));
    const ids = new Set(nodes.map((n) => n.id));
    const links = filtered.links.filter((l) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return ids.has(s) && ids.has(t);
    });
    return { nodes, links };
  }, [filtered, activeThemes, themeNodeSets]);

  useEffect(() => {
    if (!themeFiltered || !containerRef.current) return;
    if (!graphRef.current) {
      graphRef.current = new ForceGraph(containerRef.current);
      graphRef.current.on('click', (n) => setUrlState((s) => ({ ...s, node: n?.id ?? '' })));
      graphRef.current.on('hover', (n, e) => {
        if (n && e) setHover({ node: n, x: e.clientX, y: e.clientY });
        else setHover({ node: null, x: 0, y: 0 });
      });
      graphRef.current._spatialMode = spatialMode && spatialInfo.count > 0;
      graphRef.current._spatialBounds = spatialInfo.bounds;
    }
    graphRef.current.setData(themeFiltered.nodes, themeFiltered.links);
  }, [themeFiltered, setUrlState, spatialMode, spatialInfo]);

  useEffect(() => () => {
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }
  }, []);

  // ── GraphControl 連動 ────────────────────────────
  useEffect(() => {
    setNodeSizeScale(nodeScale);
    if (graphRef.current) {
      graphRef.current.requestRedraw();
      graphRef.current.reapplyCollide();
    }
  }, [nodeScale]);

  useEffect(() => {
    if (graphRef.current) graphRef.current.setChargeStrength(charge);
  }, [charge]);

  // 同步 spatial 狀態到 ForceGraph
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.setSpatialMode(spatialMode && spatialInfo.count > 0, spatialInfo.bounds);
  }, [spatialMode, spatialInfo]);

  const allNodesById = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

  const selected = urlState.node ? allNodesById.get(urlState.node) : null;

  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    g.setSelected(selected?.id ?? null);
    if (selected) {
      const r = computeNeighbors(selected.id, g.links);
      g.setHighlight(r?.nodeIds, r?.linkKeys);
    } else {
      g.setHighlight(null, null);
    }
  }, [selected]);

  const highlightIds = useMemo(() => {
    if (selected && graphRef.current) {
      const r = computeNeighbors(selected.id, graphRef.current.links);
      return r?.nodeIds ?? new Set([selected.id]);
    }
    return null;
  }, [selected, themeFiltered]);

  const reset = () => {
    if (!data) return;
    setUrlState({
      node: '',
      mg: new Set(data.meta_groups.filter((g) => g.count > 0).map((g) => g.id)),
      mr: new Set(data.meta_relations.filter((r) => r.count > 0).map((r) => r.id)),
      bt: false,
      od: false,
      years: data.stats.year_range.slice(),
    });
    setActiveThemes(new Set());
    if (graphRef.current) graphRef.current.setHighlight(null, null);
  };

  const resetGraphControl = () => {
    setFontSize(DEFAULTS.fontSize);
    setNodeScale(DEFAULTS.nodeScale);
    setCharge(DEFAULTS.charge);
  };

  const handleNodeClick = (node) => {
    setUrlState((s) => ({ ...s, node: node.id }));
    graphRef.current?.zoomToNode(node.id, 1.4);
  };

  const onClose = () => setUrlState((s) => ({ ...s, node: '' }));

  // ── 首次進入導覽（選完主題、進圖譜後才會跑）────────
  const [tourActive, setTourActive] = useState(false);
  useEffect(() => {
    if (!data || loading || themeGateOpen) return undefined;
    if (localStorage.getItem('nanao_tour_seen')) return undefined;
    const t = setTimeout(() => setTourActive(true), 900);
    return () => clearTimeout(t);
  }, [data, loading, themeGateOpen]);

  const finishTour = () => {
    setTourActive(false);
    localStorage.setItem('nanao_tour_seen', '1');
  };

  // 挑一個連結數最多、且有介紹文字的節點，導覽時示範資訊卡長怎樣
  const demoNodeId = useMemo(() => {
    if (!data) return null;
    const degree = {};
    for (const l of data.links) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degree[s] = (degree[s] || 0) + 1;
      degree[t] = (degree[t] || 0) + 1;
    }
    let best = null, bestScore = -Infinity;
    for (const n of data.nodes) {
      const d = degree[n.id] || 0;
      if (!n.info || d < 2) continue;
      const score = -Math.abs(d - 5);
      if (score > bestScore) { bestScore = score; best = n.id; }
    }
    return best;
  }, [data]);

  const tourSteps = useMemo(() => ([
    { target: 'tour-search', text: '輸入關鍵字，可以快速找到任何人物、地點或事件節點。' },
    { target: 'tour-canvas', text: '在圖上點擊任一個圓點節點，可以看到它的詳細介紹。' },
    {
      target: 'tour-infocard',
      text: '節點的完整介紹會顯示在這裡，包含年份、地點與說明文字。',
      onEnter: () => { if (demoNodeId) setUrlState((s) => ({ ...s, node: demoNodeId })); },
    },
    {
      target: 'tour-infocard-related',
      text: '往下捲動還會看到「網絡連結」——這個節點跟哪些人、事、地有關係，點擊任一個連結就能跳過去，一路順著關係鏈往下探索整個南澳知識網絡。',
      onEnter: () => { document.getElementById('tour-infocard-related')?.scrollIntoView({ block: 'nearest' }); },
      onLeave: () => { setUrlState((s) => (s.node === demoNodeId ? { ...s, node: '' } : s)); },
    },
    { target: 'tour-theme-nav', text: '畫面下方可以隨時切換想看的主題，或按「顯示全部」看完整圖譜。' },
  ]), [demoNodeId, setUrlState]);

  // ── Layout ──────────────────────────────────────
  const sidePanelBottom = bottomBarH + 24;
  const minimapBottom = bottomBarH + 16;
  const ctrlTop = 80;
  const infoCardTop = ctrlTop + (ctrlOpen ? ctrlH : 40) + 8;
  const infoCardWidth = isMobile ? 'calc(100vw - 24px)' : 360;

  return (
    <div className="paper-bg fixed inset-0">
      <div id="tour-canvas" ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      <LabelLayer
        graph={graphRef.current}
        width={vp.w}
        height={vp.h}
        highlightIds={highlightIds}
        fontSize={fontSize}
      />

      <HoverTooltip node={hover.node} x={hover.x} y={hover.y} />

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center fade-in" style={{ zIndex: 100 }}>
          <div className="caption">載入南澳資料中...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 100 }}>
          <div className="paper-card body" style={{ padding: 24, color: 'var(--cat-事件)' }}>
            錯誤：{error.message}
          </div>
        </div>
      )}

      {/* Top bar */}
      {data && (
        <div
          className="paper-card"
          style={{
            position: 'absolute', top: 12, left: 12, right: 12, height: 56,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
            zIndex: 30,
          }}
        >
          <div className="title-2" style={{ whiteSpace: 'nowrap' }}>南澳知識圖譜</div>
          {!isMobile && (
            <div className="caption" style={{ borderRight: '1px solid var(--ink-line)', paddingRight: 12, whiteSpace: 'nowrap' }}>
              — Klesan 群人文地景數位典藏
            </div>
          )}
          <Search nodes={data.nodes} links={data.links} onSelectNode={handleNodeClick} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isMobile && (
              <span className="tiny" style={{ whiteSpace: 'nowrap' }}>
                節點 {themeFiltered?.nodes.length ?? 0}/{data.stats.nodes} ・
                關係 {themeFiltered?.links.length ?? 0}/{data.stats.links}
              </span>
            )}
            <button className="btn" onClick={() => graphRef.current?.zoomToFit()} title="全覽">⛶</button>
            <button className="btn" onClick={reset} title="重置篩選">↺</button>
            <button className="btn" onClick={() => setTourActive(true)} title="使用說明">？</button>
          </div>
        </div>
      )}

      {/* Right: GraphControl */}
      {data && (
        <div
          ref={ctrlRef}
          style={{
            position: 'absolute', top: ctrlTop, right: 12, zIndex: 25,
            width: ctrlOpen ? (isMobile ? 'calc(100vw - 24px)' : 240) : 'auto',
          }}
        >
          <GraphControl
            open={ctrlOpen}
            onToggleOpen={() => setCtrlOpen((v) => !v)}
            fontSize={fontSize} onFontSize={setFontSize}
            nodeScale={nodeScale} onNodeScale={setNodeScale}
            charge={charge} onCharge={setCharge}
            spatialMode={spatialMode} onSpatialMode={setSpatialMode}
            geoCount={spatialInfo.count}
            onReset={resetGraphControl}
          />
        </div>
      )}

      {/* Minimap */}
      {data && !isMobile && <Minimap graph={graphRef.current} bottomOffset={minimapBottom} />}

      {/* InfoCard */}
      {selected && (
        <InfoCard
          node={selected}
          onClose={onClose}
          onNodeClick={handleNodeClick}
          allLinks={data?.links ?? []}
          allNodesById={allNodesById}
          width={infoCardWidth}
          top={infoCardTop}
          maxHeight={`calc(100vh - ${infoCardTop}px - ${sidePanelBottom}px)`}
        />
      )}

      {/* 底部主題切換列 */}
      {data && !themeGateOpen && (
        <ThemeNavBar
          ref={bottomRef}
          themes={THEMES}
          activeThemes={activeThemes}
          onSwitchTheme={handleSwitchTheme}
          onShowAll={handleShowAll}
        />
      )}

      <OnboardingTour active={tourActive} steps={tourSteps} onFinish={finishTour} />

      {/* 進站主題選擇蓋板 */}
      {data && themeGateOpen && (
        <ThemeGate
          themes={THEMES}
          themeCounts={themeCounts}
          onEnter={handleGateEnter}
          onSkip={handleGateSkip}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 確認可以編譯**

Run: `cd "/Users/cheryl/Documents/cheryl agent/nanao" && npx vite build 2>&1 | tail -40`
Expected: `✓ built in` 開頭的成功訊息，沒有紅字 error。如果報錯是找不到 `GroupSidebar`/`TimelineSlider`/`Legend`/`RelationFilter` 的 import，代表舊 import 沒拿乾淨，回頭檢查 Step 1 貼上的內容有沒有漏改。

- [ ] **Step 3: Commit**

```bash
cd "/Users/cheryl/Documents/cheryl agent/nanao"
git add src/App.jsx
git commit -m "feat: 接上主題選擇蓋板與底部切換列，移除舊分群側欄與底部篩選面板"
```

---

## Task 7: 本地啟動並完整手動驗收

**Files:** 無檔案異動

**Interfaces:** 無（純驗收）

- [ ] **Step 1: 啟動本地開發伺服器**

Run（背景執行，因為 `vite dev` 是常駐程序）：
```bash
cd "/Users/cheryl/Documents/cheryl agent/nanao" && npm run dev
```
Expected: 印出類似 `Local: http://localhost:5173/` 的網址，且伺服器持續運行不中斷。

- [ ] **Step 2: 用瀏覽器打開，檢查以下項目**

打開 Step 1 印出的網址，逐項確認：

1. 一進站看到全螢幕「南澳知識圖譜」主題選擇畫面，8 張主題卡片都顯示正確的節點數
2. 沒選任何主題時「進入圖譜」按鈕是灰的、按不下去；選 1 個以上主題後按鈕才能按
3. 選 2 個主題（例如「泰雅人物與英雄故事」+「段木香菇產業與林下經濟」）按「進入圖譜」→ 圖譜只顯示這兩個主題的節點聯集，右上角節點計數跟畫面上顯示的一致
4. 因為是第一次造訪（瀏覽器沒有 `nanao_tour_seen` 這個 localStorage 值），選完主題進圖譜後應該會自動跑一次操作導覽，最後一步要能正確指到底部主題切換列
5. 導覽跑完後，重新整理網頁 → 主題選擇畫面會再次出現（每次重整都出現），但這次不會再自動跑導覽
6. 進圖譜後，底部主題切換列要顯示「顯示全部」+ 沒被選到的其他 6 個主題 chip；點其中一個主題 chip → 圖譜切換成只顯示那一個主題（不是疊加），底部列跟著更新
7. 點「顯示全部」→ 圖譜顯示完整 339 個節點
8. 點任一節點 → InfoCard 正常彈出、可以透過「網絡連結」跳轉到其他節點
9. 右上角 GraphControl（字體/節點大小/施力）跟左下 Minimap 都正常可用
10. 畫面上不應該再看到左側「強調」分群側欄，也不應該再看到原本的時間軸/類別勾選/關係勾選面板
11. 點右上角「重置篩選」(↺) → 回到「顯示全部」狀態、清空選中節點

若哪一項跟預期不符，記下實際發生什麼、對照上面第幾點，回報後再修正對應的檔案（不要直接猜著改，先確認是哪個環節）。

- [ ] **Step 3: 停止開發伺服器**

確認完成後，把 Step 1 啟動的 `npm run dev` 程序停掉（Ctrl+C 或關閉背景工作）。

- [ ] **Step 4: 回報結果給使用者**

把驗收結果（第 2 步 11 項的確認狀況，特別是有沒有跟預期不符的地方）整理成清單回報。**不要在使用者確認沒問題之前執行 `git push`。**

---

## 完成後（不在此計畫範圍內，需使用者另外確認）

使用者看過本地預覽、確認沒問題後，才進行：
```bash
cd "/Users/cheryl/Documents/cheryl agent/nanao"
git push -u origin feat/theme-entry-gate
```
再由使用者決定是否要開 PR 合併回 `main`（合併後 GitHub Actions 會自動部署到正式網站，見 `.github/workflows/deploy.yml`）。

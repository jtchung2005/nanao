/*
 * graph.json 正規化轉接層（直接使用 Excel 原始分類與顏色）
 */

// 讀取/預設的節點色彩對應
const DEFAULT_NODE_COLORS = {
  人物: '#E63946',
  政府機關: '#FF8E8E',
  非營利組織: '#4CC9F0',
  私人企業: '#F4A261',
  大學: '#A8DABB',
  空間: '#2A9D8F',
  事件: '#E9C46A',
  物件: '#83C5BE',
  產業: '#A8DADC',
  '行動/活動': '#9D4EDD',
  族群: '#B5838D',
  健康議題: '#06D6A0',
  群體: '#C77DFF',
  在地學校: '#52B788',
  其他: '#888888',
};

// 讀取/預設的關係色彩對應
const DEFAULT_LINK_COLORS = {
  空間關係: '#E63946',
  人際關係: '#457B9D',
  政策推動: '#F4A261',
  產業關聯: '#E63946',
  '活動/行動 參與': '#F4A261',
  人地關係: '#F4A261',
  組織關聯: '#2A9D8F',
  事地關係: '#1D3557',
  物件關聯: '#A8DADC',
  社會關聯: '#B5838D',
  健康議題關係: '#06D6A0',
  其他: '#CCCCCC',
};

// 容錯解析年份函式（支援 number, string 以及多種欄位命名）
function parseYear(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseInt(val.trim(), 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

function computeYearRange(nodes) {
  let min = Infinity, max = -Infinity;
  for (const n of nodes) {
    for (const y of [n.year, n.start_year, n.end_year]) {
      if (typeof y === 'number' && Number.isFinite(y)) {
        if (y < min) min = y;
        if (y > max) max = y;
      }
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [1868, 2026];
  return [min, max];
}

export function normalizeGraph(raw) {
  if (!raw) return { nodes: [], links: [], meta_groups: [], meta_relations: [], stats: {} };

  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const rawLinks = Array.isArray(raw.links) ? raw.links : [];

  const nodeColors = { ...DEFAULT_NODE_COLORS, ...(raw.node_colors || {}) };
  const linkColors = { ...DEFAULT_LINK_COLORS, ...(raw.link_colors || {}) };

  // 1) 處理節點（加上年份多屬性解析與數值轉換）
  const nodes = rawNodes
    .filter((n) => n.group !== '自動增加')
    .map((n) => {
      const groupName = (n.group || '其他').trim();
      
      // 解析年份（同時支援 start_year, year, date, time）
      const parsedStartYear = parseYear(n.start_year ?? n.year ?? n.date ?? n.time);
      const parsedEndYear = parseYear(n.end_year);

      return {
        ...n,
        node_Group: groupName,
        meta_group: groupName,
        color: n.color || nodeColors[groupName] || '#888888',
        breakthrough_note: n.breakthrough_note || '',
        sources: n.sources || [],
        year: parsedStartYear,               // 💡 補上時間軸最常讀取的 year
        start_year: parsedStartYear,         // 💡 轉為安全的數字或 null
        end_year: parsedEndYear,
      };
    });

  const idSet = new Set(nodes.map((n) => n.id));

  // 2) 處理關係
  const links = rawLinks
    .filter((l) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return idSet.has(s) && idSet.has(t);
    })
    .map((l) => {
      const relationName = (l.relation || l.label || l.group || '其他').trim();
      return {
        ...l,
        label: relationName,
        meta_relation: relationName,
        color: l.color || linkColors[relationName] || '#CCCCCC',
        info: l.info || '',
        year: parseYear(l.year),             // 💡 關係年份同樣進行容錯解析
      };
    });

  // 3) 動態產生前端圖例（Legend）
  const groupCount = {};
  for (const n of nodes) groupCount[n.meta_group] = (groupCount[n.meta_group] || 0) + 1;
  const relCount = {};
  for (const l of links) relCount[l.meta_relation] = (relCount[l.meta_relation] || 0) + 1;

  const meta_groups = Object.keys(groupCount).map((grp) => ({
    id: grp,
    color: nodeColors[grp] || '#888888',
    count: groupCount[grp],
  }));

  const meta_relations = Object.keys(relCount).map((rel) => ({
    id: rel,
    color: linkColors[rel] || '#CCCCCC',
    count: relCount[rel],
  }));

  const stats = {
    nodes: nodes.length,
    links: links.length,
    breakthroughs: nodes.filter((n) => n.breakthrough_note).length,
    by_meta_group: groupCount,
    by_meta_relation: relCount,
    year_range: computeYearRange(nodes),
  };

  return {
    ...raw,
    nodes,
    links,
    meta_groups,
    meta_relations,
    node_groups: Object.keys(groupCount).sort(),
    stats,
  };
}

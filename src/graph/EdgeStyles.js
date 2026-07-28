/*
 * 依 meta_relation 取得邊的視覺樣式。
 * 全部將 dash 設為 null 以呈現實線。
 */

const STYLES = {
  spatial:     { color: '--rel-spatial',     width: 1.4, dash: null, arrow: false },
  social:      { color: '--rel-social',      width: 1.0, dash: null, arrow: false },
  causal:      { color: '--rel-causal',      width: 1.2, dash: null, arrow: true  },
  creative:    { color: '--rel-creative',    width: 1.0, dash: null, arrow: false },
  documentary: { color: '--rel-documentary', width: 0.8, dash: null, arrow: false },
  '其他':      { color: '--rel-其他',        width: 0.7, dash: null, arrow: false },
};

export function getEdgeStyle(metaRelation) {
  return STYLES[metaRelation] || STYLES['其他'];
}

// 取 CSS 變數的實際 hex 值，cache 一份
let _cssCache = null;
export function resolveColor(varName, alpha = 1) {
  if (!_cssCache) _cssCache = new Map();
  let hex = _cssCache.get(varName);
  if (!hex) {
    hex = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    _cssCache.set(varName, hex);
  }
  if (alpha === 1) return hex;
  // hex -> rgba
  const m = hex.match(/^#([0-9a-f]{6})$/i);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function clearColorCache() {
  _cssCache = null;
}

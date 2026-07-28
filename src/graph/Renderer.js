/*
 * Canvas 繪製器：節點（依 meta_group 用不同形狀）、邊（依 meta_relation 樣式）。
 * 全部用 device-pixel 繪製；座標已是 simulation 給的世界座標，由呼叫端套 transform。
 */
import { getEdgeStyle, resolveColor } from './EdgeStyles.js';

// ─── 節點半徑 ──────────────────────────────────
let _nodeSizeScale = 1;
export function setNodeSizeScale(s) { _nodeSizeScale = Math.max(0.3, Math.min(3, s || 1)); }
export function getNodeSizeScale() { return _nodeSizeScale; }

export function nodeRadius(node) {
  let base;
  if (node._degree != null) {
    base = 6 + Math.sqrt(node._degree) * 2.4;
  } else {
    const imp = node.importance ?? 3;
    base = 7 + imp * 1.6;
  }
  return base * _nodeSizeScale;
}

// ─── 節點形狀與顏色繪製 ─────────────────
export function drawNode(ctx, node, opts = {}) {
  const r = nodeRadius(node);
  const x = node.x, y = node.y;
  
  // 優先採用 node 本身指定的 color
  const color = node.color || resolveColor(`--cat-${node.meta_group}`) || '#888888';
  
  const isSelected = opts.selected;
  const isHover = opts.hover;
  const isDimmed = opts.dimmed;
  const hasBreakthrough = !!node.breakthrough_note;

  ctx.save();
  if (isDimmed) ctx.globalAlpha = 0.18;

  // 突破點光暈
  if (hasBreakthrough) {
    const grad = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.2);
    grad.addColorStop(0, resolveColor('--breakthrough', 0.5));
    grad.addColorStop(1, resolveColor('--breakthrough', 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // 主形狀
  ctx.fillStyle = color;
  ctx.strokeStyle = isSelected
    ? resolveColor('--breakthrough')
    : resolveColor('--ink-primary', 0.75);
  ctx.lineWidth = isSelected ? 2.5 : (isHover ? 1.8 : 1.0);

  drawShape(ctx, node.meta_group, x, y, r);
  ctx.fill();
  ctx.stroke();

  // 突破點 ★
  if (hasBreakthrough) {
    drawStar(ctx, x + r * 0.7, y - r * 0.7, 4, resolveColor('--breakthrough'));
  }

  ctx.restore();
}

function drawShape(ctx, metaGroup, x, y, r) {
  ctx.beginPath();
  switch (metaGroup) {
    case '人物':
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
    case '組織':
    case '政府機關':
    case '非營利組織':
    case '私人企業':
    case '大學':
    case '在地學校':
    case '群體':
      roundRect(ctx, x - r, y - r, r * 2, r * 2, 3);
      break;
    case '地景與聚落':
    case '空間':
      roundRect(ctx, x - r * 1.1, y - r * 0.8, r * 2.2, r * 1.6, 3);
      break;
    case '事件':
    case '健康議題':
      hexagon(ctx, x, y, r);
      break;
    case '物質文化':
    case '物件':
    case '產業':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r, y);
      ctx.lineTo(x, y + r);
      ctx.lineTo(x - r, y);
      ctx.closePath();
      break;
    default:
      ctx.arc(x, y, r, 0, Math.PI * 2);
      break;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexagon(ctx, x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = x + r * Math.cos(angle);
    const py = y + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStar(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
    const a2 = a1 + Math.PI / 5;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + (r * 0.4) * Math.cos(a2), y2 = cy + (r * 0.4) * Math.sin(a2);
    if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
    ctx.lineTo(x2, y2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ─── 邊（Edges）繪製 ─────────────────────────────
export function drawEdge(ctx, link, opts = {}) {
  const s = link.source, t = link.target;
  if (s.x == null || t.x == null) return;

  const style = getEdgeStyle(link.meta_relation);
  const isDimmed = opts.dimmed;
  const isHighlighted = opts.highlighted;

  // 優先採用 link 本身指定的 color
  const color = link.color || resolveColor(style.color) || '#9c9180';

  ctx.save();
  if (isDimmed) {
    ctx.globalAlpha = 0.08;
  } else if (isHighlighted) {
    ctx.globalAlpha = 1.0;
  } else {
    ctx.globalAlpha = 0.45;
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = isHighlighted ? style.width * 2.2 : style.width;

  if (style.dash) ctx.setLineDash(style.dash);

  const dx = t.x - s.x, dy = t.y - s.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;

  if (link._curveOffset && Math.abs(link._curveOffset) > 1) {
    const mx = (s.x + t.x) / 2, my = (s.y + t.y) / 2;
    const nx = -dy / dist, ny = dx / dist;
    const cx = mx + nx * link._curveOffset;
    const cy = my + ny * link._curveOffset;

    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.quadraticCurveTo(cx, cy, t.x, t.y);
    ctx.stroke();

    if (style.arrow) {
      drawArrowOnCurve(ctx, cx, cy, t.x, t.y, nodeRadius(t), color);
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();

    if (style.arrow) {
      drawArrowOnLine(ctx, s.x, s.y, t.x, t.y, nodeRadius(t), color);
    }
  }

  ctx.restore();
}

function drawArrowOnLine(ctx, x1, y1, x2, y2, targetR, color) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  const ax = x2 - ux * (targetR + 3);
  const ay = y2 - uy * (targetR + 3);

  const headLen = 7;
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.fillStyle = color;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(
    ax - headLen * Math.cos(angle - Math.PI / 6),
    ay - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    ax - headLen * Math.cos(angle + Math.PI / 6),
    ay - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawArrowOnCurve(ctx, cx, cy, x2, y2, targetR, color) {
  const dx = x2 - cx, dy = y2 - cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ux = dx / dist, uy = dy / dist;
  const ax = x2 - ux * (targetR + 3);
  const ay = y2 - uy * (targetR + 3);

  const headLen = 7;
  const angle = Math.atan2(dy, dx);

  ctx.save();
  ctx.fillStyle = color;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(
    ax - headLen * Math.cos(angle - Math.PI / 6),
    ay - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    ax - headLen * Math.cos(angle + Math.PI / 6),
    ay - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function assignCurveOffsets(links) {
  const pairCount = new Map();
  for (const l of links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    const key = s < t ? `${s}|${t}` : `${t}|${s}`;
    if (!pairCount.has(key)) pairCount.set(key, []);
    pairCount.get(key).push(l);
  }

  for (const group of pairCount.values()) {
    if (group.length <= 1) {
      group[0]._curveOffset = 0;
      continue;
    }
    const n = group.length;
    const step = 22;
    const start = -((n - 1) * step) / 2;
    group.forEach((link, idx) => {
      link._curveOffset = start + idx * step;
    });
  }
}

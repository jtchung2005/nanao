import { quadtree } from 'd3-quadtree';

export class GraphRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.options = options;
    this.transform = { x: 0, y: 0, k: 1 };
  }

  setTransform(transform) {
    this.transform = transform;
  }

  render(nodes, links, options = {}) {
    const { ctx, canvas, transform } = this;
    if (!ctx || !canvas) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 套用 Zoom/Pan 變換
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    const fontSize = options.fontSize || 12;
    const nodeScale = options.nodeScale || 1.0;

    // 1. 繪製邊 (Links)
    for (const link of links) {
      if (link.opacity === 0) continue;
      const source = typeof link.source === 'object' ? link.source : null;
      const target = typeof link.target === 'object' ? link.target : null;
      if (!source || !target) continue;

      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.globalAlpha = link.opacity ?? 0.6;
      ctx.strokeStyle = link.color || '#999';
      ctx.lineWidth = link.isConnected ? 2.5 : 1;
      ctx.stroke();
    }

    // 2. 繪製點 (Nodes)
    for (const node of nodes) {
      if (node.opacity === 0) continue;
      const r = (node.r || 6) * nodeScale;

      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.globalAlpha = node.opacity ?? 1;
      ctx.fillStyle = node.color || '#4A90E2';
      ctx.fill();

      // 選中或目標節點外框
      if (node.isTarget || node.isSelected) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#333';
        ctx.stroke();
      }

      // 標籤文字
      if (node.label && (transform.k > 0.8 || node.isTarget || node.isNeighbor)) {
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillStyle = '#222';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(node.label, node.x, node.y + r + 2);
      }
    }

    ctx.restore();
  }
}

import React, { useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import { GraphRenderer } from './Renderer';

export function ForceGraph({
  nodes = [],
  links = [],
  fontSize = 12,
  nodeScale = 1.0,
  charge = -360,
  spatialMode = false,
  selectedId = null,
  focusedId = null,
  onSelectNode,
  onClearFocus,
}) {
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);
  const transformRef = useRef(d3.zoomIdentity);

  // 1. 初始化與建立 GraphRenderer 實例（必須使用 new 關鍵字）
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // ✅ 使用 new 建立 Class 實例，防止 Class constructor 錯誤
    rendererRef.current = new GraphRenderer(canvasRef.current);

    const handleResize = () => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.parentElement.getBoundingClientRect();
      canvasRef.current.width = rect.width;
      canvasRef.current.height = rect.height;
      render();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 2. 渲染邏輯
  const render = useCallback(() => {
    if (!rendererRef.current) return;
    rendererRef.current.setTransform(transformRef.current);
    rendererRef.current.render(nodes, links, { fontSize, nodeScale });
  }, [nodes, links, fontSize, nodeScale]);

  // 3. 綁定 D3 Zoom / Pan 平移縮放
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;

    const zoom = d3.zoom()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => {
        transformRef.current = event.transform;
        render();
      });

    d3.select(canvas).call(zoom);
  }, [render]);

  // 4. 當資料或參數變動時重新繪製
  useEffect(() => {
    render();
  }, [render]);

  // 5. 點擊 Canvas 節點選取判斷
  const handleClick = (e) => {
    if (!canvasRef.current || !onSelectNode) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 將螢幕座標轉為圖譜 Canvas 內部變換後的座標
    const transform = transformRef.current;
    const graphX = (x - transform.x) / transform.k;
    const graphY = (y - transform.y) / transform.k;

    // 尋找被點擊的節點
    let clickedNode = null;
    for (const node of nodes) {
      if (node.x == null || node.y == null) continue;
      const r = (node.r || 6) * nodeScale;
      const dx = graphX - node.x;
      const dy = graphY - node.y;
      if (dx * dx + dy * dy <= r * r) {
        clickedNode = node;
        break;
      }
    }

    if (clickedNode) {
      onSelectNode(clickedNode.id);
    } else {
      onSelectNode(null);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: 'grab',
      }}
    />
  );
}

export default ForceGraph;

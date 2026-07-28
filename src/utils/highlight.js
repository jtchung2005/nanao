/**
 * 計算圖譜節點與連線的高亮與透明度
 * @param {Array} nodes - 所有節點
 * @param {Array} links - 所有連線
 * @param {string|number|null} selectedId - 當前點選的節點 ID
 */
export function highlightNodesAndLinks(nodes, links, selectedId) {
  if (!selectedId) {
    return {
      nodes: nodes.map((n) => ({ ...n, opacity: 1, isTarget: false, isNeighbor: false })),
      links: links.map((l) => ({ ...l, opacity: 0.6, isConnected: false })),
    };
  }

  // 1. 找出所有與目標節點相連的連線與鄰居節點 ID
  const neighborIds = new Set();
  const connectedLinkIndices = new Set();

  links.forEach((l, index) => {
    const sourceId = typeof l.source === 'object' ? l.source.id : l.source;
    const targetId = typeof l.target === 'object' ? l.target.id : l.target;

    if (sourceId === selectedId) {
      neighborIds.add(targetId);
      connectedLinkIndices.add(index);
    } else if (targetId === selectedId) {
      neighborIds.add(sourceId);
      connectedLinkIndices.add(index);
    }
  });

  // 2. 標記節點透明度與狀態
  const updatedNodes = nodes.map((n) => {
    const isTarget = n.id === selectedId;
    const isNeighbor = neighborIds.has(n.id);
    const opacity = isTarget || isNeighbor ? 1 : 0.15;

    return {
      ...n,
      opacity,
      isTarget,
      isNeighbor,
    };
  });

  // 3. 標記連線透明度與狀態
  const updatedLinks = links.map((l, index) => {
    const isConnected = connectedLinkIndices.has(index);
    const opacity = isConnected ? 0.9 : 0.05;

    return {
      ...l,
      opacity,
      isConnected,
    };
  });

  return { nodes: updatedNodes, links: updatedLinks };
}

// 同時提供預設匯出 (Default Export)，避免 Rollup/Vite 找不到匯出語法
export default highlightNodesAndLinks;

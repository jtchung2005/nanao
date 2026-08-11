import React from 'react';

/**
 * 右側節點詳情面板。
 * Props: node, onClose, onNodeClick(node), allLinks, allNodesById, width, maxHeight, top
 */
export default function InfoCard({
  node,
  onClose,
  onNodeClick,
  allLinks = [],
  allNodesById,
  width = 360,
  maxHeight = 'calc(100vh - 180px)',
  top = 80
}) {
  if (!node) return null;

  // 1. 取得節點類別名稱與顏色
  const nodeGroup = node.group || node.meta_group || node.node_Group || '其他';
  const nodeColor = node.color || (node.meta_group ? `var(--cat-${node.meta_group})` : '#888888');

  // 2. 搜尋相關節點，依 relation (或 meta_relation) 動態分組
  const related = React.useMemo(() => {
    if (!node || !allLinks) return {};
    const groups = {};

    for (const l of allLinks) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      let otherId = null;

      if (s === node.id) otherId = t;
      else if (t === node.id) otherId = s;
      else continue;

      // 支援 Map 或 一般物件 (Object)
      const otherNode = allNodesById instanceof Map
        ? allNodesById.get(otherId)
        : allNodesById?.[otherId];

      if (!otherNode) continue;

      const relKey = l.relation || l.meta_relation || l.label || '其他關係';
      if (!groups[relKey]) groups[relKey] = [];

      groups[relKey].push({
        node: otherNode,
        label: l.relation || l.label || '',
        info: l.info,
        relColor: l.color || '#CCCCCC'
      });
    }
    return groups;
  }, [node, allLinks, allNodesById]);

  return (
    <div
      className="paper-card slide-in-right"
      style={{
        position: 'absolute',
        top,
        right: 12,
        width,
        padding: 20,
        zIndex: 30,
        maxHeight,
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}
    >
      {/* 標題列與關閉按鈕 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div className="title-1" style={{ marginBottom: 6, fontWeight: 700, fontSize: 18 }}>
            {node.id}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className="chip" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span className="chip-dot" style={{ background: nodeColor, width: 8, height: 8, borderRadius: '50%' }} />
              {nodeGroup}
            </span>
          </div>
        </div>
        <button className="btn icon-only" onClick={onClose} aria-label="關閉" style={{ cursor: 'pointer' }}>
          ✕
        </button>
      </div>

      {/* 圖片預覽（若有來自 Supabase 的圖片） */}
      {node.Image && (
        <div style={{ marginTop: 12, borderRadius: 8, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
          <img
            src={node.Image}
            alt={node.id}
            style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        </div>
      )}

      {/* 年份與地址 */}
      {(node.start_year || node.end_year || node.address) && (
        <div className="caption num" style={{ marginTop: 12, color: 'var(--ink-secondary, #666)', fontSize: 13 }}>
          {(node.start_year || node.end_year) && (
            <div>
              📅 {node.start_year ?? '?'}{node.end_year && node.end_year !== node.start_year ? ` – ${node.end_year}` : ''}
            </div>
          )}
          {node.address && (
            <div style={{ marginTop: 2 }}>📍 {node.address}</div>
          )}
        </div>
      )}

      {/* 內文描述 */}
      {node.info && (
        <div
          className="body"
          style={{
            marginTop: 12,
            whiteSpace: 'pre-line',
            lineHeight: 1.5,
            fontSize: 14,
            color: 'var(--ink-primary, #333)'
          }}
        >
          {node.info}
        </div>
      )}

      {/* 突破點註記 */}
      {node.breakthrough_note && (
        <div className="breakthrough-frame" style={{ marginTop: 16, padding: 10, background: '#FFFBEB', borderRadius: 6, border: '1px solid #FCD34D' }}>
          <div className="caption breakthrough-star" style={{ marginBottom: 4, fontWeight: 600, color: '#D97706' }}>
            ★ 突破點
          </div>
          <div className="body" style={{ fontSize: 13 }}>{node.breakthrough_note}</div>
        </div>
      )}

      {/* 貢獻來源 */}
      {node.credits && (
        <div className="caption" style={{ marginTop: 12, fontSize: 12, color: '#888' }}>
          🏷️ 來源/提供者：{node.credits}
        </div>
      )}

      {/* 相關連結按鈕 */}
      {node.link && (
        <div style={{ marginTop: 12 }}>
          <a
            href={node.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: '#2563EB', textDecoration: 'underline' }}
          >
            🔗 外部相關連結
          </a>
        </div>
      )}

      {/* 相關節點分組 */}
      <div style={{ marginTop: 20 }}>
        {Object.entries(related).map(([relGroup, items]) => {
          if (!items.length) return null;
          const groupColor = items[0]?.relColor || '#6B7280';

          return (
            <div key={relGroup} style={{ marginBottom: 16 }}>
              <div
                className="caption"
                style={{
                  fontWeight: 600,
                  color: 'var(--ink-secondary, #4B5563)',
                  borderLeft: `3px solid ${groupColor}`,
                  paddingLeft: 8,
                  marginBottom: 6,
                  fontSize: 13
                }}
              >
                {relGroup}（{items.length}）
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {items.slice(0, 12).map((it, i) => (
                  <button
                    key={i}
                    className="btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'flex-start',
                      textAlign: 'left',
                      padding: '6px 10px',
                      fontSize: 13,
                      cursor: 'pointer',
                      width: '100%'
                    }}
                    onClick={() => onNodeClick?.(it.node)}
                    title={it.info || ''}
                  >
                    <span
                      className="chip-dot"
                      style={{
                        background: it.node.color || '#888888',
                        marginRight: 6,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        flexShrink: 0
                      }}
                    />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {it.node.id}
                    </span>
                    {it.label && (
                      <span className="tiny" style={{ marginLeft: 6, opacity: 0.7, fontSize: 11 }}>
                        {it.label}
                      </span>
                    )}
                  </button>
                ))}
                {items.length > 12 && (
                  <div className="tiny" style={{ paddingLeft: 10, fontSize: 11, color: '#888' }}>
                    ... 還有 {items.length - 12} 個
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

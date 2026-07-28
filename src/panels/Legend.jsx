import React from 'react';

/**
 * 節點分類圖例 (Legend)
 * 直接讀取 g.color，不再依賴固定 CSS 變數
 */
export default function Legend({
  metaGroups, activeGroups, onToggleGroup,
  onlyBreakthrough, onToggleBreakthrough, breakthroughCount,
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {metaGroups.map((g) => {
        const on = activeGroups.has(g.id);
        const circleColor = g.color || '#888888'; // 直接使用動態顏色
        return (
          <button
            key={g.id}
            className="btn"
            onClick={() => onToggleGroup(g.id)}
            style={{
              padding: '2px 8px', fontSize: 11,
              opacity: on ? 1 : 0.4,
            }}
            title={`${g.id}（${g.count}）`}
          >
            <span 
              className="chip-dot" 
              style={{ 
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                marginRight: 4,
                backgroundColor: circleColor 
              }} 
            />
            <span>{g.id}</span>
            <span className="tiny num" style={{ marginLeft: 2 }}>{g.count}</span>
          </button>
        );
      })}
      {breakthroughCount > 0 && (
        <button
          className={'btn' + (onlyBreakthrough ? ' active' : '')}
          onClick={onToggleBreakthrough}
          style={{ padding: '2px 8px', fontSize: 11, marginLeft: 4 }}
          title="只看突破點"
        >
          <span className="breakthrough-star">★</span>
          <span>只看突破</span>
          <span className="tiny num" style={{ marginLeft: 2 }}>{breakthroughCount}</span>
        </button>
      )}
    </div>
  );
}

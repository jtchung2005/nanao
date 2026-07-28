import React from 'react';

/**
 * 關係分類篩選器 (RelationFilter)
 * 直接顯示原始關係名稱與動態顏色 r.color
 */
export default function RelationFilter({ metaRelations, active, onToggle }) {
  return (
    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {metaRelations.map((r) => {
        const on = active.has(r.id);
        const lineColor = r.color || '#CCCCCC'; // 直接使用動態顏色
        return (
          <button
            key={r.id}
            className="btn"
            onClick={() => onToggle(r.id)}
            style={{
              padding: '2px 8px', fontSize: 11,
              opacity: on ? 1 : 0.4,
            }}
            title={`${r.id}（${r.count}）`}
          >
            <span
              style={{
                display: 'inline-block', 
                width: 14, 
                height: 3,
                borderRadius: 1,
                backgroundColor: lineColor, 
                marginRight: 4,
              }}
            />
            {r.id}
            <span className="tiny num" style={{ marginLeft: 2, opacity: 0.7 }}>{r.count}</span>
          </button>
        );
      })}
    </div>
  );
}

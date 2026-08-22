import React, { useState } from 'react';
import { RELATION_DESCRIPTIONS, RELATION_DESC_FALLBACK } from '../data/relationDescriptions.js';

/**
 * 左下角「連線代表的關係」說明圖例：純顯示，不能點選篩選。
 * 預設收合成一個小圖示，點開才會展開，避免長期佔用畫面空間。
 */
export default function RelationLegend({ metaRelations, bottomOffset = 150 }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        className="btn icon-only paper-card"
        style={{ position: 'absolute', bottom: bottomOffset, left: 12, zIndex: 26 }}
        onClick={() => setOpen(true)}
        title="展開連線關係說明"
      >
        🔗
      </button>
    );
  }

  return (
    <div
      className="paper-card"
      style={{
        position: 'absolute', bottom: bottomOffset, left: 12, zIndex: 26,
        width: 300, maxHeight: 340, overflowY: 'auto', padding: 14,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span className="caption" style={{ fontWeight: 700, fontSize: 16 }}>連線代表的關係</span>
        <button className="btn icon-only" onClick={() => setOpen(false)} title="收起">×</button>
      </div>
      {metaRelations.map((r) => (
        <div key={r.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
          <span
            style={{
              display: 'inline-block', width: 16, height: 4, borderRadius: 2,
              background: r.color || '#CCCCCC', marginTop: 8, flexShrink: 0,
            }}
          />
          <div>
            <div className="tiny" style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink-primary)' }}>
              {r.id}
              <span style={{ opacity: 0.6, marginLeft: 4, fontWeight: 400 }}>（{r.count}）</span>
            </div>
            <div className="tiny" style={{ color: 'var(--ink-secondary)', fontSize: 14 }}>
              {RELATION_DESCRIPTIONS[r.id] || RELATION_DESC_FALLBACK}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

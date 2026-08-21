import React, { useState } from 'react';

/**
 * 進站主題選擇蓋板：多選主題卡片，選好後進圖譜，或直接跳過看全部。
 * 每次重新整理網站都會出現（不用 localStorage 記憶）。
 */
export default function ThemeGate({ themes, themeCounts, onEnter, onSkip }) {
  const [selected, setSelected] = useState(new Set());

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div
      className="paper-bg fade-in"
      style={{
        position: 'fixed', inset: 0, zIndex: 'var(--z-modal)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflowY: 'auto',
      }}
    >
      <div className="title-1" style={{ marginBottom: 8, textAlign: 'center' }}>南澳知識圖譜</div>
      <div className="caption" style={{ marginBottom: 28, textAlign: 'center' }}>
        你想從哪裡開始探索？可以選一個或多個主題
      </div>

      <div
        style={{
          display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12,
          maxWidth: 680, marginBottom: 32,
        }}
      >
        {themes.map((t) => {
          const active = selected.has(t.id);
          return (
            <button
              key={t.id}
              className={`btn${active ? ' active' : ''}`}
              onClick={() => toggle(t.id)}
              style={{
                flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                padding: '14px 18px', width: 220, textAlign: 'left', cursor: 'pointer',
              }}
            >
              <span className="body" style={{ fontWeight: 700 }}>{t.id}</span>
              <span
                className="tiny"
                style={{ color: active ? 'inherit' : 'var(--ink-faint)' }}
              >
                {t.desc}・{themeCounts?.[t.id] ?? 0} 個節點
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        <button
          className="btn"
          style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)' }}
          onClick={onSkip}
        >
          跳過，看全部
        </button>
        <button
          className="btn active"
          disabled={selected.size === 0}
          style={{
            opacity: selected.size === 0 ? 0.4 : 1,
            cursor: selected.size === 0 ? 'not-allowed' : 'pointer',
          }}
          onClick={() => onEnter(Array.from(selected))}
        >
          進入圖譜 →
        </button>
      </div>
    </div>
  );
}

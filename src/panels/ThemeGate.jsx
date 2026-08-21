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
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
        padding: 24, overflowY: 'auto',
      }}
    >
      {/* justify-content: center 配 overflow: auto 在內容比視窗高時，開頭會被裁掉且滑不到——
          改成 flex-start + 這層 margin: auto 0 才能在內容矮於視窗時仍置中，內容過高時可以完整往上捲動 */}
      <div style={{ margin: 'auto 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div className="title-1" style={{ marginBottom: 8, textAlign: 'center', fontSize: 34 }}>南澳知識圖譜</div>
        <div className="caption" style={{ marginBottom: 28, textAlign: 'center', fontSize: 18 }}>
          你想從哪裡開始探索？可以選一個或多個主題
        </div>

        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14,
            width: '100%', maxWidth: 940, marginBottom: 32,
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
                  flexDirection: 'column', alignItems: 'flex-start', gap: 6,
                  padding: '18px 20px', textAlign: 'left', cursor: 'pointer',
                }}
              >
                <span
                  className="body"
                  style={{ fontWeight: 700, fontSize: 17, color: active ? 'var(--paper-bg)' : 'var(--ink-primary)' }}
                >
                  {t.id}
                </span>
                <span
                  className="tiny"
                  style={{ color: active ? 'var(--paper-bg)' : 'var(--ink-faint)', fontSize: 16 }}
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
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', fontSize: 18, padding: '10px 16px' }}
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
              fontSize: 18, padding: '10px 20px', fontWeight: 700,
            }}
            onClick={() => onEnter(Array.from(selected))}
          >
            進入圖譜 →
          </button>
        </div>
      </div>
    </div>
  );
}

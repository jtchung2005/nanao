import React from 'react';

/**
 * 進圖譜後的底部主題切換列：所有主題常駐顯示 + 「顯示全部」，目前選中的用深色反白標示。
 * 點主題 chip 是疊加式開關：可以同時選多個主題（聯集顯示），已選中的再點一次會取消、
 * 該主題的節點跟著從圖上消失；activeThemes 為 null 代表目前是「顯示全部」狀態。
 */
export default function ThemeNavBar({ ref, themes, activeThemes, onToggleTheme, onShowAll }) {
  const showingAll = activeThemes === null;

  // 主題 chip 選中時用該主題在圖譜上對應的顏色；「顯示全部」沒有單一主題色，選中時用中性深色
  const chipStyle = (active, activeColor) => {
    if (!active) {
      return { cursor: 'pointer', background: 'var(--paper-bg)', color: 'var(--ink-secondary)', borderColor: 'var(--paper-edge)' };
    }
    const bg = activeColor || 'var(--ink-primary)';
    return {
      cursor: 'pointer',
      background: bg,
      color: activeColor ? 'var(--ink-primary)' : 'var(--paper-bg)',
      borderColor: bg,
      fontWeight: 600,
    };
  };

  return (
    <div
      ref={ref}
      id="tour-theme-nav"
      className="paper-card"
      style={{
        position: 'absolute', bottom: 12, left: 12, right: 12,
        padding: '10px 16px', zIndex: 25,
        display: 'flex', flexDirection: 'column', gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span className="tiny" style={{ color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>切換主題</span>
        <button
          className="chip"
          style={chipStyle(showingAll)}
          onClick={onShowAll}
        >
          顯示全部
        </button>
        {themes.map((t) => (
          <button
            key={t.id}
            className="chip"
            style={chipStyle(!showingAll && activeThemes.has(t.id), t.color)}
            onClick={() => onToggleTheme(t.id)}
          >
            {t.id}
          </button>
        ))}
      </div>
      <div
        className="tiny"
        style={{
          borderTop: '1px solid var(--ink-line)', paddingTop: 4, textAlign: 'center',
          color: 'var(--ink-faint)', fontSize: 10, lineHeight: 1.5,
        }}
      >
        © 國立陽明交通大學跨領域設計科學研究中心 (TDIS) ・ 曾聖凱 助理教授・
        <a href="mailto:sky@arch.nycu.edu.tw" style={{ color: 'inherit', textDecoration: 'none' }}>
          sky@arch.nycu.edu.tw
        </a>
      </div>
    </div>
  );
}

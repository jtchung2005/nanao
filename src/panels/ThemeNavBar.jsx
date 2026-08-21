import React from 'react';

/**
 * 進圖譜後的底部主題切換列：顯示目前未選中的主題 + 「顯示全部」。
 * 點主題 chip 會切換（取代）成只看該主題；點「顯示全部」清空主題篩選看完整圖譜。
 */
export default function ThemeNavBar({ ref, themes, activeThemes, onSwitchTheme, onShowAll }) {
  const showingAll = activeThemes.size === 0;
  const inactiveThemes = themes.filter((t) => !activeThemes.has(t.id));

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
          style={{
            cursor: 'pointer',
            background: showingAll ? 'var(--ink-primary)' : 'var(--paper-bg)',
            color: showingAll ? 'var(--paper-bg)' : 'var(--ink-secondary)',
            borderColor: showingAll ? 'var(--ink-primary)' : 'var(--paper-edge)',
          }}
          onClick={onShowAll}
        >
          顯示全部
        </button>
        {inactiveThemes.map((t) => (
          <button
            key={t.id}
            className="chip"
            style={{ cursor: 'pointer' }}
            onClick={() => onSwitchTheme(t.id)}
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

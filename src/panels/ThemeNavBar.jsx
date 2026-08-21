import React, { useMemo } from 'react';

/**
 * 進圖譜後的底部主題切換列：所有主題常駐顯示 + 「顯示全部」，目前選中的用深色反白標示。
 * 點主題 chip 是疊加式開關：可以同時選多個主題（聯集顯示），已選中的再點一次會取消、
 * 該主題的節點跟著從圖上消失；activeThemes 為 null 代表目前是「顯示全部」狀態。
 */

const INK = '#2a2620';
const WHITE = '#ffffff';

function hexToRgb(hex) {
  const c = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(c.slice(i, i + 2), 16));
}

function relLuminance([r, g, b]) {
  const lin = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

function contrastRatio(hexA, hexB) {
  const [l1, l2] = [relLuminance(hexToRgb(hexA)), relLuminance(hexToRgb(hexB))].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

function darken(hex, factor) {
  const [r, g, b] = hexToRgb(hex).map((v) => Math.max(0, Math.min(255, Math.round(v * factor))));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// 主題色不一定跟深色或白色文字都能過 WCAG AA（4.5:1）——沒過的話，
// 一邊挑對比較好的文字色，一邊把底色漸漸調深，直到達標為止。
// 只在 chip 選中、需要反白呈現時才會用到，跟畫布上節點本身的顏色無關。
function accessibleActiveStyle(baseColor) {
  let bg = baseColor;
  for (let i = 0; i < 6; i++) {
    const cInk = contrastRatio(bg, INK);
    const cWhite = contrastRatio(bg, WHITE);
    if (Math.max(cInk, cWhite) >= 4.5) {
      return { bg, text: cInk >= cWhite ? INK : WHITE };
    }
    bg = darken(bg, 0.85);
  }
  return { bg, text: contrastRatio(bg, INK) >= contrastRatio(bg, WHITE) ? INK : WHITE };
}

export default function ThemeNavBar({ ref, themes, activeThemes, onToggleTheme, onShowAll }) {
  const showingAll = activeThemes === null;

  // themes 是靜態資料（來自 src/data/themes.js），顏色計算只需要做一次
  const activeStyles = useMemo(() => {
    const m = new Map();
    for (const t of themes) if (t.color) m.set(t.id, accessibleActiveStyle(t.color));
    return m;
  }, [themes]);

  // 主題 chip 選中時用該主題在圖譜上對應的顏色（已校正過對比）；
  // 「顯示全部」沒有單一主題色，選中時用中性深色
  const chipStyle = (active, themeId) => {
    if (!active) {
      return { cursor: 'pointer', background: 'var(--paper-bg)', color: 'var(--ink-secondary)', borderColor: 'var(--paper-edge)' };
    }
    const style = themeId ? activeStyles.get(themeId) : null;
    const bg = style?.bg || 'var(--ink-primary)';
    return {
      cursor: 'pointer',
      background: bg,
      color: style?.text || 'var(--paper-bg)',
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
            style={chipStyle(!showingAll && activeThemes.has(t.id), t.id)}
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

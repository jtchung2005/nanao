import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * 首次進入的聚光燈式導覽。
 * Props:
 *  - active: 是否顯示
 *  - steps: [{ target: 'dom-id', text, onEnter?, onLeave? }]
 *  - onFinish: 導覽結束（完成或跳過）時呼叫
 */
export default function OnboardingTour({ active, steps, onFinish }) {
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState(null);
  const [tipPos, setTipPos] = useState({ top: 80, left: 80 });
  const tipRef = useRef(null);

  useEffect(() => {
    if (active) setIdx(0);
  }, [active]);

  // 進入 / 離開某一步時的旁側效果（例如示範打開一張節點卡）
  useEffect(() => {
    if (!active) return undefined;
    const step = steps[idx];
    step.onEnter?.();
    return () => step.onLeave?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, idx]);

  // 持續追蹤目標元素位置（面板收合、視窗縮放都能跟上）
  useLayoutEffect(() => {
    if (!active) return undefined;
    // 換到新的一步時，目標元素有可能還沒掛到畫面上（例如資訊卡要等 state 更新才會出現）。
    // 這裡若不清空，聚光燈會停在上一步的舊位置，等目標終於出現才「跳」過去，
    // 看起來像是卡住又突然滑動。改成先清空，等新目標量到位置了再顯示。
    setRect(null);
    let raf;
    const tick = () => {
      const step = steps[idx];
      const el = document.getElementById(step.target);
      if (el) {
        const r = el.getBoundingClientRect();
        setRect(r);
        const tw = tipRef.current?.offsetWidth || 320;
        const th = tipRef.current?.offsetHeight || 150;
        let top = r.bottom + 16;
        if (top + th > window.innerHeight - 16) top = r.top - th - 16;
        top = Math.max(16, top);
        let left = r.left + r.width / 2 - tw / 2;
        left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));
        setTipPos({ top, left });
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [active, idx, steps]);

  if (!active) return null;
  const step = steps[idx];
  const pad = 10;
  const isLast = idx === steps.length - 1;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 'var(--z-modal)' }}>
      {rect && (
        <div
          style={{
            position: 'fixed',
            left: rect.left - pad,
            top: rect.top - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            borderRadius: 10,
            boxShadow: '0 0 0 9999px rgba(42, 38, 32, 0.58)',
            border: '1.5px solid var(--highlight)',
            transition: 'left .35s ease, top .35s ease, width .35s ease, height .35s ease',
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        ref={tipRef}
        className="paper-card"
        style={{
          position: 'fixed',
          top: tipPos.top,
          left: tipPos.left,
          width: 320,
          padding: '18px 22px',
          transition: 'left .35s ease, top .35s ease',
        }}
      >
        <div
          className="caption"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--highlight)', fontWeight: 700, letterSpacing: '.1em', marginBottom: 8 }}
        >
          {idx + 1} / {steps.length}
        </div>
        <div className="body" style={{ marginBottom: 18, fontSize: 15 }}>{step.text}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="btn"
            style={{ background: 'transparent', border: 'none', color: 'var(--ink-faint)', padding: '4px 2px' }}
            onClick={onFinish}
          >
            跳過
          </button>
          <button className="btn active" onClick={() => (isLast ? onFinish() : setIdx((i) => i + 1))}>
            {isLast ? '完成' : '下一步 →'}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useGraphData } from './state/useGraphData.js';
import { useUrlState, codecs } from './state/useUrlState.js';
import { ForceGraph } from './graph/ForceGraph.js';
import LabelLayer from './graph/LabelLayer.jsx';
import HoverTooltip from './graph/HoverTooltip.jsx';
import { computeNeighbors } from './utils/highlight.js';
import { setNodeSizeScale } from './graph/Renderer.js';
import { getNodeLonLat } from './graph/ForceGraph.js';
import InfoCard from './panels/InfoCard.jsx';
import Search from './panels/Search.jsx';
import Minimap from './panels/Minimap.jsx';
import RelationLegend from './panels/RelationLegend.jsx';
import GraphControl from './panels/GraphControl.jsx';
import OnboardingTour from './panels/OnboardingTour.jsx';
import ThemeGate from './panels/ThemeGate.jsx';
import ThemeNavBar from './panels/ThemeNavBar.jsx';
import { THEMES } from './data/themes.js';
import themeTags from './data/themeTags.json';

const URL_PARAMS = {
  node:   { default: '', ...codecs.string },
  mg:     { default: new Set(), ...codecs.setOfStrings },
  mr:     { default: new Set(), ...codecs.setOfStrings },
  bt:     { default: false, ...codecs.bool },
  od:     { default: false, ...codecs.bool },
  years:  { default: null, parse: codecs.intRange.parse, serialize: (v) => v ? codecs.intRange.serialize(v) : '' },
};

const BP_MOBILE = 768;
const DEFAULTS = { fontSize: 12, nodeScale: 1.0, charge: -360 };

export default function App() {
  const { data, loading, error } = useGraphData();
  const containerRef = useRef(null);
  const graphRef = useRef(null);
  const bottomRef = useRef(null);
  const ctrlRef = useRef(null);

  const [hover, setHover] = useState({ node: null, x: 0, y: 0 });
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [ctrlOpen, setCtrlOpen] = useState(window.innerWidth >= BP_MOBILE);
  const [bottomBarH, setBottomBarH] = useState(60);
  const [ctrlH, setCtrlH] = useState(40);

  const [fontSize, setFontSize] = useState(DEFAULTS.fontSize);
  const [nodeScale, setNodeScale] = useState(DEFAULTS.nodeScale);
  const [charge, setCharge] = useState(DEFAULTS.charge);
  const [spatialMode, setSpatialMode] = useState(true);

  const [urlState, setUrlState] = useUrlState(URL_PARAMS);
  const isMobile = vp.w < BP_MOBILE;

  // ── 主題選擇 ──────────────────────────────────────
  // activeThemes: null = 顯示全部；Set（可為空集合）= 只顯示疊加選中的主題
  const [themeGateOpen, setThemeGateOpen] = useState(true);
  const [activeThemes, setActiveThemes] = useState(null);

  const themeNodeSets = useMemo(() => {
    const m = new Map();
    for (const [themeId, ids] of Object.entries(themeTags)) m.set(themeId, new Set(ids));
    return m;
  }, []);

  const themeCounts = useMemo(() => {
    const c = {};
    for (const [themeId, set] of themeNodeSets) c[themeId] = set.size;
    return c;
  }, [themeNodeSets]);

  const handleGateEnter = (ids) => {
    setActiveThemes(new Set(ids));
    setThemeGateOpen(false);
  };
  const handleGateSkip = () => {
    setActiveThemes(null);
    setThemeGateOpen(false);
  };
  // 點主題 chip：疊加式開關——已選中的再點會取消，圖上該主題的節點跟著消失
  const handleToggleTheme = (id) => {
    setActiveThemes((prev) => {
      const next = new Set(prev ?? []);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const handleShowAll = () => setActiveThemes(null);

  // 分享連結（?node=xxx）進站時，跳過主題蓋板直接顯示完整圖譜，
  // 不然分享出去的連結會被蓋板擋住、對方還得先選主題才看得到指定節點。
  // 只在蓋板還開著的當下判斷一次——蓋板一旦被使用者手動關閉就不會再重新打開，
  // 之後 urlState.node 再變動（例如站內點擊節點）不會誤觸這裡。
  useEffect(() => {
    if (!data || !themeGateOpen) return;
    if (urlState.node) {
      setActiveThemes(null);
      setThemeGateOpen(false);
    }
  }, [data, themeGateOpen, urlState.node]);

  // 初始化 URL state
  useEffect(() => {
    if (!data) return;
    setUrlState((s) => {
      const next = { ...s };
      if (s.mg.size === 0) next.mg = new Set(data.meta_groups.filter((g) => g.count > 0).map((g) => g.id));
      if (s.mr.size === 0) next.mr = new Set(data.meta_relations.filter((r) => r.count > 0).map((r) => r.id));
      if (!s.years) next.years = data.stats.year_range.slice();
      return next;
    });
  }, [data, setUrlState]);

  // 視窗縮放
  useEffect(() => {
    const onResize = () => {
      setVp({ w: window.innerWidth, h: window.innerHeight });
      if (window.innerWidth < BP_MOBILE) {
        setCtrlOpen(false);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 量測底部主題列高度
  useEffect(() => {
    if (!bottomRef.current) return;
    const ro = new ResizeObserver((es) => setBottomBarH(es[0].contentRect.height));
    ro.observe(bottomRef.current);
    return () => ro.disconnect();
  }, [themeGateOpen]);

  useEffect(() => {
    if (!ctrlRef.current) { setCtrlH(40); return; }
    const ro = new ResizeObserver((es) => setCtrlH(es[0].contentRect.height));
    ro.observe(ctrlRef.current);
    return () => ro.disconnect();
  }, [ctrlOpen]);

  // 計算 lat/lon bounds（自動修正 swap）
  const spatialInfo = useMemo(() => {
    if (!data) return { bounds: null, count: 0 };
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    let count = 0;
    for (const n of data.nodes) {
      const ll = getNodeLonLat(n);
      if (!ll) continue;
      if (ll.lon < minLon) minLon = ll.lon;
      if (ll.lon > maxLon) maxLon = ll.lon;
      if (ll.lat < minLat) minLat = ll.lat;
      if (ll.lat > maxLat) maxLat = ll.lat;
      count++;
    }
    if (!count) return { bounds: null, count: 0 };
    const padLon = (maxLon - minLon) * 0.05 || 0.001;
    const padLat = (maxLat - minLat) * 0.05 || 0.001;
    return {
      bounds: {
        minLon: minLon - padLon, maxLon: maxLon + padLon,
        minLat: minLat - padLat, maxLat: maxLat + padLat,
      },
      count,
    };
  }, [data]);

  // 過濾（類別／關係／年份 —— UI 已拿掉，實際上永遠是全開，維持底層邏輯不變）
  const filtered = useMemo(() => {
    if (!data) return null;
    const ag = urlState.mg.size ? urlState.mg : new Set(data.meta_groups.map((g) => g.id));
    const ar = urlState.mr.size ? urlState.mr : new Set(data.meta_relations.map((r) => r.id));
    const [yMin, yMax] = urlState.years || data.stats.year_range;
    const nodes = data.nodes.filter((n) => {
      if (!ag.has(n.meta_group)) return false;
      if (urlState.bt && !n.breakthrough_note) return false;
      if (urlState.od && n.start_year == null && n.end_year == null) return false;
      if (n.start_year != null) {
        const ns = n.start_year;
        const ne = n.end_year ?? ns;
        if (ne < yMin || ns > yMax) return false;
      }
      return true;
    });
    const ids = new Set(nodes.map((n) => n.id));
    const links = data.links.filter((l) => {
      if (!ar.has(l.meta_relation)) return false;
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return ids.has(s) && ids.has(t);
    });
    return { nodes, links };
  }, [data, urlState.mg, urlState.mr, urlState.bt, urlState.od, urlState.years]);

  // 主題篩選層：疊加在 filtered 之上，真正餵給圖譜渲染的是這一層
  const themeFiltered = useMemo(() => {
    if (!filtered) return filtered;
    if (activeThemes === null) return filtered; // 顯示全部
    const allowIds = new Set();
    for (const themeId of activeThemes) {
      const set = themeNodeSets.get(themeId);
      if (set) for (const id of set) allowIds.add(id);
    }
    const nodes = filtered.nodes.filter((n) => allowIds.has(n.id));
    const ids = new Set(nodes.map((n) => n.id));
    const links = filtered.links.filter((l) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return ids.has(s) && ids.has(t);
    });
    return { nodes, links };
  }, [filtered, activeThemes, themeNodeSets]);

  useEffect(() => {
    if (!themeFiltered || !containerRef.current) return;
    if (!graphRef.current) {
      graphRef.current = new ForceGraph(containerRef.current);
      graphRef.current.on('click', (n) => setUrlState((s) => ({ ...s, node: n?.id ?? '' })));
      graphRef.current.on('hover', (n, e) => {
        if (n && e) setHover({ node: n, x: e.clientX, y: e.clientY });
        else setHover({ node: null, x: 0, y: 0 });
      });
      graphRef.current._spatialMode = spatialMode && spatialInfo.count > 0;
      graphRef.current._spatialBounds = spatialInfo.bounds;
    }
    graphRef.current.setData(themeFiltered.nodes, themeFiltered.links);
    // 剛因為「點到主題外的節點」而清空篩選，資料集這次才真正換成新的，
    // 這時候再補做 zoomToNode，才會抓得到節點（早一步呼叫會因為節點還不在
    // 圖上而被 ForceGraph 直接略過）。
    if (pendingZoomRef.current) {
      graphRef.current.zoomToNode(pendingZoomRef.current, 1.4);
      pendingZoomRef.current = null;
    }
  }, [themeFiltered, setUrlState, spatialMode, spatialInfo]);

  useEffect(() => () => {
    if (graphRef.current) {
      graphRef.current.destroy();
      graphRef.current = null;
    }
  }, []);

  // ── GraphControl 連動 ────────────────────────────
  useEffect(() => {
    setNodeSizeScale(nodeScale);
    if (graphRef.current) {
      graphRef.current.requestRedraw();
      graphRef.current.reapplyCollide();
    }
  }, [nodeScale]);

  useEffect(() => {
    if (graphRef.current) graphRef.current.setChargeStrength(charge);
  }, [charge]);

  // 同步 spatial 狀態到 ForceGraph
  useEffect(() => {
    if (!graphRef.current) return;
    graphRef.current.setSpatialMode(spatialMode && spatialInfo.count > 0, spatialInfo.bounds);
  }, [spatialMode, spatialInfo]);

  const allNodesById = useMemo(() => {
    if (!data) return new Map();
    return new Map(data.nodes.map((n) => [n.id, n]));
  }, [data]);

  const selected = urlState.node ? allNodesById.get(urlState.node) : null;

  useEffect(() => {
    const g = graphRef.current;
    if (!g) return;
    g.setSelected(selected?.id ?? null);
    if (selected) {
      const r = computeNeighbors(selected.id, g.links);
      g.setHighlight(r?.nodeIds, r?.linkKeys);
    } else {
      g.setHighlight(null, null);
    }
  }, [selected]);

  const highlightIds = useMemo(() => {
    if (selected && graphRef.current) {
      const r = computeNeighbors(selected.id, graphRef.current.links);
      return r?.nodeIds ?? new Set([selected.id]);
    }
    return null;
  }, [selected, themeFiltered]);

  const reset = () => {
    if (!data) return;
    setUrlState({
      node: '',
      mg: new Set(data.meta_groups.filter((g) => g.count > 0).map((g) => g.id)),
      mr: new Set(data.meta_relations.filter((r) => r.count > 0).map((r) => r.id)),
      bt: false,
      od: false,
      years: data.stats.year_range.slice(),
    });
    setActiveThemes(null);
    if (graphRef.current) graphRef.current.setHighlight(null, null);
  };

  const resetGraphControl = () => {
    setFontSize(DEFAULTS.fontSize);
    setNodeScale(DEFAULTS.nodeScale);
    setCharge(DEFAULTS.charge);
  };

  // Search / InfoCard 的「網絡連結」清單是用未篩選的全量資料算出來的，
  // 點到的節點有可能不在目前主題篩選範圍內。這種情況下先清空主題篩選（顯示全部），
  // 否則點擊會像沒反應一樣（zoomToNode 找不到節點會直接略過）。
  const pendingZoomRef = useRef(null);
  const handleNodeClick = (node) => {
    const isVisible = themeFiltered?.nodes.some((n) => n.id === node.id);
    if (!isVisible && activeThemes !== null) {
      pendingZoomRef.current = node.id;
      setActiveThemes(null);
    } else {
      graphRef.current?.zoomToNode(node.id, 1.4);
    }
    setUrlState((s) => ({ ...s, node: node.id }));
  };

  const onClose = () => setUrlState((s) => ({ ...s, node: '' }));

  // ── 首次進入導覽（選完主題、進圖譜後才會跑）────────
  const [tourActive, setTourActive] = useState(false);
  useEffect(() => {
    if (!data || loading || themeGateOpen) return undefined;
    if (localStorage.getItem('nanao_tour_seen')) return undefined;
    const t = setTimeout(() => setTourActive(true), 900);
    return () => clearTimeout(t);
  }, [data, loading, themeGateOpen]);

  const finishTour = () => {
    setTourActive(false);
    localStorage.setItem('nanao_tour_seen', '1');
  };

  // 挑一個連結數最多、且有介紹文字的節點，導覽時示範資訊卡長怎樣
  const demoNodeId = useMemo(() => {
    if (!data) return null;
    const degree = {};
    for (const l of data.links) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degree[s] = (degree[s] || 0) + 1;
      degree[t] = (degree[t] || 0) + 1;
    }
    let best = null, bestScore = -Infinity;
    for (const n of data.nodes) {
      const d = degree[n.id] || 0;
      if (!n.info || d < 2) continue;
      const score = -Math.abs(d - 5);
      if (score > bestScore) { bestScore = score; best = n.id; }
    }
    return best;
  }, [data]);

  const tourSteps = useMemo(() => ([
    { target: 'tour-search', text: '輸入關鍵字，可以快速找到任何人物、地點或事件節點。' },
    { target: 'tour-canvas', text: '在圖上點擊任一個圓點節點，可以看到它的詳細介紹。' },
    {
      target: 'tour-infocard',
      text: '節點的完整介紹會顯示在這裡，包含年份、地點與說明文字。',
      onEnter: () => { if (demoNodeId) setUrlState((s) => ({ ...s, node: demoNodeId })); },
    },
    {
      target: 'tour-infocard-related',
      text: '往下捲動還會看到「網絡連結」——這個節點跟哪些人、事、地有關係，點擊任一個連結就能跳過去，一路順著關係鏈往下探索整個南澳知識網絡。',
      onEnter: () => { document.getElementById('tour-infocard-related')?.scrollIntoView({ block: 'nearest' }); },
      onLeave: () => { setUrlState((s) => (s.node === demoNodeId ? { ...s, node: '' } : s)); },
    },
    { target: 'tour-theme-nav', text: '畫面下方可以隨時切換想看的主題，或按「顯示全部」看完整圖譜。' },
  ]), [demoNodeId, setUrlState]);

  // ── Layout ──────────────────────────────────────
  const sidePanelBottom = bottomBarH + 24;
  const minimapBottom = bottomBarH + 16;
  const ctrlTop = 80;
  const infoCardTop = ctrlTop + (ctrlOpen ? ctrlH : 40) + 8;
  const infoCardWidth = isMobile ? 'calc(100vw - 24px)' : 360;

  return (
    <div className="paper-bg fixed inset-0">
      <div id="tour-canvas" ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      <LabelLayer
        graph={graphRef.current}
        width={vp.w}
        height={vp.h}
        highlightIds={highlightIds}
        fontSize={fontSize}
      />

      <HoverTooltip node={hover.node} x={hover.x} y={hover.y} />

      {/* 主題全部取消選取時，畫布不會是自動顯示全部，而是真的沒有節點——
          這裡明講一下，不然看起來會像網站壞了 */}
      {data && !themeGateOpen && activeThemes !== null && activeThemes.size === 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center fade-in"
          style={{ zIndex: 5, pointerEvents: 'none' }}
        >
          <div className="paper-card caption" style={{ padding: '12px 20px', textAlign: 'center' }}>
            目前沒有選擇任何主題<br />點下方主題，或按「顯示全部」看完整圖譜
          </div>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 flex items-center justify-center fade-in" style={{ zIndex: 100 }}>
          <div className="caption">載入南澳資料中...</div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 100 }}>
          <div className="paper-card body" style={{ padding: 24, color: 'var(--cat-事件)' }}>
            錯誤：{error.message}
          </div>
        </div>
      )}

      {/* Top bar */}
      {data && (
        <div
          className="paper-card"
          style={{
            position: 'absolute', top: 12, left: 12, right: 12, height: 56,
            display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
            zIndex: 30,
          }}
        >
          <div className="title-2" style={{ whiteSpace: 'nowrap' }}>南澳知識圖譜</div>
          {!isMobile && (
            <div className="caption" style={{ borderRight: '1px solid var(--ink-line)', paddingRight: 12, whiteSpace: 'nowrap' }}>
              — Klesan 群人文地景數位典藏
            </div>
          )}
          <Search nodes={data.nodes} links={data.links} onSelectNode={handleNodeClick} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
            {!isMobile && (
              <span className="tiny" style={{ whiteSpace: 'nowrap' }}>
                節點 {themeFiltered?.nodes.length ?? 0}/{data.stats.nodes} ・
                關係 {themeFiltered?.links.length ?? 0}/{data.stats.links}
              </span>
            )}
            <button className="btn" onClick={() => graphRef.current?.zoomToFit()} title="全覽">⛶</button>
            <button className="btn" onClick={reset} title="重置篩選">↺</button>
            <button className="btn" onClick={() => setTourActive(true)} title="使用說明">？</button>
          </div>
        </div>
      )}

      {/* Right: GraphControl */}
      {data && (
        <div
          ref={ctrlRef}
          style={{
            position: 'absolute', top: ctrlTop, right: 12, zIndex: 25,
            width: ctrlOpen ? (isMobile ? 'calc(100vw - 24px)' : 240) : 'auto',
          }}
        >
          <GraphControl
            open={ctrlOpen}
            onToggleOpen={() => setCtrlOpen((v) => !v)}
            fontSize={fontSize} onFontSize={setFontSize}
            nodeScale={nodeScale} onNodeScale={setNodeScale}
            charge={charge} onCharge={setCharge}
            spatialMode={spatialMode} onSpatialMode={setSpatialMode}
            geoCount={spatialInfo.count}
            onReset={resetGraphControl}
          />
        </div>
      )}

      {/* Minimap */}
      {data && !isMobile && <Minimap graph={graphRef.current} bottomOffset={minimapBottom} />}

      {/* 左下角：連線代表的關係說明 */}
      {data && !themeGateOpen && (
        <RelationLegend
          metaRelations={data.meta_relations.filter((r) => r.count > 0)}
          bottomOffset={minimapBottom}
        />
      )}

      {/* InfoCard */}
      {selected && (
        <InfoCard
          node={selected}
          onClose={onClose}
          onNodeClick={handleNodeClick}
          allLinks={data?.links ?? []}
          allNodesById={allNodesById}
          width={infoCardWidth}
          top={infoCardTop}
          maxHeight={`calc(100vh - ${infoCardTop}px - ${sidePanelBottom}px)`}
        />
      )}

      {/* 底部主題切換列 */}
      {data && !themeGateOpen && (
        <ThemeNavBar
          ref={bottomRef}
          themes={THEMES}
          activeThemes={activeThemes}
          onToggleTheme={handleToggleTheme}
          onShowAll={handleShowAll}
        />
      )}

      <OnboardingTour active={tourActive} steps={tourSteps} onFinish={finishTour} />

      {/* 進站主題選擇蓋板 */}
      {data && themeGateOpen && (
        <ThemeGate
          themes={THEMES}
          themeCounts={themeCounts}
          onEnter={handleGateEnter}
          onSkip={handleGateSkip}
        />
      )}
    </div>
  );
}

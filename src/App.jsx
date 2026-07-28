import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';

// ⚠️ 必須匯入樣式檔，否則 CSS 變數與底層樣式無法作用導致白屏！
import './index.css';
import './styles/tokens.css';
import './styles/paper.css';

import { useGraphData } from './state/useGraphData';
import { useUrlState } from './state/useUrlState';
import { ForceGraph } from './graph/ForceGraph';
import GroupSidebar from './panels/GroupSidebar';
import RelationFilter from './panels/RelationFilter';
import TimelineSlider from './panels/TimelineSlider';
import Search from './panels/Search';
import InfoCard from './panels/InfoCard';
import Minimap from './panels/Minimap';
import GraphControl from './panels/GraphControl';
import Legend from './panels/Legend';
import { highlightNodesAndLinks } from './utils/highlight';

const DEFAULTS = { fontSize: 12, nodeScale: 1.0, charge: -360, minDegree: 0 };

export default function App() {
  const { data, loading, error } = useGraphData();
  const [urlState, setUrlState] = useUrlState(data);

  // ... (其餘 App.jsx 保持不變)

  // 控制面板滑軌狀態
  const [fontSize, setFontSize] = useState(DEFAULTS.fontSize);
  const [nodeScale, setNodeScale] = useState(DEFAULTS.nodeScale);
  const [charge, setCharge] = useState(DEFAULTS.charge);
  const [minDegree, setMinDegree] = useState(DEFAULTS.minDegree);
  const [spatialMode, setSpatialMode] = useState(true);

  // 面板展開 / 收折
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [filterOpen, setFilterOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(true);
  const [ctrlOpen, setCtrlOpen] = useState(false);

  // 選取的節點 ID
  const [selectedId, setSelectedId] = useState(null);

  // 搜尋聚焦：當從搜尋列選取時，傳給 ForceGraph 發動平移/縮放
  const [focusedId, setFocusedId] = useState(null);

  // RWD 視窗寬度檢測
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 靜態過濾邏輯（包含 MetaGroup, MetaRelation, 年份, Breakthrough, On-Demand 與最小連線數 MinDegree）
  const filtered = useMemo(() => {
    if (!data) return null;
    const ag = urlState.mg.size ? urlState.mg : new Set(data.meta_groups.map((g) => g.id));
    const ar = urlState.mr.size ? urlState.mr : new Set(data.meta_relations.map((r) => r.id));
    const [yMin, yMax] = urlState.years || data.stats.year_range;

    // 1. 根據目前啟用的 MetaRelation 先計算各節點的預估連線數量 (Degree)
    const degreeMap = new Map();
    for (const l of data.links) {
      if (!ar.has(l.meta_relation)) continue;
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degreeMap.set(s, (degreeMap.get(s) || 0) + 1);
      degreeMap.set(t, (degreeMap.get(t) || 0) + 1);
    }

    // 2. 篩選符合條件的節點
    const nodes = data.nodes.filter((n) => {
      if (!ag.has(n.meta_group)) return false;
      if (urlState.bt && !n.breakthrough_note) return false;
      if (urlState.od && n.start_year == null && n.end_year == null) return false;
      if (n.start_year != null) {
        const ns = n.start_year;
        const ne = n.end_year ?? ns;
        if (ne < yMin || ns > yMax) return false;
      }

      // 節點連線數門檻篩選
      const deg = degreeMap.get(n.id) || 0;
      if (deg < minDegree) return false;

      return true;
    });

    // 3. 根據通過條件的節點建立 ID 集合並過濾關係邊
    const ids = new Set(nodes.map((n) => n.id));
    const links = data.links.filter((l) => {
      if (!ar.has(l.meta_relation)) return false;
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return ids.has(s) && ids.has(t);
    });

    return { nodes, links };
  }, [data, urlState.mg, urlState.mr, urlState.bt, urlState.od, urlState.years, minDegree]);

  // 動態高亮計算
  const displayGraph = useMemo(() => {
    if (!filtered) return { nodes: [], links: [] };
    if (!selectedId) {
      return {
        nodes: filtered.nodes.map((n) => ({ ...n, opacity: 1, isTarget: false, isNeighbor: false })),
        links: filtered.links.map((l) => ({ ...l, opacity: 0.6, isConnected: false })),
      };
    }
    return highlightNodesAndLinks(filtered.nodes, filtered.links, selectedId);
  }, [filtered, selectedId]);

  // 選取的節點物件
  const selectedNode = useMemo(() => {
    if (!selectedId || !data) return null;
    return data.nodes.find((n) => n.id === selectedId) || null;
  }, [selectedId, data]);

  // 計算擁有地理座標的節點數量
  const spatialInfo = useMemo(() => {
    if (!data) return { count: 0, total: 0 };
    let count = 0;
    for (const n of data.nodes) {
      if (n.lat != null && n.lng != null && !isNaN(n.lat) && !isNaN(n.lng)) count++;
    }
    return { count, total: data.nodes.length };
  }, [data]);

  // 左側群組面板與搜尋列定位
  const groupSidebarRef = useRef(null);
  const [searchTop, setSearchTop] = useState(70);

  useEffect(() => {
    if (!groupSidebarRef.current) return;
    const observer = new ResizeObserver(() => {
      if (groupSidebarRef.current) {
        setSearchTop(groupSidebarRef.current.offsetHeight + 18);
      }
    });
    observer.observe(groupSidebarRef.current);
    return () => observer.disconnect();
  }, [sidebarOpen]);

  // 右側關係面板與控制按鈕定位
  const filterRef = useRef(null);
  const ctrlRef = useRef(null);
  const [ctrlTop, setCtrlTop] = useState(70);

  useEffect(() => {
    if (!filterRef.current) return;
    const observer = new ResizeObserver(() => {
      if (filterRef.current) {
        setCtrlTop(filterRef.current.offsetHeight + 18);
      }
    });
    observer.observe(filterRef.current);
    return () => observer.disconnect();
  }, [filterOpen]);

  // 圖譜控制重置
  const resetGraphControl = () => {
    setFontSize(DEFAULTS.fontSize);
    setNodeScale(DEFAULTS.nodeScale);
    setCharge(DEFAULTS.charge);
    setMinDegree(DEFAULTS.minDegree);
  };

  // 事件處理器
  const handleToggleGroup = useCallback((id) => setUrlState((s) => ({ ...s, mg: toggleSet(s.mg, id) })), [setUrlState]);
  const handleToggleRelation = useCallback((id) => setUrlState((s) => ({ ...s, mr: toggleSet(s.mr, id) })), [setUrlState]);
  const handleToggleAllGroups = useCallback((enableAll) => setUrlState((s) => ({ ...s, mg: enableAll ? new Set() : new Set(['__NONE__']) })), [setUrlState]);
  const handleToggleAllRelations = useCallback((enableAll) => setUrlState((s) => ({ ...s, mr: enableAll ? new Set() : new Set(['__NONE__']) })), [setUrlState]);

  const handleSelectNode = useCallback((id) => {
    setSelectedId(id);
    if (id) setFocusedId(id);
  }, []);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-bg)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, marginBottom: 8, color: 'var(--ink-secondary)' }}>⌛</div>
          <div className="subhead" style={{ color: 'var(--ink-secondary)' }}>載入南澳知識圖譜中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-bg)' }}>
        <div className="paper-card" style={{ padding: 24, maxWidth: 400, textAlign: 'center' }}>
          <div style={{ fontSize: 28, color: 'var(--breakthrough)', marginBottom: 8 }}>⚠</div>
          <div className="subhead" style={{ marginBottom: 8 }}>資料載入失敗</div>
          <div className="body-text" style={{ color: 'var(--ink-secondary)' }}>{error}</div>
        </div>
      </div>
    );
  }

  const [yMin, yMax] = urlState.years || data.stats.year_range;

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden', background: 'var(--paper-bg)' }}>
      {/* 標題列 */}
      <header
        className="paper-card"
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 30,
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 12,
          borderRadius: 8,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, letterSpacing: '0.02em' }}>南澳知識圖譜</h1>
        <span className="caption" style={{ color: 'var(--ink-faint)' }}>
          {filtered?.nodes.length ?? 0} / {data.stats.total_nodes} 點 · {filtered?.links.length ?? 0} / {data.stats.total_links} 邊
        </span>
      </header>

      {/* ForceGraph 畫布 */}
      <ForceGraph
        nodes={displayGraph.nodes}
        links={displayGraph.links}
        metaGroups={data.meta_groups}
        fontSize={fontSize}
        nodeScale={nodeScale}
        charge={charge}
        spatialMode={spatialMode}
        selectedId={selectedId}
        focusedId={focusedId}
        onSelectNode={handleSelectNode}
        onClearFocus={() => setFocusedId(null)}
      />

      {/* 左上: GroupSidebar */}
      <div
        ref={groupSidebarRef}
        style={{
          position: 'absolute', top: 60, left: 12, zIndex: 20,
          maxWidth: isMobile ? 'calc(100vw - 24px)' : 280,
        }}
      >
        <GroupSidebar
          metaGroups={data.meta_groups}
          activeGroupIds={urlState.mg}
          onToggleGroup={handleToggleGroup}
          onToggleAll={handleToggleAllGroups}
          open={sidebarOpen}
          onToggleOpen={() => setSidebarOpen((v) => !v)}
        />
      </div>

      {/* 左側: Search (放置於 GroupSidebar 下方) */}
      <div
        style={{
          position: 'absolute', top: searchTop, left: 12, zIndex: 20,
          width: isMobile ? 'calc(100vw - 24px)' : 280,
        }}
      >
        <Search
          nodes={filtered?.nodes || []}
          onSelect={handleSelectNode}
          selectedId={selectedId}
        />
      </div>

      {/* 右上: RelationFilter */}
      <div
        ref={filterRef}
        style={{
          position: 'absolute', top: 12, right: 12, zIndex: 20,
          maxWidth: isMobile ? 'calc(100vw - 24px)' : 280,
        }}
      >
        <RelationFilter
          metaRelations={data.meta_relations}
          activeRelationIds={urlState.mr}
          onToggleRelation={handleToggleRelation}
          onToggleAll={handleToggleAllRelations}
          breakthroughOnly={urlState.bt}
          onToggleBreakthrough={() => setUrlState((s) => ({ ...s, bt: !s.bt }))}
          onDemandOnly={urlState.od}
          onToggleOnDemand={() => setUrlState((s) => ({ ...s, od: !s.od }))}
          open={filterOpen}
          onToggleOpen={() => setFilterOpen((v) => !v)}
        />
      </div>

      {/* 右側: GraphControl (放置於 RelationFilter 下方) */}
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
          minDegree={minDegree} onMinDegree={setMinDegree}
          spatialMode={spatialMode} onSpatialMode={setSpatialMode}
          geoCount={spatialInfo.count}
          onReset={resetGraphControl}
        />
      </div>

      {/* 左下: Legend */}
      <div style={{ position: 'absolute', bottom: timelineOpen ? 80 : 20, left: 12, zIndex: 20 }}>
        <Legend metaGroups={data.meta_groups} />
      </div>

      {/* 右下: InfoCard */}
      {selectedNode && (
        <div
          style={{
            position: 'absolute', bottom: timelineOpen ? 80 : 20, right: 12, zIndex: 30,
            maxWidth: isMobile ? 'calc(100vw - 24px)' : 320,
          }}
        >
          <InfoCard
            node={selectedNode}
            links={data.links}
            allNodes={data.nodes}
            metaGroups={data.meta_groups}
            metaRelations={data.meta_relations}
            onClose={() => setSelectedId(null)}
            onSelectNode={handleSelectNode}
          />
        </div>
      )}

      {/* 底部中間: TimelineSlider */}
      <div
        style={{
          position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
          width: isMobile ? 'calc(100vw - 24px)' : Math.min(600, window.innerWidth - 300),
        }}
      >
        <TimelineSlider
          yearRange={data.stats.year_range}
          value={[yMin, yMax]}
          onChange={(val) => setUrlState((s) => ({ ...s, years: val }))}
          open={timelineOpen}
          onToggleOpen={() => setTimelineOpen((v) => !v)}
        />
      </div>

      {/* 右下角輔助: Minimap */}
      <div style={{ position: 'absolute', bottom: 80, right: selectedNode ? (isMobile ? 12 : 344) : 12, zIndex: 15 }}>
        <Minimap nodes={filtered?.nodes || []} />
      </div>
    </div>
  );
}

function toggleSet(setObj, value) {
  const next = new Set(setObj);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

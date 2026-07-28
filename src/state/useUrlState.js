import { useState, useEffect, useCallback } from 'react';

export function useUrlState(data) {
  // 安全地解析 URL 參數
  const getUrlParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    let mg = new Set();
    let mr = new Set();
    let bt = false;
    let od = false;
    let years = null;

    try {
      if (params.has('mg')) {
        let raw = params.get('mg');
        // 多重解碼以應付二次/三次編碼網址
        try { raw = decodeURIComponent(raw); } catch (e) {}
        try { raw = decodeURIComponent(raw); } catch (e) {}
        const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
        if (items.length > 0) mg = new Set(items);
      }

      if (params.has('mr')) {
        let raw = params.get('mr');
        try { raw = decodeURIComponent(raw); } catch (e) {}
        try { raw = decodeURIComponent(raw); } catch (e) {}
        const items = raw.split(',').map((s) => s.trim()).filter(Boolean);
        if (items.length > 0) mr = new Set(items);
      }

      if (params.has('bt')) bt = params.get('bt') === 'true';
      if (params.has('od')) od = params.get('od') === 'true';

      if (params.has('years')) {
        const y = params.get('years').split('-').map(Number);
        if (y.length === 2 && !isNaN(y[0]) && !isNaN(y[1])) {
          years = y;
        }
      }
    } catch (err) {
      console.warn('Failed to parse URL params, using fallbacks:', err);
    }

    return { mg, mr, bt, od, years };
  }, []);

  const [state, setState] = useState(getUrlParams);

  // 當內部狀態改變時同步至 URL
  const updateUrlState = useCallback((updater) => {
    setState((prevState) => {
      const nextState = typeof updater === 'function' ? updater(prevState) : updater;

      try {
        const params = new URLSearchParams();
        if (nextState.mg && nextState.mg.size > 0 && !nextState.mg.has('__NONE__')) {
          params.set('mg', Array.from(nextState.mg).join(','));
        }
        if (nextState.mr && nextState.mr.size > 0 && !nextState.mr.has('__NONE__')) {
          params.set('mr', Array.from(nextState.mr).join(','));
        }
        if (nextState.bt) params.set('bt', 'true');
        if (nextState.od) params.set('od', 'true');
        if (nextState.years) params.set('years', nextState.years.join('-'));

        const searchStr = params.toString();
        const newUrl = searchStr
          ? `${window.location.pathname}?${searchStr}`
          : window.location.pathname;

        window.history.replaceState({}, '', newUrl);
      } catch (err) {
        console.error('Failed to update URL history:', err);
      }

      return nextState;
    });
  }, []);

  return [state, updateUrlState];
}

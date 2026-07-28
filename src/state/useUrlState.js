import { useState, useEffect, useCallback } from 'react';

export function useUrlState(data) {
  // 1. 初始化解析 URL 參數（加入 try...catch 保護）
  const getUrlParams = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    let mg = new Set();
    let mr = new Set();
    let bt = false;
    let od = false;
    let years = null;

    try {
      if (params.has('mg')) {
        const rawMg = params.get('mg');
        // 解碼處理，避免 double encoding 錯誤
        const decodedMg = decodeURIComponent(rawMg);
        mg = new Set(decodedMg.split(',').filter(Boolean));
      }
      if (params.has('mr')) {
        const rawMr = params.get('mr');
        const decodedMr = decodeURIComponent(rawMr);
        mr = new Set(decodedMr.split(',').filter(Boolean));
      }
      if (params.has('bt')) bt = params.get('bt') === 'true';
      if (params.has('od')) od = params.get('od') === 'true';
      if (params.has('years')) {
        const y = params.get('years').split('-').map(Number);
        if (y.length === 2 && !isNaN(y[0]) && !isNaN(y[1])) {
          years = y;
        }
      }
    } catch (e) {
      console.warn('URL state parsing error, falling back to defaults:', e);
    }

    return { mg, mr, bt, od, years };
  }, []);

  const [state, setState] = useState(getUrlParams);

  // 當內部狀態改變時，更新 URL 參數
  const updateUrlState = useCallback((updater) => {
    setState((prevState) => {
      const nextState = typeof updater === 'function' ? updater(prevState) : updater;
      
      try {
        const params = new URLSearchParams();
        if (nextState.mg && nextState.mg.size > 0) {
          params.set('mg', Array.from(nextState.mg).join(','));
        }
        if (nextState.mr && nextState.mr.size > 0) {
          params.set('mr', Array.from(nextState.mr).join(','));
        }
        if (nextState.bt) params.set('bt', 'true');
        if (nextState.od) params.set('od', 'true');
        if (nextState.years) params.set('years', nextState.years.join('-'));

        const newSearch = params.toString();
        const newUrl = newSearch ? `${window.location.pathname}?${newSearch}` : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      } catch (e) {
        console.error('Failed to update URL:', e);
      }

      return nextState;
    });
  }, []);

  return [state, updateUrlState];
}

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../services/api.js';

// Keep resource definitions at module scope so polling does not restart on renders.
export default function useApiResources(resources, intervalMs = 15000) {
  const [data, setData] = useState(() => Object.fromEntries(resources.map(([key]) => [key, null])));
  const [errors, setErrors] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);
  const request = useRef(null);
  const abort = useCallback(() => request.current?.abort(), []);
  const refresh = useCallback(async () => {
    abort();
    const controller = new AbortController();
    request.current = controller;
    const results = await Promise.allSettled(resources.map(([, path]) => api.get(path, { signal: controller.signal, timeout: 12000 })));
    if (controller.signal.aborted) return;
    const next = {}, failed = [];
    results.forEach((result, index) => {
      const [key, , field, label] = resources[index];
      if (result.status === 'fulfilled') next[key] = result.value.data[field];
      else failed.push(label ?? key);
    });
    setData((previous) => ({ ...previous, ...next }));
    setErrors(failed);
    setUpdatedAt(new Date());
  }, [resources, abort]);
  useEffect(() => {
    // Synchronize with the API; state updates follow the awaited network requests.
    // eslint-disable-next-line react/set-state-in-effect
    void refresh();
    const timer = intervalMs ? setInterval(() => { if (!document.hidden) void refresh(); }, intervalMs) : null;
    return () => { if (timer) clearInterval(timer); abort(); };
  }, [refresh, abort, intervalMs]);
  return { data, setData, errors, updatedAt, refresh };
}


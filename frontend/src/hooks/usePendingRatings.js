import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API } from '../App';

/** Durable rating backlog — polled so the badge stays honest across tabs. */
export const usePendingRatings = (enabled = true) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      return;
    }
    setLoading(true);
    try {
      const res = await axios.get(`${API}/ratings/pending`);
      setItems(res.data?.items || []);
    } catch (e) {
      // leave previous list in place
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
    if (!enabled) return undefined;
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh, enabled]);

  return { items, count: items.length, loading, refresh };
};

export default usePendingRatings;

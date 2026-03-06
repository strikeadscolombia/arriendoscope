import { useState, useCallback, useRef } from 'react';
import { useWebSocket } from './useWebSocket';
import { API_BASE } from '../utils/constants';

export function useListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [pendingNew, setPendingNew] = useState([]);
  const [filters, setFilters] = useState({});
  const fetchingRef = useRef(false);
  const initialFetchDone = useRef(false);
  const isNearTopRef = useRef(true);

  const setIsNearTop = useCallback((val) => {
    isNearTopRef.current = val;
  }, []);

  const buildQuery = useCallback((extra = {}) => {
    const params = new URLSearchParams();
    const merged = { ...filters, ...extra };
    for (const [key, val] of Object.entries(merged)) {
      if (val != null && val !== '') params.set(key, val);
    }
    return params.toString();
  }, [filters]);

  const fetchListings = useCallback(async (reset = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (reset) setLoading(true);

    try {
      const extra = {};
      if (!reset && listings.length > 0) {
        extra.before = listings[listings.length - 1].created_at;
      }
      const query = buildQuery(extra);
      const res = await fetch(`${API_BASE}/api/listings?${query}`);
      const data = await res.json();

      if (reset) {
        setListings(data.listings);
      } else {
        setListings(prev => [...prev, ...data.listings]);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Fetch listings error:', err);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [filters, listings, buildQuery]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchListings(false);
    }
  }, [fetchListings, loading, hasMore]);

  const handleWsMessage = useCallback((data) => {
    if (data.type === 'new_listings' && data.listings) {
      if (isNearTopRef.current) {
        // Auto-insert when user is near top
        setListings(prev => [...data.listings, ...prev]);
        setTotal(prev => prev + data.listings.length);
      } else {
        // Accumulate for toast when scrolled down
        setPendingNew(prev => [...data.listings, ...prev]);
      }
    }
  }, []);

  const showNew = useCallback(() => {
    setListings(prev => [...pendingNew, ...prev]);
    setTotal(prev => prev + pendingNew.length);
    setPendingNew([]);
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pendingNew]);

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    setListings([]);
    setHasMore(true);
    initialFetchDone.current = false;
  }, []);

  const { connected } = useWebSocket(handleWsMessage);

  // Initial fetch and refetch on filter change
  const doInitialFetch = useCallback(() => {
    if (!initialFetchDone.current) {
      initialFetchDone.current = true;
      fetchListings(true);
    }
  }, [fetchListings]);

  return {
    listings,
    loading,
    hasMore,
    total,
    pendingNew,
    filters,
    connected,
    loadMore,
    showNew,
    applyFilters,
    doInitialFetch,
    setIsNearTop
  };
}

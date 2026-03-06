import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { API_BASE } from '../utils/constants';

/* ── URL ↔ filter helpers ───────────────────────────────── */

const FILTER_KEYS = ['city', 'source', 'propertyType', 'priceMin', 'priceMax', 'rooms', 'bathrooms', 'neighborhood', 'timeRange'];

function filtersFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const filters = {};
  for (const key of FILTER_KEYS) {
    const val = params.get(key);
    if (val) filters[key] = val;
  }
  return filters;
}

function filtersToUrl(filters) {
  const params = new URLSearchParams();
  for (const key of FILTER_KEYS) {
    const val = filters[key];
    if (val != null && val !== '') params.set(key, val);
  }
  const qs = params.toString();
  const url = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}

/* ── WS filter matching ─────────────────────────────────── */

function listingMatchesFilters(listing, filters) {
  if (filters.city) {
    const cities = filters.city.split(',');
    if (!cities.includes((listing.city || '').toLowerCase())) return false;
  }
  if (filters.source) {
    const sources = filters.source.split(',');
    if (!sources.includes(listing.source)) return false;
  }
  if (filters.propertyType) {
    const types = filters.propertyType.split(',');
    if (!types.includes(listing.property_type)) return false;
  }
  if (filters.priceMin && (listing.price || 0) < Number(filters.priceMin)) return false;
  if (filters.priceMax && (listing.price || 0) > Number(filters.priceMax)) return false;
  if (filters.neighborhood) {
    const needle = filters.neighborhood.toLowerCase();
    const hay = (listing.neighborhood || '').toLowerCase();
    if (!hay.includes(needle)) return false;
  }
  if (filters.rooms && String(listing.rooms) !== String(filters.rooms)) return false;
  if (filters.bathrooms && String(listing.bathrooms) !== String(filters.bathrooms)) return false;
  return true;
}

/* ── Hook ────────────────────────────────────────────────── */

export function useListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [pendingNew, setPendingNew] = useState([]);
  const [filters, setFilters] = useState(filtersFromUrl);
  const fetchingRef = useRef(false);
  const initialFetchDone = useRef(false);
  const isNearTopRef = useRef(true);
  const filtersRef = useRef(filters);

  // Keep filtersRef in sync for WS callback
  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

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
      // Filter incoming listings against active filters
      const currentFilters = filtersRef.current;
      const hasActiveFilters = Object.keys(currentFilters).length > 0;
      const matched = hasActiveFilters
        ? data.listings.filter(l => listingMatchesFilters(l, currentFilters))
        : data.listings;

      if (matched.length === 0) return;

      // Tag as new for entry animation
      const tagged = matched.map(l => ({ ...l, _isNew: true }));

      if (isNearTopRef.current) {
        setListings(prev => [...tagged, ...prev]);
        setTotal(prev => prev + tagged.length);
      } else {
        setPendingNew(prev => [...tagged, ...prev]);
      }
    }
  }, []);

  const showNew = useCallback(() => {
    setListings(prev => [...pendingNew, ...prev]);
    setTotal(prev => prev + pendingNew.length);
    setPendingNew([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pendingNew]);

  const applyFilters = useCallback((newFilters) => {
    setFilters(newFilters);
    filtersToUrl(newFilters);
    setListings([]);
    setPendingNew([]);
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

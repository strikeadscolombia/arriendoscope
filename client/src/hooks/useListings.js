import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './useWebSocket';
import { API_BASE } from '../utils/constants';
import { playNewListingSound } from '../utils/notificationSound';

/* ── URL ↔ filter helpers ───────────────────────────────── */

const FILTER_KEYS = ['city', 'source', 'propertyType', 'priceMin', 'priceMax', 'rooms', 'bathrooms', 'neighborhood', 'timeRange'];

function filtersFromUrl(overrides = {}) {
  const params = new URLSearchParams(window.location.search);
  const filters = {};
  for (const key of FILTER_KEYS) {
    const val = params.get(key);
    if (val) filters[key] = val;
  }
  // HOY is always the default time range
  if (!filters.timeRange) filters.timeRange = 'today';
  return { ...filters, ...overrides };
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

export function useListings(initialFilterOverrides = {}) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [pendingNew, setPendingNew] = useState([]);
  const [filters, setFilters] = useState(() => filtersFromUrl(initialFilterOverrides));

  // Refs for stable access without re-creating callbacks
  const abortRef = useRef(null);
  const generationRef = useRef(0);
  const loadingRef = useRef(false);
  const isNearTopRef = useRef(true);
  const filtersRef = useRef(filters);
  const listingsRef = useRef([]);

  // Keep refs in sync
  useEffect(() => { filtersRef.current = filters; }, [filters]);
  useEffect(() => { listingsRef.current = listings; }, [listings]);

  const setIsNearTop = useCallback((val) => {
    isNearTopRef.current = val;
  }, []);

  // buildQuery reads from filtersRef — zero deps, stable identity
  const buildQuery = useCallback((extra = {}) => {
    const params = new URLSearchParams();
    const merged = { ...filtersRef.current, ...extra };
    for (const [key, val] of Object.entries(merged)) {
      if (val != null && val !== '') params.set(key, val);
    }
    return params.toString();
  }, []);

  const fetchListings = useCallback(async (reset = false) => {
    // On reset (filter change): abort any in-flight request
    if (reset && abortRef.current) abortRef.current.abort();

    // On pagination: skip if already loading
    if (!reset && loadingRef.current) return;

    const generation = ++generationRef.current;
    const controller = new AbortController();
    abortRef.current = controller;
    loadingRef.current = true;

    if (reset) setLoading(true);

    try {
      const extra = {};
      if (!reset && listingsRef.current.length > 0) {
        extra.before = listingsRef.current[listingsRef.current.length - 1].created_at;
      }
      const query = buildQuery(extra);
      const res = await fetch(`${API_BASE}/api/listings?${query}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      // Stale response — a newer fetch superseded this one
      if (generation !== generationRef.current) return;

      if (reset) {
        setListings(data.listings);
      } else {
        setListings(prev => [...prev, ...data.listings]);
      }
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (err) {
      if (err.name === 'AbortError') return; // Normal cancellation
      console.error('Fetch listings error:', err);
    } finally {
      if (generation === generationRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [buildQuery]);

  const loadMore = useCallback(() => {
    if (hasMore) fetchListings(false);
  }, [fetchListings, hasMore]);

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

      // Play notification sound
      playNewListingSound();

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
    // Update ref synchronously so fetchListings reads new filters immediately
    filtersRef.current = newFilters;
    fetchListings(true);
  }, [fetchListings]);

  const { connected } = useWebSocket(handleWsMessage);

  // Initial fetch on mount
  useEffect(() => {
    fetchListings(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abort on unmount
  useEffect(() => {
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, []);

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
    setIsNearTop
  };
}

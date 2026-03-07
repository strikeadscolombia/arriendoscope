import { useEffect, useCallback } from 'react';
import { useListings } from '../../hooks/useListings';
import { useStats } from '../../context/StatsContext';
import { FilterBar } from '../../components/FilterBar/FilterBar';
import { TimeRangeBar } from '../../components/TimeRangeBar/TimeRangeBar';
import { Feed } from '../../components/Feed/Feed';
import { NewListingToast } from '../../components/NewListingToast/NewListingToast';

export function FeedPage() {
  const {
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
  } = useListings();

  const { setStats } = useStats();

  useEffect(() => {
    doInitialFetch();
  }, [doInitialFetch]);

  useEffect(() => {
    setStats({ connected, total });
  }, [connected, total, setStats]);

  const handleTimeRange = useCallback((timeRange) => {
    applyFilters({ ...filters, timeRange: timeRange || undefined });
  }, [filters, applyFilters]);

  return (
    <>
      <FilterBar filters={filters} onApply={applyFilters} />
      <TimeRangeBar value={filters.timeRange || null} onChange={handleTimeRange} />
      <NewListingToast count={pendingNew.length} onClick={showNew} />
      <Feed
        listings={listings}
        loading={loading}
        hasMore={hasMore}
        loadMore={loadMore}
        onScrollPositionChange={setIsNearTop}
      />
    </>
  );
}

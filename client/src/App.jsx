import { useEffect, useCallback } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { useListings } from './hooks/useListings';
import { Header } from './components/Header/Header';
import { FilterBar } from './components/FilterBar/FilterBar';
import { TimeRangeBar } from './components/TimeRangeBar/TimeRangeBar';
import { Feed } from './components/Feed/Feed';
import { NewListingToast } from './components/NewListingToast/NewListingToast';

function AppContent() {
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

  useEffect(() => {
    doInitialFetch();
  }, [doInitialFetch]);

  const handleTimeRange = useCallback((timeRange) => {
    applyFilters({ ...filters, timeRange: timeRange || undefined });
  }, [filters, applyFilters]);

  return (
    <>
      <Header connected={connected} total={total} />
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

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

import { useEffect, useCallback, useMemo } from 'react';
import { useListings } from '../../hooks/useListings';
import { useStats } from '../../context/StatsContext';
import { FilterBar } from '../../components/FilterBar/FilterBar';
import { TimeRangeBar } from '../../components/TimeRangeBar/TimeRangeBar';
import { Feed } from '../../components/Feed/Feed';
import { NewListingToast } from '../../components/NewListingToast/NewListingToast';
import styles from './FeedPage.module.css';

const RANGE_LABELS = {
  today: 'HOY',
  '5m':  'ÚLTIMOS 5 MINUTOS',
  '15m': 'ÚLTIMOS 15 MINUTOS',
  '30m': 'ÚLTIMOS 30 MINUTOS',
  '1h':  'ÚLTIMA HORA',
  '6h':  'ÚLTIMAS 6 HORAS',
  '12h': 'ÚLTIMAS 12 HORAS',
  '1day': 'ÚLTIMAS 24 HORAS',
  week:  'ÚLTIMA SEMANA',
  month: 'ÚLTIMO MES',
};

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
    applyFilters({ ...filters, timeRange: timeRange || 'today' });
  }, [filters, applyFilters]);

  const feedbackLabel = useMemo(() => {
    const range = filters.timeRange || 'today';
    const label = RANGE_LABELS[range];
    if (!label) return null;
    return `${total} RESULTADO${total !== 1 ? 'S' : ''} — ${label}`;
  }, [filters.timeRange, total]);

  return (
    <>
      <FilterBar filters={filters} onApply={applyFilters} />
      <TimeRangeBar value={filters.timeRange || 'today'} onChange={handleTimeRange} />
      {feedbackLabel && (
        <div className={styles.feedback}>
          {feedbackLabel}
        </div>
      )}
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

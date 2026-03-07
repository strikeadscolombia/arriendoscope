import { createContext, useContext, useState, useCallback } from 'react';

const StatsContext = createContext({ connected: false, total: 0, setStats: () => {} });

export function StatsProvider({ children }) {
  const [stats, setStatsRaw] = useState({ connected: false, total: 0 });

  const setStats = useCallback((update) => {
    setStatsRaw(prev => {
      if (prev.connected === update.connected && prev.total === update.total) return prev;
      return { ...prev, ...update };
    });
  }, []);

  return (
    <StatsContext.Provider value={{ ...stats, setStats }}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats() {
  return useContext(StatsContext);
}

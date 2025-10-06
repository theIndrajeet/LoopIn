import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  staleWhileRevalidate?: boolean; // Return stale data while fetching fresh data
}

class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get stale data even if expired (for stale-while-revalidate)
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? entry.data : null;
  }

  // Check if data is stale but not expired
  isStale(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const age = Date.now() - entry.timestamp;
    return age > entry.ttl * 0.8; // Consider stale at 80% of TTL
  }
}

// Global cache instance
const globalCache = new CacheManager({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 200
});

// Hook for cached data fetching
export const useCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions & { 
    enabled?: boolean;
    refetchOnWindowFocus?: boolean;
    refetchInterval?: number;
  } = {}
) => {
  const {
    ttl,
    staleWhileRevalidate = true,
    enabled = true,
    refetchOnWindowFocus = true,
    refetchInterval
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);
  const lastFetchRef = useRef<number>(0);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    const cacheKey = `cache-${key}`;
    const cachedData = globalCache.get<T>(cacheKey);
    const isStaleData = globalCache.isStale(cacheKey);

    // Return cached data if available and not forcing refresh
    if (cachedData && !force && !isStaleData) {
      setData(cachedData);
      setIsStale(false);
      return;
    }

    // Return stale data while revalidating if enabled
    if (staleWhileRevalidate && cachedData && !force) {
      setData(cachedData);
      setIsStale(true);
    }

    // Don't fetch if we're already loading and not forcing
    if (loading && !force) return;

    setLoading(true);
    setError(null);

    try {
      const freshData = await fetcher();
      globalCache.set(cacheKey, freshData, ttl);
      setData(freshData);
      setIsStale(false);
      lastFetchRef.current = Date.now();
    } catch (err) {
      setError(err as Error);
      // If we have stale data, keep it even on error
      if (!staleWhileRevalidate || !cachedData) {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl, staleWhileRevalidate, enabled, loading]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const timeSinceLastFetch = Date.now() - lastFetchRef.current;
      // Only refetch if it's been more than 30 seconds since last fetch
      if (timeSinceLastFetch > 30000) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData, refetchOnWindowFocus]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval) return;

    const interval = setInterval(() => {
      fetchData();
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [fetchData, refetchInterval]);

  const invalidate = useCallback(() => {
    globalCache.delete(`cache-${key}`);
    fetchData(true);
  }, [key, fetchData]);

  const refresh = useCallback(() => {
    fetchData(true);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    isStale,
    invalidate,
    refresh
  };
};

// Hook for optimistic updates
export const useOptimisticUpdate = <T>(
  key: string,
  fetcher: () => Promise<T>,
  updater: (currentData: T | null, optimisticData: any) => T
) => {
  const { data, loading, error, invalidate } = useCache(key, fetcher);

  const optimisticUpdate = useCallback(async (
    optimisticData: any,
    actualUpdate: () => Promise<any>
  ) => {
    if (!data) return;

    // Apply optimistic update immediately
    const optimisticResult = updater(data, optimisticData);
    globalCache.set(`cache-${key}`, optimisticResult);

    try {
      // Perform actual update
      await actualUpdate();
      // Refresh data to get server state
      invalidate();
    } catch (error) {
      // Revert optimistic update on error
      invalidate();
      throw error;
    }
  }, [data, updater, key, invalidate]);

  return {
    data,
    loading,
    error,
    optimisticUpdate
  };
};

// Hook for paginated data with caching
export const usePaginatedCache = <T>(
  key: string,
  fetcher: (page: number, limit: number) => Promise<{ data: T[]; hasMore: boolean; total?: number }>,
  options: { pageSize?: number; ttl?: number } = {}
) => {
  const { pageSize = 20, ttl } = options;
  const [page, setPage] = useState(1);
  const [allData, setAllData] = useState<T[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPage = useCallback(async (pageNum: number, append = false) => {
    const cacheKey = `paginated-${key}-${pageNum}`;
    const cached = globalCache.get<{ data: T[]; hasMore: boolean; total?: number }>(cacheKey);

    if (cached) {
      if (append) {
        setAllData(prev => [...prev, ...cached.data]);
      } else {
        setAllData(cached.data);
      }
      setHasMore(cached.hasMore);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetcher(pageNum, pageSize);
      globalCache.set(cacheKey, result, ttl);

      if (append) {
        setAllData(prev => [...prev, ...result.data]);
      } else {
        setAllData(result.data);
      }
      setHasMore(result.hasMore);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, pageSize, ttl]);

  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchPage(nextPage, true);
    }
  }, [page, hasMore, loading, fetchPage]);

  const refresh = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
    fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    fetchPage(1, false);
  }, [fetchPage]);

  return {
    data: allData,
    loading,
    error,
    hasMore,
    loadMore,
    refresh,
    page
  };
};

export { globalCache };

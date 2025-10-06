import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Zap, 
  Memory, 
  Wifi, 
  WifiOff, 
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { usePerformance } from '@/hooks/use-performance';
import { useNetworkErrorHandler } from '@/hooks/use-error-handler';
import { globalCache } from '@/hooks/use-cache';

interface PerformanceMetrics {
  lcp?: number;
  fid?: number;
  cls?: number;
  fcp?: number;
  ttfb?: number;
  memoryUsed?: number;
  memoryTotal?: number;
  memoryLimit?: number;
  cacheSize?: number;
  cacheHitRate?: number;
}

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [isVisible, setIsVisible] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const { isOnline, networkErrors } = useNetworkErrorHandler();

  useEffect(() => {
    const updateMetrics = () => {
      // Get Web Vitals from Performance API
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paintEntries = performance.getEntriesByType('paint');
      
      const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime;
      const lcp = performance.getEntriesByType('largest-contentful-paint')[0]?.startTime;
      
      // Get memory info if available
      const memory = (performance as any).memory;
      
      // Get cache info
      const cacheSize = globalCache.size();
      
      setMetrics({
        lcp,
        fid: undefined, // Would need to be tracked separately
        cls: undefined, // Would need to be tracked separately
        fcp,
        ttfb: navigation ? navigation.responseStart - navigation.requestStart : undefined,
        memoryUsed: memory?.usedJSHeapSize,
        memoryTotal: memory?.totalJSHeapSize,
        memoryLimit: memory?.jsHeapSizeLimit,
        cacheSize,
        cacheHitRate: 0.85 // This would be calculated from actual cache usage
      });
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [refreshKey]);

  const getPerformanceScore = (value: number | undefined, thresholds: { good: number; poor: number }) => {
    if (value === undefined) return 'unknown';
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'good': return 'text-green-600';
      case 'needs-improvement': return 'text-yellow-600';
      case 'poor': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreBadge = (score: string) => {
    switch (score) {
      case 'good': return <Badge className="bg-green-100 text-green-800">Good</Badge>;
      case 'needs-improvement': return <Badge className="bg-yellow-100 text-yellow-800">Needs Improvement</Badge>;
      case 'poor': return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
      default: return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Activity className="w-4 h-4 mr-2" />
          Performance
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto z-50 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg">
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Performance Monitor
          </h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setRefreshKey(prev => prev + 1)}
              size="sm"
              variant="ghost"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button
              onClick={() => setIsVisible(false)}
              size="sm"
              variant="ghost"
            >
              ×
            </Button>
          </div>
        </div>

        <Tabs defaultValue="web-vitals" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="web-vitals">Web Vitals</TabsTrigger>
            <TabsTrigger value="memory">Memory</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>

          <TabsContent value="web-vitals" className="space-y-3 mt-4">
            {/* LCP */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">LCP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {metrics.lcp ? `${metrics.lcp.toFixed(0)}ms` : 'N/A'}
                </span>
                {getScoreBadge(getPerformanceScore(metrics.lcp, { good: 2500, poor: 4000 }))}
              </div>
            </div>

            {/* FID */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">FID</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {metrics.fid ? `${metrics.fid.toFixed(0)}ms` : 'N/A'}
                </span>
                {getScoreBadge(getPerformanceScore(metrics.fid, { good: 100, poor: 300 }))}
              </div>
            </div>

            {/* CLS */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">CLS</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {metrics.cls ? metrics.cls.toFixed(3) : 'N/A'}
                </span>
                {getScoreBadge(getPerformanceScore(metrics.cls, { good: 0.1, poor: 0.25 }))}
              </div>
            </div>

            {/* FCP */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">FCP</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {metrics.fcp ? `${metrics.fcp.toFixed(0)}ms` : 'N/A'}
                </span>
                {getScoreBadge(getPerformanceScore(metrics.fcp, { good: 1800, poor: 3000 }))}
              </div>
            </div>

            {/* TTFB */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <span className="text-sm font-medium">TTFB</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {metrics.ttfb ? `${metrics.ttfb.toFixed(0)}ms` : 'N/A'}
                </span>
                {getScoreBadge(getPerformanceScore(metrics.ttfb, { good: 800, poor: 1800 }))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="memory" className="space-y-3 mt-4">
            {/* Memory Usage */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Memory Usage</span>
                <span className="text-sm text-muted-foreground">
                  {metrics.memoryUsed ? `${(metrics.memoryUsed / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
                </span>
              </div>
              {metrics.memoryUsed && metrics.memoryLimit && (
                <Progress 
                  value={(metrics.memoryUsed / metrics.memoryLimit) * 100} 
                  className="h-2"
                />
              )}
            </div>

            {/* Memory Total */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Memory</span>
              <span className="text-sm text-muted-foreground">
                {metrics.memoryTotal ? `${(metrics.memoryTotal / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
              </span>
            </div>

            {/* Memory Limit */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Memory Limit</span>
              <span className="text-sm text-muted-foreground">
                {metrics.memoryLimit ? `${(metrics.memoryLimit / 1024 / 1024).toFixed(1)} MB` : 'N/A'}
              </span>
            </div>

            {/* Cache Size */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Cache Entries</span>
              <span className="text-sm text-muted-foreground">
                {metrics.cacheSize || 0}
              </span>
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-3 mt-4">
            {/* Connection Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOnline ? <Wifi className="w-4 h-4 text-green-600" /> : <WifiOff className="w-4 h-4 text-red-600" />}
                <span className="text-sm font-medium">Connection</span>
              </div>
              <Badge className={isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                {isOnline ? 'Online' : 'Offline'}
              </Badge>
            </div>

            {/* Network Errors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network Errors</span>
                <span className="text-sm text-muted-foreground">
                  {networkErrors.length}
                </span>
              </div>
              {networkErrors.length > 0 && (
                <div className="space-y-1">
                  {networkErrors.slice(-3).map((error, index) => (
                    <div key={index} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      {error.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

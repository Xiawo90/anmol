import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Database, HardDrive, Table2, Users, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TableStat {
  table: string;
  rows: number;
}

interface StorageStats {
  totalRows: number;
  totalAuthUsers: number;
  tableStats: TableStat[];
  storageBuckets: any[];
}

const DB_LIMIT_MB = 500; // 500 MB plan limit
const STORAGE_LIMIT_MB = 1024; // 1 GB plan limit

// Rough estimate: ~1KB per row average for text-heavy tables
const estimateDbSizeMB = (totalRows: number) => {
  return Math.round((totalRows * 1) / 1024 * 100) / 100; // KB per row → MB
};

const formatTableName = (name: string) => {
  return name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

export function StorageView() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('database-stats', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);
      setStats(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
          Loading storage stats...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="w-5 h-5 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchStats} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const estimatedMB = estimateDbSizeMB(stats.totalRows);
  const dbUsagePercent = Math.min((estimatedMB / DB_LIMIT_MB) * 100, 100);
  const topTables = stats.tableStats.filter(t => t.rows > 0).slice(0, 10);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              Database & Storage
            </CardTitle>
            <CardDescription>System resource usage overview</CardDescription>
          </div>
          <Button variant="ghost" size="icon" onClick={fetchStats}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Table2 className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{stats.totalRows.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Users className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{stats.totalAuthUsers}</p>
              <p className="text-xs text-muted-foreground">Auth Users</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <HardDrive className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{estimatedMB} MB</p>
              <p className="text-xs text-muted-foreground">Est. DB Size</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <Database className="w-5 h-5 mx-auto mb-1 text-primary" />
              <p className="text-xl font-bold">{stats.storageBuckets.length}</p>
              <p className="text-xs text-muted-foreground">Storage Buckets</p>
            </div>
          </div>

          {/* DB Usage Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">Database Usage (estimated)</span>
              <span className="font-medium">{estimatedMB} MB / {DB_LIMIT_MB} MB</span>
            </div>
            <Progress value={dbUsagePercent} className="h-3" />
            {dbUsagePercent > 80 && (
              <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Database usage is high. Consider optimizing or upgrading.
              </p>
            )}
          </div>

          {/* File Storage Bar */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-muted-foreground">File Storage</span>
              <span className="font-medium">
                {stats.storageBuckets.length > 0 ? 'Active' : 'No buckets configured'}
              </span>
            </div>
            <Progress value={stats.storageBuckets.length > 0 ? 5 : 0} className="h-3" />
            <p className="text-xs text-muted-foreground mt-1">
              Limit: {STORAGE_LIMIT_MB / 1024} GB total across all buckets
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Table Breakdown */}
      {topTables.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Table Breakdown</CardTitle>
            <CardDescription>Top tables by record count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topTables.map((t) => {
                const percent = stats.totalRows > 0 ? (t.rows / stats.totalRows) * 100 : 0;
                return (
                  <div key={t.table}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="truncate">{formatTableName(t.table)}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-mono">
                          {t.rows.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

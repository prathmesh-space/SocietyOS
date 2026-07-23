'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert, User, Clock } from 'lucide-react';

interface AuditLog {
  _id: string;
  action: string;
  entityType: string;
  actorId?: { name: string; email: string } | null;
  timestamp: string;
}

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await apiClient<{ logs: AuditLog[] }>('/api/admin/audit-log?limit=50');
      if ('data' in res) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-forest mb-1">Audit Log</h1>
        <p className="text-sm text-forest/70 font-medium">View system activity and security events for your society.</p>
      </div>

      <Card variant="compact">
        <CardHeader className="pb-4 border-b border-stone">
          <CardTitle>Activity Feed</CardTitle>
          <CardDescription>Recent actions performed by admins, users, and the system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-12 bg-clay-light animate-pulse rounded-md" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <ShieldAlert className="w-12 h-12 text-forest/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-forest">No logs found</h3>
              <p className="text-sm text-forest/50 mt-1">System activity will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full pb-2">
              <Table className="min-w-[800px]">
              <TableHeader className="bg-clay-light/30">
                <TableRow className="border-stone hover:bg-transparent">
                  <TableHead className="text-forest font-semibold">Timestamp</TableHead>
                  <TableHead className="text-forest font-semibold">Action</TableHead>
                  <TableHead className="text-forest font-semibold">Entity</TableHead>
                  <TableHead className="text-forest font-semibold">Actor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log._id} className="border-stone hover:bg-clay-light/20">
                    <TableCell className="whitespace-nowrap text-sm text-forest/70 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-xs rounded-sm bg-clay-light/50 border-stone text-forest">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium text-forest/80">{log.entityType}</TableCell>
                    <TableCell>
                      {!log.actorId ? (
                        <div className="flex items-center gap-2 text-forest text-sm font-semibold">
                          <ShieldAlert className="w-4 h-4 text-forest/50" /> System
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-forest/90 text-sm font-medium">
                          <User className="w-4 h-4 text-forest/40" /> {log.actorId?.name || 'Unknown'}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

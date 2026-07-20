'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, XCircle } from 'lucide-react';

interface Unit {
  _id: string;
  unitNumber: string;
  block: string;
  floor: number;
}

interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'resident' | 'watchman' | 'admin';
  status: 'pending' | 'active' | 'deactivated';
  unitId?: Unit;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [filter]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      let url = '/api/admin/users?limit=100';
      if (filter !== 'all') url += `&status=${filter}`;
      
      const res = await apiClient<{ users: User[] }>(url);
      if ('data' in res) {
        setUsers(res.data.users);
      }
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    setIsProcessing(userId);
    try {
      const res = await apiClient(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ approved }),
      });

      if ('error' in res) {
        alert(res.error || 'Failed to update user');
      } else {
        fetchUsers(); // refresh the list
      }
    } catch (err) {
      alert('An unexpected error occurred.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-forest mb-1">User Management</h1>
          <p className="text-sm text-forest/70 font-medium">Manage residents, watchmen, and their access.</p>
        </div>

        <div className="flex bg-clay-light/50 p-1 rounded-lg border border-stone">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'all' ? 'bg-white text-forest shadow-sm' : 'text-forest/60 hover:text-forest'}`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'pending' ? 'bg-white text-terracotta shadow-sm' : 'text-forest/60 hover:text-forest'}`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'active' ? 'bg-white text-forest shadow-sm' : 'text-forest/60 hover:text-forest'}`}
          >
            Active
          </button>
        </div>
      </div>

      <Card variant="compact">
        <CardHeader className="pb-4 border-b border-stone">
          <CardTitle>Directory</CardTitle>
          <CardDescription>All registered users in your society.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-clay-light animate-pulse rounded-md" />)}
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-forest/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-forest">No users found</h3>
              <p className="text-sm text-forest/50 mt-1">Try changing the filter or invite residents.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-clay-light/30">
                <TableRow className="border-stone hover:bg-transparent">
                  <TableHead className="text-forest font-semibold">Name</TableHead>
                  <TableHead className="text-forest font-semibold">Contact</TableHead>
                  <TableHead className="text-forest font-semibold">Role / Unit</TableHead>
                  <TableHead className="text-forest font-semibold">Status</TableHead>
                  <TableHead className="text-right text-forest font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u._id} className="border-stone hover:bg-clay-light/20">
                    <TableCell className="font-semibold text-forest">{u.name}</TableCell>
                    <TableCell>
                      <div className="text-sm text-forest/80">{u.email}</div>
                      <div className="text-xs text-forest/50">{u.phone}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={u.role === 'admin' ? 'default' : u.role === 'watchman' ? 'outline' : 'secondary'} className="rounded-sm text-xs px-2 py-0.5">
                          {u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                        </Badge>
                        {u.unitId && (
                          <span className="text-sm text-forest font-medium">
                            {u.unitId.block}-{u.unitId.unitNumber}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'success' : u.status === 'pending' ? 'warning' : 'destructive'} className="rounded-sm text-xs px-2 py-0.5 font-semibold">
                        {u.status.charAt(0).toUpperCase() + u.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {u.status === 'pending' && u.role === 'resident' && (
                        <div className="flex justify-end gap-2">
                          <Button 
                            expression="compact"
                            size="sm" 
                            variant="outline" 
                            className="text-terracotta hover:bg-terracotta/10 hover:text-terracotta border-terracotta/30"
                            onClick={() => handleApproval(u._id, false)}
                            disabled={isProcessing === u._id}
                          >
                            <XCircle className="w-4 h-4 mr-1" /> Reject
                          </Button>
                          <Button 
                            expression="compact"
                            size="sm" 
                            className="bg-forest hover:bg-forest/90 text-alabaster"
                            onClick={() => handleApproval(u._id, true)}
                            disabled={isProcessing === u._id}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

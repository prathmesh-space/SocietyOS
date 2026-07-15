'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, CheckCircle2, User } from 'lucide-react';

interface Resident {
  name: string;
  unitId?: { block: string; unitNumber: string };
}

interface Complaint {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  residentId: Resident;
  assignedToId?: { name: string };
  createdAt: string;
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await apiClient<{ complaints: Complaint[] }>('/api/admin/complaints?limit=100');
      if ('data' in res) {
        setComplaints(res.data.complaints);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    try {
      const res = await apiClient(`/api/admin/complaints/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      if ('error' in res) {
        alert(res.error || 'Failed to update status');
      } else {
        fetchComplaints();
      }
    } catch (err) {
      alert('An unexpected error occurred.');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Complaints Board</h1>
        <p className="text-sm text-slate-500 mt-1">Manage and resolve resident issues.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kanban-style Columns */}
        {(['Open', 'In Progress', 'Resolved'] as const).map((statusGroup) => (
          <div key={statusGroup} className="space-y-4">
            <h3 className="font-semibold text-slate-700 flex items-center justify-between border-b pb-2">
              {statusGroup}
              <Badge variant="secondary">
                {complaints.filter(c => c.status === statusGroup).length}
              </Badge>
            </h3>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-lg" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.filter(c => c.status === statusGroup).map(complaint => (
                  <Card key={complaint._id} className="cursor-default hover:border-indigo-200 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <Badge variant="outline" className="text-xs">{complaint.category}</Badge>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-slate-900 text-sm line-clamp-1">{complaint.title}</h4>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{complaint.description}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2 rounded-md">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium truncate">{complaint.residentId?.name}</span>
                        {complaint.residentId?.unitId && (
                          <span className="text-slate-400 shrink-0">
                            ({complaint.residentId.unitId.block}-{complaint.residentId.unitId.unitNumber})
                          </span>
                        )}
                      </div>

                      {/* Status Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        {statusGroup === 'Open' && (
                          <Button size="sm" className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600" onClick={() => handleUpdateStatus(complaint._id, 'In Progress')}>
                            <Clock className="w-3.5 h-3.5 mr-1" /> Mark In Progress
                          </Button>
                        )}
                        {statusGroup === 'In Progress' && (
                          <Button size="sm" className="w-full h-8 text-xs bg-emerald-500 hover:bg-emerald-600" onClick={() => handleUpdateStatus(complaint._id, 'Resolved')}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                          </Button>
                        )}
                        {statusGroup === 'Resolved' && (
                          <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={() => handleUpdateStatus(complaint._id, 'Closed')}>
                            Close Ticket
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {complaints.filter(c => c.status === statusGroup).length === 0 && (
                  <div className="text-center py-8 bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No {statusGroup.toLowerCase()} complaints.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

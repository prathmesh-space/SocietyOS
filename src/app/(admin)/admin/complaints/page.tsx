'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
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
        <h1 className="text-2xl font-semibold tracking-tight text-forest mb-1">Complaints Board</h1>
        <p className="text-sm text-forest/70 font-medium">Manage and resolve resident issues.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kanban-style Columns */}
        {(['Open', 'In Progress', 'Resolved'] as const).map((statusGroup) => (
          <div key={statusGroup} className="space-y-4">
            <h3 className="font-semibold text-forest flex items-center justify-between border-b border-stone pb-2">
              {statusGroup}
              <Badge variant="secondary" className="bg-clay-light text-forest border-stone">
                {complaints.filter(c => c.status === statusGroup).length}
              </Badge>
            </h3>
            
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-32 bg-clay-light animate-pulse rounded-md" />)}
              </div>
            ) : (
              <div className="space-y-3">
                {complaints.filter(c => c.status === statusGroup).map(complaint => (
                  <Card key={complaint._id} variant="compact" className="cursor-default hover:border-forest/30 transition-colors">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <Badge variant="outline" className="text-xs border-stone text-forest">{complaint.category}</Badge>
                        <span className="text-[10px] text-forest/50 font-semibold uppercase tracking-widest">
                          {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div>
                        <h4 className="font-semibold text-forest text-sm line-clamp-1">{complaint.title}</h4>
                        <p className="text-xs text-forest/70 mt-1 line-clamp-2">{complaint.description}</p>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-forest/80 bg-clay-light/50 p-2 rounded-md border border-stone">
                        <User className="w-3.5 h-3.5 text-forest/50" />
                        <span className="font-medium truncate">{complaint.residentId?.name}</span>
                        {complaint.residentId?.unitId && (
                          <span className="text-forest/50 shrink-0 font-medium">
                            ({complaint.residentId.unitId.block}-{complaint.residentId.unitId.unitNumber})
                          </span>
                        )}
                      </div>

                      {/* Status Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone">
                        {statusGroup === 'Open' && (
                          <Button expression="compact" size="sm" className="w-full h-8 text-xs bg-terracotta hover:bg-terracotta/90 text-alabaster" onClick={() => handleUpdateStatus(complaint._id, 'In Progress')}>
                            <Clock className="w-3.5 h-3.5 mr-1" /> Mark In Progress
                          </Button>
                        )}
                        {statusGroup === 'In Progress' && (
                          <Button expression="compact" size="sm" className="w-full h-8 text-xs bg-forest hover:bg-forest/90 text-alabaster" onClick={() => handleUpdateStatus(complaint._id, 'Resolved')}>
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Mark Resolved
                          </Button>
                        )}
                        {statusGroup === 'Resolved' && (
                          <Button expression="compact" size="sm" variant="outline" className="w-full h-8 text-xs border-stone text-forest hover:bg-clay-light" onClick={() => handleUpdateStatus(complaint._id, 'Closed')}>
                            Close Ticket
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {complaints.filter(c => c.status === statusGroup).length === 0 && (
                  <div className="text-center py-8 bg-clay-light/30 rounded-md border border-dashed border-stone">
                    <MessageSquare className="w-8 h-8 text-forest/20 mx-auto mb-2" />
                    <p className="text-sm text-forest/50 font-medium">No {statusGroup.toLowerCase()} complaints.</p>
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

'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, User, Phone, Briefcase } from 'lucide-react';

interface Visitor {
  _id: string;
  name: string;
  phone: string;
  purpose: string;
  entryTime: string;
  isPreApproved: boolean;
  unitId?: { block: string; unitNumber: string };
  status: 'Inside' | 'Left';
}

export default function WatchmanDashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVisitors();
  }, []);

  const fetchVisitors = async () => {
    try {
      const res = await apiClient<{ visitors: Visitor[] }>('/api/watchman/visitors/inside');
      if ('data' in res) {
        setVisitors(res.data.visitors);
      }
    } catch (err) {
      console.error('Failed to load visitors inside:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckout = async (id: string) => {
    try {
      // In a real app, there would be a specific API for check-out. 
      // For this implementation, we assume we just call a generic endpoint or we can mock it here
      alert('Visitor checked out successfully (Mock)');
      setVisitors(prev => prev.filter(v => v._id !== id));
    } catch (err) {
      alert('Failed to check out visitor');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 p-4 space-y-4">
      <div className="bg-slate-900 text-white p-5 rounded-xl shadow-md">
        <h2 className="text-xl font-bold">Currently Inside</h2>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-4xl font-extrabold">{visitors.length}</span>
          <span className="text-slate-400">visitors</span>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 bg-slate-200 animate-pulse rounded-xl" />)
        ) : visitors.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No visitors inside the society right now.</p>
          </div>
        ) : (
          visitors.map(visitor => (
            <Card key={visitor._id} className="border-slate-200">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-900 flex items-center gap-2">
                      {visitor.name}
                      {visitor.isPreApproved && <Badge variant="success" className="text-[10px] px-1.5 py-0">Pre-approved</Badge>}
                    </h3>
                    <div className="text-sm text-slate-500 mt-1 space-y-1">
                      {visitor.phone && (
                        <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {visitor.phone}</p>
                      )}
                      <p className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {visitor.purpose}</p>
                      {visitor.unitId && (
                        <p className="flex items-center gap-1.5 font-medium text-indigo-600">
                          <User className="w-3.5 h-3.5" /> Visiting: {visitor.unitId.block}-{visitor.unitId.unitNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 flex items-center justify-end gap-1 mb-2">
                      <Clock className="w-3 h-3" />
                      {new Date(visitor.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    <button 
                      onClick={() => handleCheckout(visitor._id)}
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg transition-colors"
                    >
                      Check Out
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

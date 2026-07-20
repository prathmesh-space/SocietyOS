'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
      <div className="bg-forest text-alabaster p-5 rounded-xl shadow-md border border-stone">
        <h2 className="text-xl font-semibold tracking-tight">Currently Inside</h2>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-4xl font-extrabold text-alabaster">{visitors.length}</span>
          <span className="text-alabaster/70 font-medium">visitors</span>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3].map(i => <div key={i} className="h-24 bg-clay-light animate-pulse rounded-md" />)
        ) : visitors.length === 0 ? (
          <div className="text-center py-12 bg-transparent border border-stone rounded-md">
            <CheckCircle2 className="w-12 h-12 text-forest/20 mx-auto mb-3" />
            <p className="text-forest/60 font-medium">No visitors inside the society right now.</p>
          </div>
        ) : (
          visitors.map(visitor => (
            <Card key={visitor._id} variant="compact" className="border-stone hover:bg-clay-light/20 transition-colors">
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-forest flex items-center gap-2">
                      {visitor.name}
                      {visitor.isPreApproved && <Badge variant="success" className="text-[10px] px-1.5 py-0 rounded-sm">Pre-approved</Badge>}
                    </h3>
                    <div className="text-sm text-forest/70 mt-1 space-y-1">
                      {visitor.phone && (
                         <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {visitor.phone}</p>
                      )}
                      <p className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" /> {visitor.purpose}</p>
                      {visitor.unitId && (
                        <p className="flex items-center gap-1.5 font-semibold text-terracotta">
                          <User className="w-3.5 h-3.5" /> Visiting: {visitor.unitId.block}-{visitor.unitId.unitNumber}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col justify-between h-full items-end gap-3">
                    <p className="text-xs text-forest/50 flex items-center justify-end gap-1 font-semibold uppercase tracking-widest">
                      <Clock className="w-3 h-3" />
                      {new Date(visitor.entryTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                    <Button 
                      expression="compact"
                      size="sm"
                      variant="outline"
                      onClick={() => handleCheckout(visitor._id)}
                      className="text-xs border-stone text-forest hover:bg-clay-light"
                    >
                      Check Out
                    </Button>
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

'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Calendar, Clock } from 'lucide-react';

interface Notice {
  _id: string;
  title: string;
  body: string;
  isImportant: boolean;
  expiryDate?: string | null;
  createdAt: string;
}

export default function ResidentNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await apiClient<{ notices: Notice[] }>('/api/resident/notices');
      if ('data' in res) {
        setNotices(res.data.notices);
      }
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-10 py-8">
      <div>
        <h1 className="text-4xl font-playfair font-semibold text-forest">Notice Board</h1>
        <p className="text-lg text-forest/70 mt-2">Stay updated with the latest announcements from the society.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-clay-light animate-pulse rounded-3xl" />)}
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-20 bg-white border border-stone rounded-3xl shadow-soft-default">
            <Megaphone className="w-16 h-16 text-sage/50 mx-auto mb-6" />
            <h3 className="text-xl font-playfair font-semibold text-forest">No active notices</h3>
            <p className="text-forest/70 mt-2">You are all caught up!</p>
          </div>
        ) : (
          notices.map(notice => (
            <Card key={notice._id} variant="full" className={notice.isImportant ? 'border-terracotta bg-terracotta/5 shadow-soft-md' : ''}>
              <CardContent className="p-8 flex flex-col sm:flex-row gap-8">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${notice.isImportant ? 'bg-terracotta/10 text-terracotta' : 'bg-sage/20 text-forest'}`}>
                  <Megaphone className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-2xl font-playfair font-semibold text-forest">{notice.title}</h3>
                      {notice.isImportant && <Badge variant="destructive" className="px-3 py-1 text-xs">Important</Badge>}
                    </div>
                    <div className="flex items-center gap-2 text-xs font-medium text-forest/70 bg-clay-light px-3 py-1.5 rounded-full">
                      <Calendar className="w-4 h-4" />
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-forest/80 whitespace-pre-wrap leading-relaxed text-base">{notice.body}</p>
                  
                  {notice.expiryDate && (
                    <p className="text-sm text-terracotta/80 pt-2 flex items-center gap-2 font-medium">
                      <Clock className="w-4 h-4" /> Valid till {new Date(notice.expiryDate).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

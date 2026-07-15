'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Megaphone, Calendar, Clock } from 'lucide-react';

interface Notice {
  _id: string;
  title: string;
  content: string;
  isImportant: boolean;
  expiresAt?: string;
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
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Notice Board</h1>
        <p className="text-sm text-slate-500 mt-1">Stay updated with the latest announcements from the society.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl" />)}
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No active notices</h3>
            <p className="text-sm text-slate-500 mt-1">You are all caught up!</p>
          </div>
        ) : (
          notices.map(notice => (
            <Card key={notice._id} className={notice.isImportant ? 'border-red-200 bg-red-50/10 shadow-sm shadow-red-100' : ''}>
              <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notice.isImportant ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  <Megaphone className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-slate-900">{notice.title}</h3>
                      {notice.isImportant && <Badge variant="destructive">Important</Badge>}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(notice.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">{notice.content}</p>
                  
                  {notice.expiresAt && (
                    <p className="text-xs text-amber-600 pt-2 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" /> Valid till {new Date(notice.expiresAt).toLocaleDateString()}
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

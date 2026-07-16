'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Megaphone, Plus, Calendar , Clock} from "lucide-react";

interface Notice {
  _id: string;
  title: string;
  body: string;
  isImportant: boolean;
  expiryDate?: string | null;
  createdAt: string;
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    isImportant: false,
    expiryDate: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await apiClient<{ notices: Notice[] }>('/api/admin/notices?limit=50');
      if ('data' in res) {
        setNotices(res.data.notices);
      }
    } catch (err) {
      console.error('Failed to load notices:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        ...formData,
        expiryDate: formData.expiryDate ? new Date(formData.expiryDate).toISOString() : undefined,
      };

      const res = await apiClient('/api/admin/notices', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if ('error' in res) {
        alert(res.error || 'Failed to create notice');
      } else {
        setIsDialogOpen(false);
        setFormData({ title: '', body: '', isImportant: false, expiryDate: '' });
        fetchNotices();
      }
    } catch (err) {
      alert('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Digital Notice Board</h1>
          <p className="text-sm text-slate-500 mt-1">Broadcast announcements to all residents.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Notice
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Publish a Notice</DialogTitle>
              <DialogDescription>
                This will be instantly visible to all residents on their dashboard.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateNotice} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" required placeholder="e.g. Water Supply Interruption" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Message Content</Label>
                <textarea 
                  id="content" 
                  required 
                  rows={4}
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                  placeholder="Details of the announcement..."
                  value={formData.body} 
                  onChange={(e) => setFormData({...formData, body: e.target.value})} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer h-10">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600"
                      checked={formData.isImportant}
                      onChange={(e) => setFormData({...formData, isImportant: e.target.checked})}
                    />
                    <span className="text-sm font-medium text-red-600">Mark as Important (High Priority)</span>
                  </label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input id="expiryDate" type="date" value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Publishing...' : 'Publish Notice'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl" />)}
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
            <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">Notice Board is empty</h3>
            <p className="text-sm text-slate-500 mt-1">Create an announcement to communicate with residents.</p>
          </div>
        ) : (
          notices.map(notice => {
            const isExpired = notice.expiryDate && new Date(notice.expiryDate) < new Date();
            return (
              <Card key={notice._id} className={notice.isImportant ? 'border-red-200 bg-red-50/10' : ''}>
                <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notice.isImportant ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-slate-900">{notice.title}</h3>
                        {notice.isImportant && <Badge variant="destructive">Important</Badge>}
                        {isExpired && <Badge variant="secondary">Expired</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(notice.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-slate-600 whitespace-pre-wrap text-sm leading-relaxed">{notice.body}</p>
                    
                    {notice.expiryDate && !isExpired && (
                      <p className="text-xs text-slate-500 pt-2 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" /> Expires on {new Date(notice.expiryDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

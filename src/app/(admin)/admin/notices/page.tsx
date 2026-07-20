'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
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
          <h1 className="text-2xl font-semibold tracking-tight text-forest mb-1">Digital Notice Board</h1>
          <p className="text-sm text-forest/70 font-medium">Broadcast announcements to all residents.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button expression="compact" className="gap-2">
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
                <Input id="title" required placeholder="e.g. Water Supply Interruption" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="h-9 rounded-md" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Message Content</Label>
                <textarea 
                  id="content" 
                  required 
                  rows={4}
                  className="flex w-full rounded-md border border-stone bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-forest text-forest placeholder:text-forest/30"
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
                      className="w-4 h-4 text-forest rounded border-stone focus:ring-forest"
                      checked={formData.isImportant}
                      onChange={(e) => setFormData({...formData, isImportant: e.target.checked})}
                    />
                    <span className="text-sm font-semibold text-terracotta">Mark as Important (High Priority)</span>
                  </label>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                  <Input id="expiryDate" type="date" value={formData.expiryDate} onChange={(e) => setFormData({...formData, expiryDate: e.target.value})} className="h-9 rounded-md" />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button expression="compact" type="submit" disabled={isSubmitting}>
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
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-clay-light animate-pulse rounded-xl" />)}
          </div>
        ) : notices.length === 0 ? (
          <div className="text-center py-16 bg-transparent border border-stone rounded-xl shadow-sm">
            <Megaphone className="w-12 h-12 text-forest/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-forest">Notice Board is empty</h3>
            <p className="text-sm text-forest/50 mt-1">Create an announcement to communicate with residents.</p>
          </div>
        ) : (
          notices.map(notice => {
            const isExpired = notice.expiryDate && new Date(notice.expiryDate) < new Date();
            return (
              <Card key={notice._id} variant="compact" className={notice.isImportant ? 'border-terracotta/30 bg-terracotta/5' : ''}>
                <CardContent className="p-6 flex flex-col sm:flex-row gap-6">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${notice.isImportant ? 'bg-terracotta/10 text-terracotta' : 'bg-clay-light text-forest'}`}>
                    <Megaphone className="w-6 h-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-forest">{notice.title}</h3>
                        {notice.isImportant && <Badge variant="destructive" className="rounded-sm font-semibold">Important</Badge>}
                        {isExpired && <Badge variant="secondary" className="rounded-sm font-semibold">Expired</Badge>}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-forest/50 uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(notice.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <p className="text-forest/80 whitespace-pre-wrap text-sm leading-relaxed">{notice.body}</p>
                    
                    {notice.expiryDate && !isExpired && (
                      <p className="text-xs text-forest/50 pt-2 flex items-center gap-1.5 font-medium">
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

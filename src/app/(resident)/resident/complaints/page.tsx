'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageSquare, Plus, CheckCircle2, Clock } from 'lucide-react';

interface Complaint {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  createdAt: string;
}

export default function ResidentComplaintsPage() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Maintenance',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const res = await apiClient<{ complaints: Complaint[] }>('/api/resident/complaints');
      if ('data' in res) {
        setComplaints(res.data.complaints);
      }
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await apiClient('/api/resident/complaints', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if ('error' in res) {
        alert(res.error || 'Failed to file complaint');
      } else {
        setIsDialogOpen(false);
        setFormData({ title: '', description: '', category: 'Maintenance' });
        fetchComplaints();
      }
    } catch (err) {
      alert('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Helpdesk</h1>
          <p className="text-sm text-slate-500 mt-1">File and track complaints directly with the committee.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>File a Complaint</DialogTitle>
              <DialogDescription>
                Describe the issue you are facing. Admins will respond shortly.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleFileComplaint} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                >
                  <option value="Maintenance">Maintenance</option>
                  <option value="Plumbing">Plumbing</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Security">Security</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Subject Title</Label>
                <Input required placeholder="Brief title of the issue" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Detailed Description</Label>
                <textarea 
                  required 
                  rows={4}
                  className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  placeholder="Provide all relevant details..."
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
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
        ) : complaints.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
            <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No complaints filed</h3>
            <p className="text-sm text-slate-500 mt-1">If you face any issues, you can raise a ticket here.</p>
          </div>
        ) : (
          complaints.map(complaint => (
            <Card key={complaint._id}>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{complaint.title}</h3>
                      <Badge variant="outline" className="text-xs bg-slate-50 text-slate-500">{complaint.category}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{complaint.description}</p>
                    <div className="text-xs text-slate-400 pt-2 flex items-center gap-1.5 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      Filed on: {new Date(complaint.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="sm:text-right shrink-0">
                    <p className="text-xs text-slate-500 mb-1.5 uppercase font-semibold tracking-wider">Status</p>
                    <Badge variant={
                      complaint.status === 'Resolved' ? 'success' : 
                      complaint.status === 'Closed' ? 'secondary' : 
                      complaint.status === 'In Progress' ? 'default' : 'warning'
                    } className="text-sm px-3 py-1">
                      {complaint.status}
                    </Badge>
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

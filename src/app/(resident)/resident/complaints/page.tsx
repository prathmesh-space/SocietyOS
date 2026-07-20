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
        let errorMsg = res.error || 'Failed to file complaint';
        if (res.details) {
          errorMsg += '\n\n' + Object.values(res.details).map(arr => Array.isArray(arr) ? arr.join(', ') : arr).join('\n');
        }
        alert(errorMsg);
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
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-10 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-playfair font-semibold text-forest">Helpdesk</h1>
          <p className="text-lg text-forest/70 mt-2">File and track complaints directly with the committee.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-5 h-5" />
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

            <form onSubmit={handleFileComplaint} className="space-y-6 py-4">
              <div className="space-y-3">
                <Label>Category</Label>
                <select 
                  className="flex h-12 w-full rounded-full border border-stone bg-clay-light/30 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
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
              <div className="space-y-3">
                <Label>Subject Title</Label>
                <Input required placeholder="Brief title of the issue" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="space-y-3">
                <Label>Detailed Description</Label>
                <textarea 
                  required 
                  minLength={10}
                  rows={4}
                  className="flex w-full rounded-3xl border border-stone bg-clay-light/30 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                  placeholder="Provide all relevant details..."
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})} 
                />
              </div>
              <DialogFooter className="pt-6">
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2, 3].map(i => <div key={i} className="h-40 bg-clay-light animate-pulse rounded-3xl" />)}
          </div>
        ) : complaints.length === 0 ? (
          <div className="text-center py-20 bg-white border border-stone rounded-3xl shadow-soft-default">
            <MessageSquare className="w-16 h-16 text-sage/50 mx-auto mb-6" />
            <h3 className="text-xl font-playfair font-semibold text-forest">No complaints filed</h3>
            <p className="text-forest/70 mt-2">If you face any issues, you can raise a ticket here.</p>
          </div>
        ) : (
          complaints.map(complaint => (
            <Card key={complaint._id} variant="full">
              <CardContent className="p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <h3 className="text-2xl font-playfair font-semibold text-forest">{complaint.title}</h3>
                      <Badge variant="outline" className="bg-clay-light text-forest border-stone">{complaint.category}</Badge>
                    </div>
                    <p className="text-forest/80 whitespace-pre-wrap leading-relaxed">{complaint.description}</p>
                    <div className="text-sm text-forest/50 pt-4 flex items-center gap-2 font-medium">
                      <Clock className="w-4 h-4" />
                      Filed on: {new Date(complaint.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="sm:text-right shrink-0">
                    <p className="text-xs text-forest/50 mb-2 uppercase tracking-widest font-semibold">Status</p>
                    <Badge variant={
                      complaint.status === 'Resolved' ? 'success' : 
                      complaint.status === 'Closed' ? 'secondary' : 
                      complaint.status === 'In Progress' ? 'default' : 'warning'
                    } className="text-sm px-4 py-1.5 rounded-full">
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

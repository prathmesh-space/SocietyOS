'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Plus, Copy, ExternalLink, Activity, Ban } from 'lucide-react';
import Link from 'next/link';

interface Society {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  registrationNumber: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export default function SuperAdminDashboard() {
  const [societies, setSocieties] = useState<Society[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    registrationNumber: '',
    adminName: '',
    adminEmail: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<{ link: string; token: string } | null>(null);

  useEffect(() => {
    fetchSocieties();
  }, []);

  const fetchSocieties = async () => {
    try {
      const res = await apiClient<{ societies: Society[] }>('/api/superadmin/societies');
      if ('data' in res) {
        setSocieties(res.data.societies);
      }
    } catch (err) {
      console.error('Failed to load societies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSociety = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    try {
      const res = await apiClient<{ activationLink: string; activationToken: string }>('/api/superadmin/societies', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      if ('error' in res) {
        setError(res.error || 'Failed to create society');
      } else {
        setSuccessData({
          link: window.location.origin + res.data.activationLink,
          token: res.data.activationToken,
        });
        fetchSocieties();
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (successData) {
      navigator.clipboard.writeText(successData.link);
      alert('Activation link copied to clipboard!');
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Societies</h1>
          <p className="text-slate-500 mt-1">Manage and onboard multi-tenant housing societies.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSuccessData(null); // reset on close
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Onboard Society
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Onboard New Society</DialogTitle>
              <DialogDescription>
                Create a new society and generate an activation link for the first admin.
              </DialogDescription>
            </DialogHeader>

            {successData ? (
              <div className="py-6 space-y-4 text-center">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Society Created Successfully!</h3>
                <p className="text-sm text-slate-500">
                  Share this activation link with the society&apos;s primary admin to complete their setup.
                </p>
                <div className="flex items-center gap-2 mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <Input readOnly value={successData.link} className="bg-transparent border-none focus-visible:ring-0 px-0 h-auto" />
                  <Button size="icon" variant="outline" onClick={handleCopyLink} title="Copy link">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSociety} className="space-y-4 py-4">
                {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Society Name</Label>
                    <Input id="name" required placeholder="e.g. Sunshine Apartments" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" required placeholder="123 Main St" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" required value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" required value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Reg Number (Optional)</Label>
                    <Input id="registrationNumber" value={formData.registrationNumber} onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})} />
                  </div>
                  
                  <div className="col-span-2 mt-4 mb-2">
                    <h4 className="text-sm font-semibold text-slate-900 border-b pb-2">First Admin Details</h4>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Admin Name</Label>
                    <Input id="adminName" required value={formData.adminName} onChange={(e) => setFormData({...formData, adminName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input id="adminEmail" type="email" required value={formData.adminEmail} onChange={(e) => setFormData({...formData, adminEmail: e.target.value})} />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Society'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Societies</CardTitle>
          <CardDescription>A list of all onboarded housing societies in the system.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-md" />)}
            </div>
          ) : societies.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No societies found</h3>
              <p className="text-slate-500 mt-1">Get started by onboarding a new society.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Society Name</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {societies.map((society) => (
                  <TableRow key={society._id}>
                    <TableCell className="font-medium">{society.name}</TableCell>
                    <TableCell>{society.city}, {society.state}</TableCell>
                    <TableCell>
                      <Badge variant={society.status === 'active' ? 'success' : 'warning'}>
                        {society.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>{new Date(society.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/superadmin/societies/${society._id}`}>
                        <Button variant="ghost" size="sm" className="gap-2">
                          View Details <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

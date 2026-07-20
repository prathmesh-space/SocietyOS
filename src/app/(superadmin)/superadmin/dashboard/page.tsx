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
          <h1 className="text-3xl font-semibold tracking-tight text-forest">Societies</h1>
          <p className="text-forest/70 font-medium mt-1">Manage and onboard multi-tenant housing societies.</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) setSuccessData(null); // reset on close
        }}>
          <DialogTrigger asChild>
            <Button expression="compact" className="gap-2">
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
                <div className="w-16 h-16 bg-sage/10 text-sage-text rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-semibold text-forest">Society Created Successfully!</h3>
                <p className="text-sm text-forest/70">
                  Share this activation link with the society&apos;s primary admin to complete their setup.
                </p>
                <div className="flex items-center gap-2 mt-4 p-3 bg-clay-light/50 rounded-md border border-stone">
                  <Input readOnly value={successData.link} className="bg-transparent border-none focus-visible:ring-0 px-0 h-auto text-forest" />
                  <Button expression="compact" size="icon" variant="outline" onClick={handleCopyLink} title="Copy link" className="border-stone text-forest hover:bg-clay-light">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateSociety} className="space-y-4 py-4">
                {error && <div className="p-3 bg-terracotta/10 text-terracotta text-sm rounded-md border border-terracotta/20">{error}</div>}
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="name">Society Name</Label>
                    <Input id="name" required placeholder="e.g. Sunshine Apartments" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="h-9 rounded-md border-stone" />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" required placeholder="123 Main St" value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="h-9 rounded-md border-stone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input id="city" required value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} className="h-9 rounded-md border-stone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" required value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} className="h-9 rounded-md border-stone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode</Label>
                    <Input id="pincode" required value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} className="h-9 rounded-md border-stone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="registrationNumber">Reg Number (Optional)</Label>
                    <Input id="registrationNumber" value={formData.registrationNumber} onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})} className="h-9 rounded-md border-stone" />
                  </div>
                  
                  <div className="col-span-2 mt-4 mb-2">
                    <h4 className="text-sm font-semibold text-forest border-b border-stone pb-2">First Admin Details</h4>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminName">Admin Name</Label>
                    <Input id="adminName" required value={formData.adminName} onChange={(e) => setFormData({...formData, adminName: e.target.value})} className="h-9 rounded-md border-stone" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input id="adminEmail" type="email" required value={formData.adminEmail} onChange={(e) => setFormData({...formData, adminEmail: e.target.value})} className="h-9 rounded-md border-stone" />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                  <Button expression="compact" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Society'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card variant="compact">
        <CardHeader className="border-b border-stone pb-4">
          <CardTitle>All Societies</CardTitle>
          <CardDescription>A list of all onboarded housing societies in the system.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {[1, 2, 3].map(i => <div key={i} className="h-12 bg-clay-light animate-pulse rounded-md" />)}
            </div>
          ) : societies.length === 0 ? (
            <div className="text-center py-16">
              <Building2 className="w-12 h-12 text-forest/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-forest">No societies found</h3>
              <p className="text-forest/60 mt-1">Get started by onboarding a new society.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-clay-light/30">
                <TableRow className="border-stone hover:bg-transparent">
                  <TableHead className="text-forest font-semibold">Society Name</TableHead>
                  <TableHead className="text-forest font-semibold">Location</TableHead>
                  <TableHead className="text-forest font-semibold">Status</TableHead>
                  <TableHead className="text-forest font-semibold">Created</TableHead>
                  <TableHead className="text-right text-forest font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {societies.map((society) => (
                  <TableRow key={society._id} className="border-stone hover:bg-clay-light/20 transition-colors">
                    <TableCell className="font-semibold text-forest">{society.name}</TableCell>
                    <TableCell className="text-forest/80 font-medium">{society.city}, {society.state}</TableCell>
                    <TableCell>
                      <Badge variant={society.status === 'active' ? 'success' : 'warning'} className="rounded-sm font-semibold">
                        {society.status === 'active' ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-forest/70 font-medium text-sm">{new Date(society.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/superadmin/societies/${society._id}`}>
                        <Button expression="compact" variant="ghost" size="sm" className="gap-2 text-forest hover:bg-clay-light hover:text-forest">
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

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building2, Phone, User, Activity, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface EmergencyContact {
  name: string;
  phone: string;
  role: string;
}

interface Society {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  active: boolean;
  emergencyContacts: EmergencyContact[];
  createdAt: string;
}

export default function SocietyDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [society, setSociety] = useState<Society | null>(null);
  const [stats, setStats] = useState<{ unitCount: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSociety();
  }, [params.id]);

  const fetchSociety = async () => {
    try {
      const res = await apiClient<{ society: Society; stats: { unitCount: number } }>(`/api/superadmin/societies/${params.id}`);
      if ('data' in res) {
        setSociety(res.data.society);
        setStats(res.data.stats);
      } else {
        setError(res.error || 'Failed to load society');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!society) return;
    setIsUpdating(true);
    setError('');

    try {
      if (society.active) {
        // Deactivate via DELETE (soft delete)
        const res = await apiClient(`/api/superadmin/societies/${society._id}`, { method: 'DELETE' });
        if ('error' in res) throw new Error(res.error);
      } else {
        // Activate via PATCH
        const res = await apiClient(`/api/superadmin/societies/${society._id}`, {
          method: 'PATCH',
          body: JSON.stringify({ active: true }),
        });
        if ('error' in res) throw new Error(res.error);
      }
      // Refresh
      await fetchSociety();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-clay-light rounded-md"></div>
        <div className="h-48 bg-clay-light rounded-xl"></div>
        <div className="h-48 bg-clay-light rounded-xl"></div>
      </div>
    );
  }

  if (error && !society) {
    return (
      <div className="max-w-4xl mx-auto text-center py-12">
        <AlertCircle className="w-12 h-12 text-terracotta mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-forest">Error Loading Society</h2>
        <p className="text-forest/70 font-medium mt-2 mb-6">{error}</p>
        <Link href="/superadmin/dashboard">
          <Button expression="compact" variant="outline" className="border-stone text-forest hover:bg-clay-light">Go Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  if (!society) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <Link href="/superadmin/dashboard">
          <Button expression="compact" variant="ghost" size="icon" className="text-forest/50 hover:bg-clay-light hover:text-forest">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-forest">{society.name}</h1>
            <Badge variant={society.active ? 'success' : 'warning'} className="rounded-sm font-semibold">
              {society.active ? 'Active' : 'Inactive'}
            </Badge>
          </div>
          <p className="text-sm text-forest/70 font-medium flex items-center gap-2 mt-1">
            <Building2 className="w-4 h-4" /> {society.city}, {society.state}
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-terracotta/10 text-terracotta rounded-md flex items-start gap-3 border border-terracotta/20">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="font-medium text-sm">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card variant="compact">
            <CardHeader className="border-b border-stone pb-4">
              <CardTitle>Society Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-forest/70">Full Address</p>
                  <p className="font-semibold text-forest">{society.address}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-forest/70">Pincode</p>
                  <p className="font-semibold text-forest">{society.pincode}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-forest/70">Created On</p>
                  <p className="font-semibold text-forest">{new Date(society.createdAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-forest/70">Total Units</p>
                  <p className="font-semibold text-forest">{stats?.unitCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card variant="compact">
            <CardHeader className="border-b border-stone pb-4">
              <CardTitle>Emergency Contacts</CardTitle>
              <CardDescription>Required for society activation.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {society.emergencyContacts && society.emergencyContacts.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {society.emergencyContacts.map((contact, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-clay-light/20 rounded-md border border-stone">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-forest/50 shadow-sm border border-stone">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-semibold text-forest">{contact.name}</p>
                        <p className="text-xs font-semibold uppercase tracking-wider text-forest/60">{contact.role}</p>
                        <p className="text-xs text-forest/70 flex items-center gap-1 mt-0.5 font-medium">
                          <Phone className="w-3 h-3" /> {contact.phone}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 bg-clay-light/20 rounded-md border border-stone border-dashed">
                  <p className="text-sm font-medium text-forest/70">No emergency contacts configured yet.</p>
                  <p className="text-xs text-terracotta/80 font-semibold mt-1">Society cannot be activated until admin configures contacts.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="compact">
            <CardHeader className="border-b border-stone pb-4">
              <CardTitle>Activation Status</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="p-4 bg-clay-light/20 rounded-md border border-stone">
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${society.active ? 'bg-sage/10 text-sage-text' : 'bg-clay-light text-forest/50'}`}>
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-forest">{society.active ? 'System Active' : 'System Suspended'}</p>
                      <p className="text-xs font-medium text-forest/70">{society.active ? 'Residents can login' : 'Access blocked'}</p>
                    </div>
                  </div>
                </div>

                <Button 
                  expression="compact"
                  className="w-full" 
                  variant={society.active ? 'destructive' : 'default'}
                  onClick={handleToggleStatus}
                  disabled={isUpdating || (!society.active && (!society.emergencyContacts || society.emergencyContacts.length === 0))}
                >
                  {isUpdating ? 'Updating...' : society.active ? 'Suspend Society' : 'Activate Society'}
                </Button>
                {!society.active && (!society.emergencyContacts || society.emergencyContacts.length === 0) && (
                  <p className="text-xs text-center font-semibold text-terracotta/80 mt-2">
                    Requires at least 1 emergency contact
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

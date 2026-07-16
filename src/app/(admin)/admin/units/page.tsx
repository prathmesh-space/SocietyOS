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
import { Plus, Home, Upload } from 'lucide-react';

interface Resident {
  _id: string;
  name: string;
  email: string;
  phone: string;
}

interface Unit {
  _id: string;
  id?: string;
  unitNumber: string;
  block: string;
  type: string;
  floor: number;
  squareFeet: number;
  active: boolean;
  primaryResidentId?: Resident;
}

export default function AdminUnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    unitNumber: '',
    block: 'A',
    type: '3BHK',
    floor: 1,
    squareFeet: 1200,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUnits();
  }, [search]);

  const fetchUnits = async () => {
    try {
      const url = `/api/admin/units?limit=100${search ? `&search=${search}` : ''}`;
      const res = await apiClient<{ units: Unit[] }>(url);
      if ('data' in res) {
        setUnits(res.data.units);
      }
    } catch (err) {
      console.error('Failed to load units:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await apiClient<{ unit: Unit }>('/api/admin/units', {
        method: 'POST',
        body: JSON.stringify({
          ...formData,
          floor: Number(formData.floor),
          squareFeet: Number(formData.squareFeet),
        }),
      });

      if ('error' in res) {
        setError(res.error || 'Failed to create unit');
      } else {
        setIsDialogOpen(false);
        setFormData({ unitNumber: '', block: 'A', type: '3BHK', floor: 1, squareFeet: 1200 });
        fetchUnits();
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Units Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Manage all flats/apartments in your society.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mock Bulk Import */}
          <Button variant="outline" className="gap-2">
            <Upload className="w-4 h-4" />
            Bulk Import
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Unit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Unit</DialogTitle>
                <DialogDescription>
                  Register a new flat in the society. Residents can claim this unit later.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateUnit} className="space-y-4 py-4">
                {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unitNumber">Unit Number</Label>
                    <Input id="unitNumber" required placeholder="e.g. 101" value={formData.unitNumber} onChange={(e) => setFormData({...formData, unitNumber: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="block">Block/Tower</Label>
                    <Input id="block" required placeholder="e.g. A" value={formData.block} onChange={(e) => setFormData({...formData, block: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="floor">Floor</Label>
                    <Input id="floor" type="number" required value={formData.floor} onChange={(e) => setFormData({...formData, floor: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Configuration</Label>
                    <Input id="type" required placeholder="e.g. 2BHK" value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})} />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label htmlFor="squareFeet">Size (Sq. Ft.)</Label>
                    <Input id="squareFeet" type="number" required value={formData.squareFeet} onChange={(e) => setFormData({...formData, squareFeet: Number(e.target.value)})} />
                  </div>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Unit'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle>All Units</CardTitle>
            <CardDescription>A complete list of registered units.</CardDescription>
          </div>
          <div className="w-72">
            <Input 
              placeholder="Search by unit number..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)}
              className="h-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-slate-100 animate-pulse rounded-md" />)}
            </div>
          ) : units.length === 0 ? (
            <div className="text-center py-12">
              <Home className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No units found</h3>
              <p className="text-sm text-slate-500 mt-1">Add units to your society to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unit</TableHead>
                  <TableHead>Configuration</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Occupancy Status</TableHead>
                  <TableHead>Primary Resident</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {units.map((unit) => (
                  <TableRow key={unit._id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-1">
                        <span>{unit.block}-{unit.unitNumber}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 font-normal">Floor {unit.floor}</span>
                          <span className="text-xs text-slate-300 font-normal">•</span>
                          <span 
                            className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1 cursor-pointer hover:bg-slate-200 transition-colors border border-slate-200"
                            onClick={() => {
                              navigator.clipboard.writeText(unit.id || unit._id);
                              alert('Unit ID copied to clipboard!');
                            }}
                            title="Click to copy Unit ID"
                          >
                            ID: {unit.id || unit._id}
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{unit.type}</TableCell>
                    <TableCell>{unit.squareFeet} sq.ft</TableCell>
                    <TableCell>
                      <Badge variant={unit.primaryResidentId ? 'success' : 'secondary'}>
                        {unit.primaryResidentId ? 'Occupied' : 'Vacant'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {unit.primaryResidentId ? (
                        <div>
                          <p className="text-sm font-medium">{unit.primaryResidentId.name}</p>
                          <p className="text-xs text-slate-500">{unit.primaryResidentId.phone || unit.primaryResidentId.email}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">—</span>
                      )}
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

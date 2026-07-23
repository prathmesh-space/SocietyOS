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
import { FileText, Play, FileCheck2 } from 'lucide-react';

interface Unit {
  _id: string;
  unitNumber: string;
  block: string;
}

interface Bill {
  _id: string;
  unitId: Unit;
  billingPeriod: string;
  amount: number;
  lateFeeAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'void';
  dueDate: string;
}

export default function AdminBillsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
    dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().slice(0, 10), // +7 days
    defaultAmount: 2500,
  });
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await apiClient<{ bills: Bill[] }>('/api/admin/bills?limit=100');
      if ('data' in res) {
        setBills(res.data.bills);
      }
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      const payload = {
        billingPeriod: formData.month,
        dueDate: formData.dueDate,
        overrides: [],
      };
      
      const res = await apiClient('/api/admin/bills/generate', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if ('error' in res) {
        alert(res.error || 'Failed to generate bills');
      } else {
        alert('Bills generated successfully!');
        setIsGenerateOpen(false);
        fetchBills();
      }
    } catch (err) {
      alert('An unexpected error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-forest mb-1">Billing & Payments</h1>
          <p className="text-sm text-forest/70 font-medium">Generate maintenance bills and track payments.</p>
        </div>

        <Dialog open={isGenerateOpen} onOpenChange={setIsGenerateOpen}>
          <DialogTrigger asChild>
            <Button expression="compact" className="gap-2 bg-forest hover:bg-forest/90 text-alabaster">
              <Play className="w-4 h-4 fill-current" />
              Generate Bills
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Monthly Bills</DialogTitle>
              <DialogDescription>
                This will create a maintenance bill for every active unit in the society.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleGenerate} className="space-y-4 py-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Billing Month</Label>
                  <Input type="month" required value={formData.month} onChange={(e) => setFormData({...formData, month: e.target.value})} className="h-9 rounded-md" />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" required value={formData.dueDate} onChange={(e) => setFormData({...formData, dueDate: e.target.value})} className="h-9 rounded-md" />
                </div>
                <div className="p-4 bg-sage/10 border border-sage-text/20 rounded-md text-sm text-forest">
                  <p className="font-semibold mb-1 text-sage-text">Base amount is determined by:</p>
                  <ul className="list-disc list-inside space-y-1 text-forest/80">
                    <li>Unit-specific flat rate (if configured)</li>
                    <li>Society default amount</li>
                  </ul>
                </div>
              </div>
              <DialogFooter className="pt-4">
                <Button type="submit" expression="compact" disabled={isGenerating}>
                  {isGenerating ? 'Generating...' : 'Confirm Generation'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-4">
          <Card variant="compact">
            <CardHeader className="pb-4 border-b border-stone">
              <CardTitle>Recent Bills</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="space-y-4 p-4">
                  {[1, 2, 3, 4].map(i => <div key={i} className="h-12 bg-clay-light animate-pulse rounded-md" />)}
                </div>
              ) : bills.length === 0 ? (
                <div className="text-center py-16">
                  <FileCheck2 className="w-12 h-12 text-forest/20 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-forest">No bills generated yet</h3>
                  <p className="text-sm text-forest/50 mt-1">Click the button above to generate this month&apos;s bills.</p>
                </div>
              ) : (
                <div className="overflow-x-auto w-full pb-2">
                  <Table className="min-w-[800px]">
                  <TableHeader className="bg-clay-light/30">
                    <TableRow className="border-stone hover:bg-transparent">
                      <TableHead className="text-forest font-semibold">Unit</TableHead>
                      <TableHead className="text-forest font-semibold">Month</TableHead>
                      <TableHead className="text-forest font-semibold">Amount</TableHead>
                      <TableHead className="text-forest font-semibold">Due Date</TableHead>
                      <TableHead className="text-forest font-semibold">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bills.map((b) => (
                      <TableRow key={b._id} className="border-stone hover:bg-clay-light/20">
                        <TableCell className="font-semibold text-forest">
                          {b.unitId?.block}-{b.unitId?.unitNumber}
                        </TableCell>
                        <TableCell className="text-forest/80">{b.billingPeriod}</TableCell>
                        <TableCell>
                          <div className="font-medium text-forest">₹{b.amount}</div>
                          {b.lateFeeAmount > 0 && <div className="text-xs text-terracotta mt-0.5">+₹{b.lateFeeAmount} late fee</div>}
                        </TableCell>
                        <TableCell className="text-forest/80">{new Date(b.dueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={b.status.toLowerCase() === 'paid' ? 'success' : b.status.toLowerCase() === 'overdue' ? 'destructive' : 'warning'} className="rounded-sm text-xs font-semibold px-2 py-0.5">
                            {b.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

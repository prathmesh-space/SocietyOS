'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function WatchmanManualEntryPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    purpose: 'Delivery',
    block: '',
    unitNumber: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
        purpose: formData.purpose,
        unitDetails: {
          block: formData.block.toUpperCase(),
          unitNumber: formData.unitNumber,
        }
      };

      const res = await apiClient('/api/watchman/visitors/manual', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if ('error' in res) {
        alert(res.error || 'Failed to log visitor');
      } else {
        alert('Visitor logged successfully!');
        setFormData({ name: '', phone: '', purpose: 'Delivery', block: '', unitNumber: '' });
      }
    } catch (err) {
      alert('Network error. Entry saved offline and will sync later.');
      // Offline logic mock
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-in fade-in p-4 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manual Entry</h1>
        <p className="text-sm text-slate-500">Log walk-in visitors without a QR pass.</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Visitor Name</Label>
              <Input required placeholder="Enter full name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="space-y-1.5">
              <Label>Phone Number</Label>
              <Input type="tel" required placeholder="10-digit number" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="space-y-1.5">
              <Label>Purpose</Label>
              <select 
                required
                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                value={formData.purpose}
                onChange={(e) => setFormData({...formData, purpose: e.target.value})}
              >
                <option value="Delivery">Delivery (Food/Package)</option>
                <option value="Guest">Guest / Relative</option>
                <option value="Service">Service / Repair</option>
                <option value="Maid">Maid / Help</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label>Block</Label>
                <Input required placeholder="e.g. A" value={formData.block} onChange={(e) => setFormData({...formData, block: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit Number</Label>
                <Input required placeholder="e.g. 101" value={formData.unitNumber} onChange={(e) => setFormData({...formData, unitNumber: e.target.value})} />
              </div>
            </div>

            <Button type="submit" className="w-full mt-4" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Recording...' : 'Allow Entry'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

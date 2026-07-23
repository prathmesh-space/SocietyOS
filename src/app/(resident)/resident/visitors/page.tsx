'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import QRCode from 'qrcode';
import { Clock, Download, Share2, ArrowLeft } from 'lucide-react';

export default function ResidentVisitorsPage() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    purpose: '',
    expectedArrival: '',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<{ token: string; visitorName: string; validUntil: string } | null>(null);
  const [qrImageUrl, setQrImageUrl] = useState('');

  useEffect(() => {
    if (qrCodeData?.token) {
      QRCode.toDataURL(qrCodeData.token, { width: 300, margin: 2, color: { dark: '#242a22', light: '#ffffff' } })
        .then(url => setQrImageUrl(url))
        .catch(err => console.error('Failed to generate QR code visual', err));
    }
  }, [qrCodeData]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      const arrival = formData.expectedArrival ? new Date(formData.expectedArrival) : new Date();
      const endWindow = new Date(arrival.getTime() + 12 * 60 * 60 * 1000); // 12 hour default window

      const payload = {
        visitorName: formData.name,
        startWindow: arrival.toISOString(),
        endWindow: endWindow.toISOString(),
      };

      const res = await apiClient<{ token: string; endWindow: string }>('/api/resident/visitors/pre-approve', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if ('error' in res) {
        alert(res.error || 'Failed to pre-approve visitor');
      } else {
        setQrCodeData({
          token: res.data.token,
          validUntil: res.data.endWindow,
          visitorName: formData.name,
        });
      }
    } catch (err) {
      alert('An unexpected error occurred.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!qrImageUrl) return;
    const a = document.createElement('a');
    a.href = qrImageUrl;
    a.download = `Visitor_QR_${qrCodeData?.visitorName.replace(/\s+/g, '_')}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-2xl mx-auto space-y-6 md:space-y-8 py-4 md:py-8">
      <div>
        <h1 className="text-4xl font-playfair font-semibold text-forest">Pre-approve Visitor</h1>
        <p className="text-lg text-forest/70 mt-2">Generate a secure gate pass QR code for your guests.</p>
      </div>

      {qrCodeData ? (
        <Card variant="full" className="overflow-hidden text-center border-0 shadow-soft-lg">
          <div className="bg-forest p-4 md:p-6 text-alabaster">
            <h3 className="font-playfair font-semibold text-xl md:text-2xl tracking-wide">Gate Pass Approved</h3>
            <p className="text-alabaster/70 text-sm mt-1 uppercase tracking-widest">For {qrCodeData.visitorName}</p>
          </div>
          <CardContent className="p-6 md:p-8 space-y-6 md:space-y-8 bg-clay-light/20">
            <div className="bg-white p-4 md:p-6 rounded-3xl inline-block shadow-soft-md border border-stone">
              {qrImageUrl ? (
                <img src={qrImageUrl} alt="QR Code" className="w-56 h-56 mx-auto rounded-xl" />
              ) : (
                <div className="w-56 h-56 mx-auto bg-clay-light animate-pulse rounded-xl" />
              )}
            </div>
            
            <div className="bg-sage/10 text-forest p-4 rounded-full text-sm flex items-center justify-center gap-3 font-medium mx-auto max-w-sm">
              <Clock className="w-5 h-5 text-sage-text" />
              Valid until: {new Date(qrCodeData.validUntil).toLocaleString()}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleDownload} className="gap-2 w-full sm:w-auto">
                <Download className="w-4 h-4" /> Download QR
              </Button>
              <Button variant="outline" onClick={() => setQrCodeData(null)} className="w-full sm:w-auto bg-white">
                Generate Another
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card variant="full">
          <CardHeader>
            <CardTitle>Visitor Details</CardTitle>
            <CardDescription>Fill in the details to generate a one-time entry pass.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerate} className="space-y-6">
              <div className="space-y-3">
                <Label>Visitor Name</Label>
                <Input required placeholder="e.g. Rahul Sharma" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-3">
                <Label>Phone Number (Optional)</Label>
                <Input type="tel" placeholder="+91..." value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-3">
                <Label>Purpose of Visit</Label>
                <select 
                  required
                  className="flex h-12 w-full rounded-full border border-stone bg-clay-light/30 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
                  value={formData.purpose}
                  onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                >
                  <option value="" disabled>Select purpose</option>
                  <option value="Guest">Guest / Relative</option>
                  <option value="Delivery">Delivery</option>
                  <option value="Service">Service / Repair</option>
                  <option value="Maid">Maid / Help</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-3">
                <Label>Expected Arrival Date (Optional)</Label>
                <Input type="date" value={formData.expectedArrival} onChange={(e) => setFormData({...formData, expectedArrival: e.target.value})} />
              </div>
              
              <Button type="submit" className="w-full mt-2" disabled={isGenerating}>
                {isGenerating ? 'Generating Pass...' : 'Generate QR Pass'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

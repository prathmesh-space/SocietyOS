'use client';

import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertCircle, Maximize } from 'lucide-react';

export default function WatchmanScanPage() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState<{ success: boolean; message: string; visitorName?: string } | null>(null);
  
  useEffect(() => {
    // Only initialize scanner if we haven't scanned anything yet
    if (scanResult) return;

    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      /* verbose= */ false
    );

    scanner.render(
      (decodedText) => {
        setScanResult(decodedText);
        scanner.clear(); // Stop scanning once we get a result
        processQRToken(decodedText);
      },
      (error) => {
        // ignore continuous scanning errors
      }
    );

    return () => {
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [scanResult]);

  const processQRToken = async (token: string) => {
    setIsProcessing(true);
    try {
      const res = await apiClient<{ message: string, visitor: { name: string } }>('/api/watchman/visitors/scan', {
        method: 'POST',
        body: JSON.stringify({ qrToken: token }),
      });

      if ('error' in res) {
        setResponse({ success: false, message: res.error || 'Invalid or Expired QR Code' });
      } else {
        setResponse({ success: true, message: 'Access Granted', visitorName: res.data.visitor.name });
      }
    } catch (err) {
      setResponse({ success: false, message: 'Network Error while verifying QR' });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setResponse(null);
  };

  return (
    <div className="animate-in fade-in p-4 h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Scan Pass</h1>
        <p className="text-slate-500 text-sm">Scan resident-approved QR codes for quick entry.</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {!scanResult ? (
          <div className="w-full max-w-sm">
            <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
              <div id="reader" className="w-full rounded-xl overflow-hidden [&>div]:border-none [&>div>video]:rounded-xl"></div>
              {/* Add a scanning overlay animation here if desired */}
            </div>
          </div>
        ) : (
          <Card className={`w-full max-w-sm border-2 ${response?.success ? 'border-emerald-500 bg-emerald-50/50' : 'border-red-500 bg-red-50/50'}`}>
            <CardContent className="p-8 text-center space-y-4">
              {isProcessing ? (
                <div className="py-8">
                  <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="font-semibold text-slate-700">Verifying Pass...</p>
                </div>
              ) : response?.success ? (
                <div className="animate-in zoom-in duration-300">
                  <CheckCircle2 className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-emerald-700 mb-1">Access Granted</h2>
                  <p className="text-emerald-600 font-medium">{response.visitorName}</p>
                </div>
              ) : (
                <div className="animate-in shake duration-300">
                  <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-red-700 mb-1">Access Denied</h2>
                  <p className="text-red-600 font-medium">{response?.message}</p>
                </div>
              )}

              {!isProcessing && (
                <Button className="w-full mt-6" onClick={resetScanner}>
                  Scan Next Visitor
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

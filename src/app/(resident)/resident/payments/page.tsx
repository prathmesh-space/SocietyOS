'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, CheckCircle2, AlertCircle } from 'lucide-react';
import Script from 'next/script';

interface Bill {
  _id: string;
  billingPeriod: string;
  amount: number;
  lateFeeAmount: number;
  status: 'pending' | 'paid' | 'overdue' | 'void';
  dueDate: string;
}

export default function ResidentPaymentsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await apiClient<{ bills: Bill[] }>('/api/resident/bills');
      if ('data' in res) {
        setBills(res.data.bills);
      }
    } catch (err) {
      console.error('Failed to load bills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePay = async (billId: string) => {
    setIsProcessing(billId);
    try {
      // Create Razorpay Order
      const res = await apiClient<{ orderId: string, amount: number, keyId: string }>('/api/resident/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ billId }),
      });

      if ('error' in res) {
        alert(res.error);
        setIsProcessing(null);
        return;
      }

      // Initialize Razorpay
      const options = {
        key: res.data.keyId,
        amount: res.data.amount,
        currency: 'INR',
        name: 'SocietyOS',
        description: 'Maintenance Bill Payment',
        order_id: res.data.orderId,
        handler: function (response: any) {
          // Success handler - webhook handles actual DB update, we just reload
          alert('Payment Successful! Processing receipt...');
          setTimeout(() => {
            fetchBills();
          }, 3000);
        },
        prefill: {
          name: 'Resident', // Can prefill dynamically
        },
        theme: {
          color: '#55684D', // Botanical Forest
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        alert(`Payment Failed: ${response.error?.description || 'Please try again.'}`);
      });
      rzp.open();
    } catch (err) {
      alert('An unexpected error occurred while initiating payment.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-6 md:space-y-10 py-4 md:py-8">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div>
        <h1 className="text-4xl font-playfair font-semibold text-forest">Bills & Payments</h1>
        <p className="text-lg text-forest/70 mt-2">View your monthly maintenance bills and securely pay online.</p>
      </div>

      <div className="grid gap-6">
        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map(i => <div key={i} className="h-40 bg-clay-light animate-pulse rounded-3xl" />)}
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-20 bg-white border border-stone rounded-3xl shadow-soft-default">
            <FileText className="w-16 h-16 text-sage/50 mx-auto mb-6" />
            <h3 className="text-xl font-playfair font-semibold text-forest">No Bills Found</h3>
            <p className="text-forest/70 mt-2">You don&apos;t have any maintenance bills yet.</p>
          </div>
        ) : (
          bills.map((bill) => (
            <Card key={bill._id} variant="full" className={bill.status === 'overdue' ? 'border-terracotta bg-terracotta/5' : ''}>
              <CardContent className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 md:gap-8">
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                    <h3 className="font-playfair font-semibold text-xl md:text-2xl text-forest">Maintenance: {bill.billingPeriod}</h3>
                    <Badge variant={bill.status === 'paid' ? 'success' : bill.status === 'overdue' ? 'destructive' : 'warning'} className="px-3 py-1 w-fit">
                      {bill.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 md:gap-x-12 gap-y-2 md:gap-y-3 text-sm">
                    <div>
                      <span className="text-forest/70">Base Amount:</span>
                      <span className="font-medium text-forest ml-2 tracking-wide">₹{bill.amount}</span>
                    </div>
                    <div>
                      <span className="text-forest/70">Late Fee:</span>
                      <span className="font-medium text-terracotta ml-2 tracking-wide">₹{bill.lateFeeAmount}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-forest/70">Due Date:</span>
                      <span className={`font-medium ml-2 ${bill.status === 'overdue' ? 'text-terracotta' : 'text-forest'}`}>
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-4 border-t md:border-t-0 md:border-l border-stone pt-6 md:pt-0 md:pl-8 min-w-[200px]">
                  <div className="text-left md:text-right">
                    <p className="text-xs text-forest/50 mb-1 uppercase tracking-widest font-semibold">Total Payable</p>
                    <p className="text-4xl font-playfair font-semibold text-forest">₹{bill.amount + bill.lateFeeAmount}</p>
                  </div>
                  
                  {bill.status === 'paid' ? (
                    <div className="flex items-center gap-2 text-forest bg-sage/20 px-4 py-2.5 rounded-full text-sm font-medium">
                      <CheckCircle2 className="w-5 h-5 text-forest" /> Paid Successfully
                    </div>
                  ) : (
                    <Button 
                      className="w-full gap-2 shadow-soft-md hover:shadow-soft-lg" 
                      onClick={() => handlePay(bill._id)}
                      disabled={isProcessing === bill._id}
                    >
                      {isProcessing === bill._id ? 'Processing...' : 'Pay Now'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

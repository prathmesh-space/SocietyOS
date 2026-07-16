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
          color: '#4f46e5',
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
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bills & Payments</h1>
        <p className="text-sm text-slate-500 mt-1">View your monthly maintenance bills and pay online.</p>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl" />)}
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-16 bg-white border border-slate-200 rounded-xl shadow-sm">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900">No Bills Found</h3>
            <p className="text-sm text-slate-500 mt-1">You don&apos;t have any maintenance bills yet.</p>
          </div>
        ) : (
          bills.map((bill) => (
            <Card key={bill._id} className={bill.status === 'overdue' ? 'border-red-200 bg-red-50/10' : ''}>
              <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-lg text-slate-900">Maintenance: {bill.billingPeriod}</h3>
                    <Badge variant={bill.status === 'paid' ? 'success' : bill.status === 'overdue' ? 'destructive' : 'warning'}>
                      {bill.status.toUpperCase()}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                    <div>
                      <span className="text-slate-500">Base Amount:</span>
                      <span className="font-medium ml-2">₹{bill.amount}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Late Fee:</span>
                      <span className="font-medium text-red-600 ml-2">₹{bill.lateFeeAmount}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-slate-500">Due Date:</span>
                      <span className={`font-medium ml-2 ${bill.status === 'overdue' ? 'text-red-600' : 'text-slate-900'}`}>
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3 border-t md:border-t-0 md:border-l border-slate-200 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 mb-1">Total Payable</p>
                    <p className="text-3xl font-bold text-slate-900">₹{bill.amount + bill.lateFeeAmount}</p>
                  </div>
                  
                  {bill.status === 'paid' ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-2 rounded-lg text-sm font-medium">
                      <CheckCircle2 className="w-4 h-4" /> Paid Successfully
                    </div>
                  ) : (
                    <Button 
                      className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700" 
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

'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, QrCode, Megaphone } from 'lucide-react';
import Link from 'next/link';

export default function ResidentDashboard() {
  const { user } = useAuth();

  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto space-y-12 py-8">
      {/* Welcome Hero */}
      <div className="bg-forest text-alabaster rounded-3xl p-8 sm:p-12 shadow-soft-lg relative overflow-hidden">
        {/* Decorative background circle */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sage/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
        
        <h1 className="text-4xl sm:text-5xl font-playfair font-semibold mb-4 relative z-10">
          Welcome home, <i className="font-normal">{user?.name?.split(' ')[0]}</i>.
        </h1>
        <p className="text-alabaster/80 text-lg mb-10 max-w-md relative z-10">Here is your quick overview for today.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 relative z-10">
          <Link href="/resident/payments" className="bg-alabaster/5 border border-alabaster/10 hover:bg-alabaster/10 transition-all duration-300 p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:-translate-y-1">
            <FileText className="w-6 h-6 mb-3 text-sage" />
            <span className="text-sm font-medium tracking-wide uppercase">Pay Bills</span>
          </Link>
          <Link href="/resident/visitors" className="bg-alabaster/5 border border-alabaster/10 hover:bg-alabaster/10 transition-all duration-300 p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:-translate-y-1">
            <QrCode className="w-6 h-6 mb-3 text-sage" />
            <span className="text-sm font-medium tracking-wide uppercase">Pre-approve</span>
          </Link>
          <Link href="/resident/complaints" className="bg-alabaster/5 border border-alabaster/10 hover:bg-alabaster/10 transition-all duration-300 p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:-translate-y-1">
            <MessageSquare className="w-6 h-6 mb-3 text-sage" />
            <span className="text-sm font-medium tracking-wide uppercase">Helpdesk</span>
          </Link>
          <Link href="/resident/notices" className="bg-alabaster/5 border border-alabaster/10 hover:bg-alabaster/10 transition-all duration-300 p-6 rounded-2xl flex flex-col items-center justify-center text-center hover:-translate-y-1">
            <Megaphone className="w-6 h-6 mb-3 text-sage" />
            <span className="text-sm font-medium tracking-wide uppercase">Notices</span>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
        <Card variant="full" className="md:translate-y-6">
          <CardHeader>
            <CardTitle>Recent Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-forest/70 mb-8 leading-relaxed">Check the notices tab for the latest updates and announcements from the society administration.</p>
            <Link href="/resident/notices">
              <Button variant="outline" className="w-full">View All Notices</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card variant="full">
          <CardHeader>
            <CardTitle>Pending Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-forest/70 mb-8 leading-relaxed">Stay up to date with your maintenance bills to avoid late fees. Keep your account clear.</p>
            <Link href="/resident/payments">
              <Button variant="outline" className="w-full">View Bills</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

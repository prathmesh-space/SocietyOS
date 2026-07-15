'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, MessageSquare, QrCode, Megaphone } from 'lucide-react';
import Link from 'next/link';

export default function ResidentDashboard() {
  const { user } = useAuth();

  return (
    <div className="animate-in fade-in duration-500 max-w-4xl mx-auto space-y-6">
      <div className="bg-indigo-600 text-white rounded-2xl p-6 sm:p-8 shadow-md">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome home, {user?.name?.split(' ')[0]}!</h1>
        <p className="text-indigo-100 mb-6">Here&apos;s your quick overview for today.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link href="/resident/payments" className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <FileText className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium">Pay Bills</span>
          </Link>
          <Link href="/resident/visitors" className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <QrCode className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium">Pre-approve</span>
          </Link>
          <Link href="/resident/complaints" className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <MessageSquare className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium">Helpdesk</span>
          </Link>
          <Link href="/resident/notices" className="bg-white/10 hover:bg-white/20 transition-colors p-4 rounded-xl flex flex-col items-center justify-center text-center">
            <Megaphone className="w-6 h-6 mb-2" />
            <span className="text-sm font-medium">Notices</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Check the notices tab for the latest updates from the society admin.</p>
            <Link href="/resident/notices">
              <Button variant="outline" className="mt-4 w-full">View All Notices</Button>
            </Link>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pending Dues</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-500">Stay up to date with your maintenance bills to avoid late fees.</p>
            <Link href="/resident/payments">
              <Button variant="outline" className="mt-4 w-full">View Bills</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

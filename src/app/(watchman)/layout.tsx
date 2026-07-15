'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Users, Maximize, FileEdit, RefreshCcw, LogOut } from 'lucide-react';

export default function WatchmanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'watchman')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const navigation = [
    { name: 'Inside', href: '/watchman/dashboard', icon: Users },
    { name: 'Scan QR', href: '/watchman/scan', icon: Maximize },
    { name: 'Manual', href: '/watchman/manual', icon: FileEdit },
    { name: 'Sync', href: '/watchman/sync', icon: RefreshCcw },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900 text-white h-14 flex items-center justify-between px-4 sticky top-0 z-20 shadow-md">
        <div>
          <span className="text-lg font-bold">SocietyOS</span>
          <span className="ml-2 text-xs text-slate-400">Security Gate</span>
        </div>
        <button onClick={() => logout()} className="p-2 text-slate-300 hover:text-white rounded-full">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-20 flex justify-around items-center h-16 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-slate-900' : 'text-slate-500'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-slate-100' : ''}`} />
              <span className="text-[11px] font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

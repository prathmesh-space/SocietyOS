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
    return <div className="min-h-screen flex items-center justify-center bg-alabaster"><div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const navigation = [
    { name: 'Inside', href: '/watchman/dashboard', icon: Users },
    { name: 'Scan QR', href: '/watchman/scan', icon: Maximize },
    { name: 'Manual', href: '/watchman/manual', icon: FileEdit },
    { name: 'Sync', href: '/watchman/sync', icon: RefreshCcw },
  ];

  return (
    <div className="min-h-screen bg-alabaster text-forest font-sans flex flex-col selection:bg-clay-light">
      {/* Top Header */}
      <header className="bg-forest text-alabaster h-14 flex items-center justify-between px-4 sticky top-0 z-20 shadow-md">
        <div>
          <span className="text-lg font-semibold tracking-tight">SocietyOS</span>
          <span className="ml-2 text-xs text-alabaster/70 font-medium">Security Gate</span>
        </div>
        <button onClick={() => logout()} className="p-2 text-alabaster/70 hover:text-alabaster rounded-full transition-colors hover:bg-forest/50">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-alabaster border-t border-stone z-20 flex justify-around items-center h-16 pb-safe shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-forest' : 'text-forest/50 hover:text-forest/80'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-clay-light' : ''}`} />
              <span className="text-[11px] font-semibold">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

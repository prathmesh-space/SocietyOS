'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Home, FileText, MessageSquare, QrCode, Megaphone, LogOut } from 'lucide-react';

export default function ResidentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'resident')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-alabaster"><div className="w-8 h-8 border-4 border-sage border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const navigation = [
    { name: 'Dashboard', href: '/resident/dashboard', icon: Home },
    { name: 'Payments', href: '/resident/payments', icon: FileText },
    { name: 'Complaints', href: '/resident/complaints', icon: MessageSquare },
    { name: 'Visitors', href: '/resident/visitors', icon: QrCode },
    { name: 'Notices', href: '/resident/notices', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-alabaster flex flex-col md:flex-row text-forest selection:bg-sage/30">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-stone fixed inset-y-0 z-10">
        <div className="h-16 flex items-center px-6 border-b border-stone">
          <span className="text-xl font-playfair font-semibold text-forest tracking-wide">
            Resident Portal
          </span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sage/10 text-forest'
                    : 'text-forest/70 hover:bg-clay-light hover:text-forest'
                }`}
              >
                <item.icon className={`mr-3 flex-shrink-0 w-5 h-5 ${isActive ? 'text-sage-text' : 'text-forest/40'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone">
          <div className="flex items-center px-3 py-3 rounded-xl bg-clay-light mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-forest truncate">{user.name}</p>
              <p className="text-xs text-forest/70 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            <LogOut className="mr-3 flex-shrink-0 w-5 h-5 text-red-500" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 pb-16 md:pb-0">
        {/* Top header for mobile */}
        <header className="md:hidden bg-white border-b border-stone h-14 flex items-center justify-between px-4 sticky top-0 z-20">
          <span className="text-lg font-playfair font-semibold text-forest">SocietyOS</span>
          <button onClick={() => logout()} className="p-2 text-terracotta hover:bg-terracotta/10 rounded-full">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>

      {/* Bottom Navigation for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-stone z-20 flex justify-around items-center h-16 pb-safe">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-forest' : 'text-forest/50'
              }`}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-sage-text' : ''}`} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

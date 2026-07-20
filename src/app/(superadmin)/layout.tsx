'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Building2, Users, Settings, LogOut, Menu, X } from 'lucide-react';
import Link from 'next/link';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'superadmin')) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-alabaster"><div className="w-8 h-8 border-4 border-forest border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const navigation = [
    { name: 'Dashboard', href: '/superadmin/dashboard', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-alabaster text-forest font-sans flex selection:bg-clay-light">
      {/* Mobile sidebar backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-forest/20 backdrop-blur-sm lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-stone transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:w-64 flex flex-col ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-stone">
          <span className="text-xl font-semibold tracking-tight text-forest">
            SocietyOS Admin
          </span>
          <button className="lg:hidden text-forest/50 hover:text-forest" onClick={() => setIsMobileOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-clay-light text-forest'
                    : 'text-forest/70 hover:bg-clay-light/50 hover:text-forest'
                }`}
              >
                <item.icon className={`mr-3 flex-shrink-0 w-5 h-5 ${isActive ? 'text-forest' : 'text-forest/40'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone">
          <div className="flex items-center px-3 py-3 rounded-md bg-clay-light/30 mb-4 border border-stone">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-forest truncate">{user.name}</p>
              <p className="text-xs text-forest/70 font-medium truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex w-full items-center px-3 py-2 text-sm font-semibold text-terracotta rounded-md hover:bg-terracotta/10 transition-colors"
          >
            <LogOut className="mr-3 flex-shrink-0 w-5 h-5 text-terracotta" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top header for mobile */}
        <header className="lg:hidden bg-white border-b border-stone h-16 flex items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight text-forest">SocietyOS</span>
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 -mr-2 text-forest/70 hover:text-forest hover:bg-clay-light rounded-md transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

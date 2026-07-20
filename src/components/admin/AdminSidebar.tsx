'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

import { 
  LayoutDashboard, 
  Home, 
  Users, 
  FileText, 
  MessageSquare, 
  Megaphone, 
  ShieldAlert, 
  Settings,
  Leaf
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
  { href: '/admin/units', label: 'Units', icon: <Home className="w-4 h-4" /> },
  { href: '/admin/users', label: 'Users', icon: <Users className="w-4 h-4" /> },
  { href: '/admin/bills', label: 'Bills', icon: <FileText className="w-4 h-4" /> },
  { href: '/admin/complaints', label: 'Complaints', icon: <MessageSquare className="w-4 h-4" /> },
  { href: '/admin/notices', label: 'Notices', icon: <Megaphone className="w-4 h-4" /> },
  { href: '/admin/audit-log', label: 'Audit Log', icon: <ShieldAlert className="w-4 h-4" /> },
  { href: '/admin/settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-stone bg-white flex flex-col z-20">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-stone bg-clay-light/30">
        <Link href="/admin/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center bg-forest text-alabaster">
            <Leaf strokeWidth={1.5} size={16} />
          </div>
          <div>
            <span className="font-semibold text-lg text-forest tracking-tight">SocietyOS</span>
            <span className="block text-[10px] uppercase tracking-widest text-forest/50 font-medium">Admin Panel</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive 
                  ? 'bg-clay-light text-forest shadow-sm' 
                  : 'text-forest/70 hover:bg-clay-light/50 hover:text-forest'
              }`}
            >
              <div className={`${isActive ? 'text-sage-text' : 'text-forest/40'}`}>
                {item.icon}
              </div>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="p-4 border-t border-stone bg-clay-light/30">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium bg-forest text-alabaster">
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-forest truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-forest/50 truncate">{user?.email}</p>
          </div>
        </div>
        <button 
          onClick={logout} 
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm font-medium text-terracotta hover:bg-terracotta/10 transition-colors duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

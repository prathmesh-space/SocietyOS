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
  Settings 
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/admin/units', label: 'Units', icon: <Home className="w-5 h-5" /> },
  { href: '/admin/users', label: 'Users', icon: <Users className="w-5 h-5" /> },
  { href: '/admin/bills', label: 'Bills', icon: <FileText className="w-5 h-5" /> },
  { href: '/admin/complaints', label: 'Complaints', icon: <MessageSquare className="w-5 h-5" /> },
  { href: '/admin/notices', label: 'Notices', icon: <Megaphone className="w-5 h-5" /> },
  { href: '/admin/audit-log', label: 'Audit Log', icon: <ShieldAlert className="w-5 h-5" /> },
  { href: '/admin/settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col z-20">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-[var(--border-color)]">
        <Link href="/admin/dashboard" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--brand-gradient)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div>
            <span className="font-bold text-lg gradient-text">SocietyOS</span>
            <span className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)]">Admin Panel</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={isActive ? 'sidebar-link-active' : 'sidebar-link'}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info + Logout */}
      <div className="px-4 py-4 border-t border-[var(--border-color)]">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: 'var(--brand-gradient)' }}>
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.name || 'Admin'}</p>
            <p className="text-xs text-[var(--text-muted)] truncate">{user?.email}</p>
          </div>
        </div>
        <button onClick={logout} className="sidebar-link w-full text-rose-400 hover:text-rose-300 hover:bg-rose-500/10">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </aside>
  );
}

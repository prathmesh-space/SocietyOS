'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { useAuth } from '@/components/auth/AuthProvider';

interface DashboardStats {
  totalUnits: number;
  totalUsers: number;
  pendingApprovals: number;
  activeResidents: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalUnits: 0,
    totalUsers: 0,
    pendingApprovals: 0,
    activeResidents: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [unitsRes, usersRes, pendingRes] = await Promise.all([
          apiClient<{ pagination: { total: number } }>('/api/admin/units?limit=1'),
          apiClient<{ pagination: { total: number } }>('/api/admin/users?limit=1'),
          apiClient<{ pagination: { total: number } }>('/api/admin/users?status=pending&limit=1'),
        ]);

        setStats({
          totalUnits: 'data' in unitsRes ? unitsRes.data.pagination.total : 0,
          totalUsers: 'data' in usersRes ? usersRes.data.pagination.total : 0,
          pendingApprovals: 'data' in pendingRes ? pendingRes.data.pagination.total : 0,
          activeResidents: 0, // Will be populated properly later
        });
      } catch (err) {
        console.error('Failed to load stats:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  const statCards = [
    {
      label: 'Total Units',
      value: stats.totalUnits,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
      color: 'text-brand-400',
      bg: 'bg-brand-500/10',
    },
    {
      label: 'Total Users',
      value: stats.totalUsers,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      color: 'text-accent-cyan',
      bg: 'bg-cyan-500/10',
    },
    {
      label: 'Pending Approvals',
      value: stats.pendingApprovals,
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-accent-amber',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Collection Rate',
      value: '—',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-accent-emerald',
      bg: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0] || 'Admin'}</span>
        </h1>
        <p className="text-[var(--text-secondary)]">
          Here&apos;s what&apos;s happening in your society today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.bg} ${card.color}`}>
                {card.icon}
              </div>
            </div>
            <div>
              {isLoading ? (
                <div className="shimmer h-8 w-20 mb-1" />
              ) : (
                <p className="text-3xl font-bold">{card.value}</p>
              )}
              <p className="text-sm text-[var(--text-secondary)] mt-1">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <a href="/admin/units" className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border-color)] hover:border-brand-500/30 hover:bg-brand-500/5 transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-brand-500/10 text-brand-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">Add Unit</p>
              <p className="text-xs text-[var(--text-muted)]">Register a new flat</p>
            </div>
          </a>
          <a href="/admin/users?status=pending" className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border-color)] hover:border-amber-500/30 hover:bg-amber-500/5 transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-amber-500/10 text-accent-amber">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">Approve Residents</p>
              <p className="text-xs text-[var(--text-muted)]">{stats.pendingApprovals} pending</p>
            </div>
          </a>
          <a href="/admin/audit-log" className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border-color)] hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-emerald-500/10 text-accent-emerald">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-sm">Audit Log</p>
              <p className="text-xs text-[var(--text-muted)]">View activity</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

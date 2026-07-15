'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTokens } from '@/lib/api/client';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const tokens = getTokens();
    if (tokens.accessToken) {
      const user = localStorage.getItem('societyos_user');
      if (user) {
        try {
          const parsed = JSON.parse(user);
          if (parsed.role === 'superadmin') router.push('/superadmin/dashboard');
          else if (parsed.role === 'admin') router.push('/admin/dashboard');
          else if (parsed.role === 'watchman') router.push('/watchman/dashboard');
          else router.push('/resident/dashboard');
        } catch {
          // ignore
        }
      }
    }
  }, [router]);

  return (
    <div className="relative min-h-screen flex flex-col overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-brand-600/10 blur-[128px] animate-pulse-soft" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-brand-400/10 blur-[128px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[96px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-gradient)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-xl font-bold gradient-text">SocietyOS</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="btn-ghost">
            Sign In
          </Link>
          <Link href="/signup" className="btn-brand text-sm !px-5 !py-2.5">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="animate-fade-in max-w-4xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-500/10 border border-brand-500/20 px-4 py-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-sm font-medium text-brand-400">
              Production-Grade Multi-Tenant Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold leading-tight tracking-tight mb-6">
            Your Society,{' '}
            <span className="gradient-text">Digitized.</span>
          </h1>

          <p className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Replace WhatsApp groups, paper registers, and manual ledgers with a
            single platform that handles billing, payments, complaints, visitor
            access, and notices for your entire building.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-brand text-lg !px-8 !py-4">
              Start Managing Your Society
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link href="/login" className="btn-secondary text-lg !px-8 !py-4">
              Admin Login
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="animate-slide-up mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full" style={{ animationDelay: '0.3s' }}>
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              ),
              title: 'Automated Billing',
              desc: 'Bulk-generate maintenance bills with configurable late fees. No more spreadsheet work.',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              ),
              title: 'QR Visitor Access',
              desc: 'Pre-approve visitors with a QR code. No phone calls to the gate required.',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ),
              title: 'Tenant Isolation',
              desc: 'Military-grade data isolation. Every query is scoped to your society automatically.',
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="glass-card p-6 text-left transition-all duration-300 hover:shadow-glow hover:scale-[1.02]"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-brand-400" style={{ background: 'rgba(92, 124, 250, 0.1)' }}>
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 text-center text-sm text-[var(--text-muted)]">
        Built for Indian Housing Societies · SocietyOS
      </footer>
    </div>
  );
}

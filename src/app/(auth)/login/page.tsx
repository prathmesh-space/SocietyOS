'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success) {
        const user = JSON.parse(localStorage.getItem('societyos_user') || '{}');
        if (user.role === 'superadmin') {
          window.location.href = '/superadmin/dashboard';
        } else if (user.role === 'admin') {
          window.location.href = '/admin/dashboard';
        } else if (user.role === 'watchman') {
          window.location.href = '/watchman/dashboard';
        } else {
          window.location.href = '/resident/dashboard';
        }
      } else {
        setError(result.error || 'Login failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] rounded-full bg-brand-600/10 blur-[128px] animate-pulse-soft" />
        <div className="absolute bottom-[10%] right-[20%] w-[350px] h-[350px] rounded-full bg-brand-400/10 blur-[100px] animate-pulse-soft" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--brand-gradient)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="text-2xl font-bold gradient-text">SocietyOS</span>
          </Link>
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-[var(--text-secondary)]">
            Sign in to manage your society
          </p>
        </div>

        {/* Login Form */}
        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400 animate-slide-down">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-brand w-full !py-3.5"
              id="login-submit"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            New resident?{' '}
            <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Register here
            </Link>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 glass-card-sm p-4 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-2">Demo Credentials</p>
          <div className="space-y-1 text-xs text-[var(--text-secondary)]">
            <p>Super Admin: <span className="font-mono text-brand-400">superadmin@societyos.in</span></p>
            <p>Society Admin: <span className="font-mono text-brand-400">admin@greenvalley.com</span></p>
            <p>Password: <span className="font-mono text-brand-400">Admin@123!</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

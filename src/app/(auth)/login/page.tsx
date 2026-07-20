'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    <div className="relative min-h-screen flex items-center justify-center px-4 bg-alabaster text-forest font-sans selection:bg-clay-light">
      <div className="relative z-10 w-full max-w-md animate-in fade-in duration-500 slide-in-from-bottom-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-forest text-alabaster transition-transform duration-300 group-hover:scale-105 shadow-soft-default">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span className="text-2xl font-playfair font-bold text-forest">SocietyOS</span>
          </Link>
          <h1 className="text-3xl font-playfair font-bold mb-2">Welcome back</h1>
          <p className="text-forest/70 font-medium">
            Sign in to manage your society
          </p>
        </div>

        {/* Login Form */}
        <Card variant="full" className="bg-white/80 backdrop-blur-sm border-stone/50 shadow-soft-md">
          <CardContent className="p-8 pt-8">
            <form onSubmit={handleSubmit} className="space-y-5" id="login-form">
              {error && (
                <div className="rounded-xl bg-terracotta/10 border border-terracotta/20 px-4 py-3 text-sm text-terracotta font-medium animate-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-semibold text-forest">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-xl border-stone bg-alabaster/50 text-forest placeholder:text-forest/40 focus-visible:ring-forest focus-visible:border-forest"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-semibold text-forest">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border-stone bg-alabaster/50 text-forest placeholder:text-forest/40 focus-visible:ring-forest focus-visible:border-forest"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                expression="full"
                className="w-full h-12 text-[15px]"
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
              </Button>
            </form>

            <div className="mt-6 text-center text-sm font-medium text-forest/70">
              New resident?{' '}
              <Link href="/signup" className="text-forest hover:text-forest/80 font-bold underline decoration-forest/30 underline-offset-4 transition-colors">
                Register here
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo credentials hint */}
        <div className="mt-6 p-5 rounded-2xl bg-clay-light/20 border border-stone/50 text-center text-sm">
          <p className="font-semibold text-forest mb-3 uppercase tracking-wider text-xs">Demo Credentials</p>
          <div className="space-y-2 font-medium text-forest/70">
            <p>Super Admin: <span className="font-semibold text-forest ml-1">superadmin@societyos.in</span></p>
            <p>Society Admin: <span className="font-semibold text-forest ml-1">admin@greenvalley.com</span></p>
            <p>Watchman: <span className="font-semibold text-forest ml-1">watch-lotus@demo.societyos.in</span></p>
            <p>Resident: <span className="font-semibold text-forest ml-1">resident-res1@demo.societyos.in</span></p>
            <p className="pt-2 border-t border-stone/50">Password: <span className="font-semibold text-forest ml-1">Admin@123!</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

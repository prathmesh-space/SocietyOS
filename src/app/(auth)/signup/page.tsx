'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    societyId: '',
    unitId: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      const result = await signup({
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        password: formData.password,
        societyId: formData.societyId,
        unitId: formData.unitId || undefined,
      });

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] rounded-full bg-brand-600/10 blur-[128px]" />
        </div>
        <div className="relative z-10 w-full max-w-md text-center animate-scale-in">
          <div className="glass-card p-8">
            <div className="w-16 h-16 rounded-full bg-accent-emerald/20 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-accent-emerald" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Registration Submitted!</h2>
            <p className="text-[var(--text-secondary)] mb-6">
              Your account is pending approval by your society admin.
              You&apos;ll be able to log in once approved.
            </p>
            <Link href="/login" className="btn-brand">
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] right-[20%] w-[400px] h-[400px] rounded-full bg-brand-600/10 blur-[128px] animate-pulse-soft" />
        <div className="absolute bottom-[10%] left-[20%] w-[300px] h-[300px] rounded-full bg-brand-400/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-scale-in">
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
          <h1 className="text-2xl font-bold mb-2">Resident Registration</h1>
          <p className="text-[var(--text-secondary)]">
            Create your account to get started
          </p>
        </div>

        <div className="glass-card p-8">
          <form onSubmit={handleSubmit} className="space-y-4" id="signup-form">
            {error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-400 animate-slide-down">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-2">Full Name</label>
              <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="input-field" placeholder="Your full name" required />
            </div>

            <div>
              <label htmlFor="signup-email" className="block text-sm font-medium mb-2">Email</label>
              <input id="signup-email" name="email" type="email" value={formData.email} onChange={handleChange} className="input-field" placeholder="you@example.com" required />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium mb-2">Phone <span className="text-[var(--text-muted)]">(optional)</span></label>
              <input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="input-field" placeholder="+91 98765 43210" />
            </div>

            <div>
              <label htmlFor="societyId" className="block text-sm font-medium mb-2">Society ID</label>
              <input id="societyId" name="societyId" type="text" value={formData.societyId} onChange={handleChange} className="input-field" placeholder="Ask your society admin for this ID" required />
            </div>

            <div>
              <label htmlFor="unitId" className="block text-sm font-medium mb-2">Unit / Flat ID <span className="text-[var(--text-muted)]">(optional)</span></label>
              <input id="unitId" name="unitId" type="text" value={formData.unitId} onChange={handleChange} className="input-field" placeholder="Your flat/unit ID" />
            </div>

            <div>
              <label htmlFor="signup-password" className="block text-sm font-medium mb-2">Password</label>
              <input id="signup-password" name="password" type="password" value={formData.password} onChange={handleChange} className="input-field" placeholder="Min 8 chars, uppercase, lowercase, digit, special" required />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">Confirm Password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="input-field" placeholder="Repeat your password" required />
            </div>

            <button type="submit" disabled={isLoading} className="btn-brand w-full !py-3.5" id="signup-submit">
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Registering...
                </span>
              ) : 'Register'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-[var(--text-secondary)]">
            Already registered?{' '}
            <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

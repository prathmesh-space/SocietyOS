'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <div className="relative min-h-screen flex items-center justify-center px-4 bg-alabaster text-forest font-sans selection:bg-clay-light">
        <div className="relative z-10 w-full max-w-md text-center animate-in zoom-in-95 duration-500">
          <Card variant="full" className="bg-white/80 backdrop-blur-sm border-stone/50 shadow-soft-md">
            <CardContent className="p-6 md:p-8">
              <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto mb-6 shadow-sm border border-stone">
                <svg className="w-8 h-8 text-sage-text" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-playfair font-bold text-forest mb-2">Registration Submitted!</h2>
              <p className="text-forest/70 font-medium mb-8">
                Your account is pending approval by your society admin.
                You&apos;ll be able to log in once approved.
              </p>
              <Link href="/login" className="w-full">
                <Button expression="full" className="w-full h-12 text-[15px]">
                  Go to Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-8 md:py-12 bg-alabaster text-forest font-sans selection:bg-clay-light">
      <div className="relative z-10 w-full max-w-md animate-in fade-in duration-500 slide-in-from-bottom-4">
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
          <h1 className="text-3xl font-playfair font-bold mb-2">Resident Registration</h1>
          <p className="text-forest/70 font-medium">
            Create your account to get started
          </p>
        </div>

        <Card variant="full" className="bg-white/80 backdrop-blur-sm border-stone/50 shadow-soft-md">
          <CardContent className="p-6 pt-6 md:p-8 md:pt-8">
            <form onSubmit={handleSubmit} className="space-y-4" id="signup-form">
              {error && (
                <div className="rounded-xl bg-terracotta/10 border border-terracotta/20 px-4 py-3 text-sm text-terracotta font-medium animate-in slide-in-from-top-2">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name" className="font-semibold text-forest">Full Name</Label>
                <Input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className="h-11 rounded-xl border-stone bg-alabaster/50 text-forest placeholder:text-forest/40 focus-visible:ring-forest focus-visible:border-forest" placeholder="Your full name" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="font-semibold text-forest">Email</Label>
                <Input id="signup-email" name="email" type="email" value={formData.email} onChange={handleChange} className="h-11 rounded-xl border-stone bg-alabaster/50 text-forest placeholder:text-forest/40 focus-visible:ring-forest focus-visible:border-forest" placeholder="you@example.com" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="font-semibold text-forest">Phone <span className="text-forest/50 font-normal">(optional)</span></Label>
                <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} className="h-11 rounded-xl border-stone bg-alabaster/50 text-forest placeholder:text-forest/40 focus-visible:ring-forest focus-visible:border-forest" placeholder="+91 98765 43210" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="societyId" className="font-semibold text-forest">Society ID</Label>
                <Input id="societyId" name="societyId" type="text" value={formData.societyId} onChange={handleChange} className="h-11 rounded-xl border-stone bg-alabaster/50 text-forest placeholder:text-forest/40 focus-visible:ring-forest focus-visible:border-forest" placeholder="Ask your society admin for this ID" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="unitId" className="font-semibold text-forest">Unit / Flat ID <span className="text-forest/50 font-normal">(optional)</span></Label>
                <Input id="unitId" name="unitId" type="text" value={formData.unitId} onChange={handleChange} className="h-11 rounded-xl border-stone bg-alabaster/50 text-forest placeholder:text-forest/40 focus-visible:ring-forest focus-visible:border-forest" placeholder="Your flat/unit ID" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="font-semibold text-forest">Password</Label>
                <Input id="signup-password" name="password" type="password" value={formData.password} onChange={handleChange} className="h-11 rounded-xl border-stone bg-alabaster/50 text-forest placeholder:text-forest/40 focus-visible:ring-forest focus-visible:border-forest" placeholder="Min 8 chars, uppercase, lowercase, digit, special" required />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="font-semibold text-forest">Confirm Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="h-11 rounded-xl border-stone bg-alabaster/50 text-forest placeholder:text-forest/40 focus-visible:ring-forest focus-visible:border-forest" placeholder="Repeat your password" required />
              </div>

              <Button type="submit" disabled={isLoading} expression="full" className="w-full h-12 text-[15px] mt-2" id="signup-submit">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Registering...
                  </span>
                ) : 'Register'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm font-medium text-forest/70">
              Already registered?{' '}
              <Link href="/login" className="text-forest hover:text-forest/80 font-bold underline decoration-forest/30 underline-offset-4 transition-colors">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

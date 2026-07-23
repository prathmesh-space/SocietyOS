'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getTokens } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Leaf, ShieldCheck, QrCode } from 'lucide-react';

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
    <div className="relative min-h-screen flex flex-col overflow-hidden text-forest selection:bg-sage/30">
      {/* Decorative organic shapes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-[40px] rotate-12 bg-sage/10 blur-3xl" />
        <div className="absolute top-[40%] -left-32 w-[500px] h-[500px] rounded-t-full rotate-45 bg-clay-light/50 blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-4 py-4 md:px-8 md:py-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-forest text-alabaster">
            <Leaf strokeWidth={1.5} size={20} />
          </div>
          <span className="text-2xl font-playfair font-semibold">SocietyOS</span>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" asChild expression="full">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button variant="default" asChild expression="full">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center px-4 pt-12 pb-16 md:px-8 md:pt-24 md:pb-32 text-center">
        <div className="animate-fade-in max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-3 rounded-full border border-sage px-5 py-2 mb-12 bg-white/50 backdrop-blur-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-sage" />
            <span className="text-xs font-semibold tracking-widest uppercase text-sage-text">
              Artisanal Multi-Tenant Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-8xl font-playfair font-semibold leading-tight mb-8">
            Your Society, <br />
            <span className="italic font-normal">Digitized.</span>
          </h1>

          <p className="text-lg md:text-xl text-forest/80 max-w-2xl mx-auto mb-10 md:mb-16 leading-relaxed">
            Replace chaotic groups, paper registers, and manual ledgers with a
            single platform that handles billing, payments, complaints, and visitor
            access with effortless grace.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button variant="default" size="lg" asChild expression="full" className="w-full sm:w-auto group">
              <Link href="/signup">
                Start Managing
                <svg className="ml-3 w-5 h-5 transition-transform duration-500 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild expression="full" className="w-full sm:w-auto">
              <Link href="/login">Admin Login</Link>
            </Button>
          </div>
        </div>

        {/* Feature Cards with Staggered Organic Grid */}
        <div className="mt-16 md:mt-32 grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12 max-w-6xl w-full px-4">
          {[
            {
              icon: <div className="w-14 h-14 rounded-t-[20px] rounded-b-xl flex items-center justify-center bg-clay-light text-forest mb-6"><svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg></div>,
              title: 'Automated Billing',
              desc: 'Effortlessly generate maintenance bills with configurable late fees. Let the system do the heavy lifting.',
              offset: 'md:translate-y-0',
            },
            {
              icon: <div className="w-14 h-14 rounded-t-[20px] rounded-b-xl flex items-center justify-center bg-clay-light text-forest mb-6"><QrCode strokeWidth={1.5} size={24} /></div>,
              title: 'QR Visitor Access',
              desc: 'Pre-approve visitors instantly. Provide a seamless and welcoming arrival for your guests.',
              offset: 'md:translate-y-12', // Staggered rhythm
            },
            {
              icon: <div className="w-14 h-14 rounded-t-[20px] rounded-b-xl flex items-center justify-center bg-clay-light text-forest mb-6"><ShieldCheck strokeWidth={1.5} size={24} /></div>,
              title: 'Tenant Isolation',
              desc: 'Uncompromising security. Every interaction is strictly scoped to your society\'s sanctuary.',
              offset: 'md:translate-y-0',
            },
          ].map((feature, i) => (
            <Card
              key={i}
              variant="full"
              className={`p-2 text-left border-0 bg-transparent shadow-none hover:shadow-none hover:-translate-y-0 ${feature.offset}`}
            >
              <div className="rounded-3xl border border-stone bg-white p-8 h-full shadow-soft-default transition-all duration-700 hover:shadow-soft-lg hover:-translate-y-2">
                {feature.icon}
                <h3 className="text-2xl font-playfair font-semibold mb-4">{feature.title}</h3>
                <p className="text-forest/70 leading-relaxed">
                  {feature.desc}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-8 mx-4 md:py-12 md:mx-8 text-center text-sm text-forest/50 font-medium tracking-wide border-t border-stone/50 mt-12">
        Crafted for Indian Housing Societies &bull; SocietyOS
      </footer>
    </div>
  );
}

"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AUTH_KEY } from '@/lib/constants';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem(AUTH_KEY) === 'true';
    if (isAuthenticated) {
      router.replace('/dashboard');
    } else {
      router.replace('/login');
    }
    // A small delay to prevent flash of content if redirection is too fast,
    // or simply to show loading state.
    const timer = setTimeout(() => setIsLoading(false), 300); 
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <p className="mt-4 text-lg text-foreground">Loading GymTrack Central...</p>
    </div>
  );
}

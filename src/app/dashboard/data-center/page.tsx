
'use client';

import { ArrowLeft, DatabaseZap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function DataCenterPage() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg bg-background">
      <div className="text-center">
        <DatabaseZap className="mx-auto h-16 w-16 text-primary/70" />
        <h1 className="mt-6 text-3xl font-bold">Welcome to the Data Center</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          <ArrowLeft className="inline-block h-5 w-5 mr-2 animate-pulse" />
          Select a table from the sidebar to view and manage its data.
        </p>
      </div>
      <Button variant="outline" onClick={() => router.push('/dashboard')} className="mt-10">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>
    </div>
  );
}

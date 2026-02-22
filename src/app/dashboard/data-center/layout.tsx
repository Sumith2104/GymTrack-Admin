
'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Database, Table, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';

const tableMetadatas = [
  { name: 'super_admins', displayName: 'Super Admins', icon: Table },
  { name: 'gyms', displayName: 'Gyms', icon: Table },
  { name: 'gym_requests', displayName: 'Gym Requests', icon: Table },
  { name: 'members', displayName: 'Members', icon: Table },
  { name: 'plans', displayName: 'Plans', icon: Table },
  { name: 'check_ins', displayName: 'Check-ins', icon: Table },
  { name: 'announcements', displayName: 'Announcements', icon: Table },
  { name: 'messages', displayName: 'Messages', icon: Table },
];

export default function DataCenterLayout({ children }: { children: ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-[calc(100vh-10rem)] bg-muted/20 rounded-lg border">
      {/* Mobile Menu Button */}
      <div className="absolute top-20 right-5 z-10 lg:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="sr-only">Toggle Sidebar</span>
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          'w-64 flex-col border-r bg-background p-4 transition-all lg:flex',
          isSidebarOpen ? 'flex fixed lg:relative h-full z-10' : 'hidden'
        )}
      >
        <div className="mb-4 flex items-center gap-3 px-2">
          <Database className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Data Center</h2>
        </div>
        <nav className="flex flex-col gap-1">
          {tableMetadatas.map((table) => {
            const isActive = pathname === `/dashboard/data-center/${table.name}`;
            return (
              <Link
                key={table.name}
                href={`/dashboard/data-center/${table.name}`}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  isActive && 'bg-primary/10 text-primary font-semibold'
                )}
                onClick={() => setIsSidebarOpen(false)}
              >
                <table.icon className="h-5 w-5" />
                {table.displayName}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}

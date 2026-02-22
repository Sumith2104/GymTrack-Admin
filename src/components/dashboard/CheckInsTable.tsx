
"use client";

import { useState, useMemo } from 'react';
import type { CheckIn } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { User, CalendarCheck, Loader2, Trash2, Search } from 'lucide-react';

interface CheckInsTableProps {
  checkIns: CheckIn[];
  isLoading: boolean;
  onDelete: (checkIn: CheckIn) => void;
}

export function CheckInsTable({ checkIns, isLoading, onDelete }: CheckInsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCheckIns = useMemo(() => {
    if (!searchTerm) return checkIns;
    return checkIns.filter(ci => 
      ci.members?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, checkIns]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Check-ins...</p>
      </div>
    );
  }

  return (
    <div>
       <div className="flex items-center justify-between mb-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Filter by member name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10"
            />
          </div>
        </div>

      {filteredCheckIns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-card-foreground/5 p-6 rounded-lg">
          <CalendarCheck size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Check-ins Found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'There are no check-in records for this gym yet.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><User className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Member Name</TableHead>
                <TableHead><CalendarCheck className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Check-in Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCheckIns.map((checkIn) => (
                <TableRow key={checkIn.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{checkIn.members?.name || 'Unknown Member'}</TableCell>
                  <TableCell>
                    {checkIn.created_at ? format(new Date(checkIn.created_at), 'dd MMM yyyy, HH:mm:ss') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(checkIn)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

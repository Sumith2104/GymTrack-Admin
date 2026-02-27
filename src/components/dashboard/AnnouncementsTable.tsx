
"use client";

import { useState, useMemo } from 'react';
import type { Announcement } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Megaphone, Calendar, Loader2, PlusCircle, Search, Edit, Trash2 } from 'lucide-react';

interface AnnouncementsTableProps {
  announcements: Announcement[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (announcement: Announcement) => void;
  onDelete: (announcement: Announcement) => void;
}

export function AnnouncementsTable({ announcements, isLoading, onAdd, onEdit, onDelete }: AnnouncementsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAnnouncements = useMemo(() => {
    if (!searchTerm) return announcements;
    return announcements.filter(ann =>
      ann.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ann.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, announcements]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Announcements...</p>
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
            placeholder="Filter by title or message..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
        </div>
        <Button onClick={onAdd}>
          <PlusCircle size={18} className="mr-2" />
          Add Announcement
        </Button>
      </div>

      {filteredAnnouncements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-card-foreground/5 p-6 rounded-lg">
          <Megaphone size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Announcements Found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'There are no announcements for this gym.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Message</TableHead>
                <TableHead><Calendar className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAnnouncements.map((announcement) => (
                <TableRow key={announcement.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{announcement.title || 'N/A'}</TableCell>
                  <TableCell>{announcement.content || 'N/A'}</TableCell>
                  <TableCell>
                    {announcement.created_at ? format(new Date(announcement.created_at), 'dd MMM yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(announcement)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(announcement)}><Trash2 className="h-4 w-4" /></Button>
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

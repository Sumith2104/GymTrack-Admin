
"use client";

import { useState, useMemo } from 'react';
import type { Member } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { UserSquare, Users, PackageSearch, CalendarDays, AlertCircle, Loader2, PlusCircle, Search, Edit, Trash2 } from 'lucide-react';

interface MembersTableProps {
  members: Member[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (member: Member) => void;
  onDelete: (member: Member) => void;
}

export function MembersTable({ members, isLoading, onAdd, onEdit, onDelete }: MembersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredMembers = useMemo(() => {
    if (!searchTerm) return members;
    return members.filter(member =>
      member.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, members]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Members...</p>
      </div>
    );
  }

  const getStatusVariant = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-500/20 text-green-700 dark:bg-green-700/30 dark:text-green-400 border-green-500/30';
      case 'inactive':
        return 'bg-orange-500/20 text-orange-700 dark:bg-orange-700/30 dark:text-orange-400 border-orange-500/30';
      case 'expired':
        return 'bg-red-500/20 text-red-700 dark:bg-red-700/30 dark:text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filter by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
        </div>
        <Button onClick={onAdd}>
          <PlusCircle size={18} className="mr-2" />
          Add Member
        </Button>
      </div>
      
      {filteredMembers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-card-foreground/5 p-6 rounded-lg">
          <Users size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Members Found</h3>
          <p className="text-muted-foreground">
            {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'This gym currently has no members registered.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]"><UserSquare className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Member Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead><AlertCircle className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Status</TableHead>
                <TableHead><PackageSearch className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Plan</TableHead>
                <TableHead><CalendarDays className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Join Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMembers.map((member) => (
                <TableRow key={member.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{member.name || 'N/A'}</TableCell>
                  <TableCell>{member.email || 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${getStatusVariant(member.membership_status)}`}>
                      {member.membership_status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.plans?.plan_name || 'No Plan'}</TableCell>
                  <TableCell>
                    {member.join_date ? format(new Date(member.join_date), 'dd MMM yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(member)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(member)}><Trash2 className="h-4 w-4" /></Button>
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

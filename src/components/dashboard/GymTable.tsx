
"use client";

import { useState, useMemo, useEffect } from 'react';
import type { Gym } from '@/types';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Info, Copy, Trash2, MoreHorizontal, Mail, Loader2, Users, DollarSign, Settings, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { Button, buttonVariants } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import Link from 'next/link';

interface GymTableProps {
  gyms: Gym[];
  onDeleteGyms: (gymIds: string[]) => void;
  onSetGymsStatus: (gymIds: string[], status: 'active' | 'inactive' | 'inactive soon') => void;
  onSendCustomEmail: (gymIds: string[]) => void;
  isEmailSending: boolean;
  isStatusUpdating: boolean;
  isLoadingStats: boolean;
}

export function GymTable({
  gyms: initialGyms,
  onDeleteGyms,
  onSetGymsStatus,
  onSendCustomEmail,
  isEmailSending,
  isStatusUpdating,
  isLoadingStats
}: GymTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [gyms, setGyms] = useState<Gym[]>(initialGyms);
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const gymsWithDefaults = initialGyms.map(gym => ({
      ...gym,
      activeMembersCount: gym.activeMembersCount ?? 0,
      monthlyRevenue: gym.monthlyRevenue ?? 0,
    }));
    setGyms(gymsWithDefaults);
    setSelectedGymIds(prevSelected =>
      prevSelected.filter(id => initialGyms.some(gym => gym.id === id))
    );
  }, [initialGyms]);

  const filteredGyms = useMemo(() => {
    if (!searchTerm) return gyms;
    return gyms.filter(gym =>
      gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.ownerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.formattedGymId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.status.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, gyms]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedGymIds(filteredGyms.map(gym => gym.id));
    } else {
      setSelectedGymIds([]);
    }
  };

  const handleSelectRow = (gymId: string, checked: boolean | 'indeterminate') => {
    setSelectedGymIds(prevSelected =>
      checked === true
        ? [...prevSelected, gymId]
        : prevSelected.filter(id => id !== gymId)
    );
  };

  const handleCopyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Copied to clipboard',
        description: `${fieldName} "${text}" copied.`,
      });
    }).catch(err => {
      toast({
        title: 'Copy failed',
        description: `Could not copy ${fieldName}. Error: ${err.message}`,
        variant: 'destructive',
      });
      console.error('Failed to copy: ', err);
    });
  };

  const handleOpenDeleteDialog = () => {
    if (selectedGymIds.length > 0) {
      setIsDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    onDeleteGyms(selectedGymIds);
    setSelectedGymIds([]); // Clear selection after delete
    setIsDeleteDialogOpen(false);
  };

  const handleMarkActive = () => {
    if (selectedGymIds.length > 0) {
      onSetGymsStatus(selectedGymIds, 'active');
    }
  };

  const handleMarkInactiveSoon = () => {
    if (selectedGymIds.length > 0) {
      onSetGymsStatus(selectedGymIds, 'inactive soon');
    }
  };

  const handleMarkInactive = () => {
    if (selectedGymIds.length > 0) {
      onSetGymsStatus(selectedGymIds, 'inactive');
    }
  };

  const handleSendEmails = () => {
    if (selectedGymIds.length > 0) {
      onSendCustomEmail(selectedGymIds);
    }
  };

  const getStatusBadgeClass = (status: Gym['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-700 dark:bg-green-700/30 dark:text-green-400 border-green-500/30';
      case 'inactive':
        return 'bg-orange-500/20 text-orange-700 dark:bg-orange-700/30 dark:text-orange-400 border-orange-500/30';
      case 'inactive soon':
        return 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const numSelected = selectedGymIds.length;
  const allVisibleSelected = filteredGyms.length > 0 && numSelected === filteredGyms.length;
  const isAnyActionLoading = isEmailSending || isStatusUpdating || isLoadingStats;

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '₹0.00'; // Handle undefined gracefully
    return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search gyms (name, email, ID)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2 shadow-sm"
            disabled={isAnyActionLoading}
          />
        </div>
        {numSelected > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{numSelected} selected</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isAnyActionLoading}>
                  Actions {isStatusUpdating || isEmailSending ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <MoreHorizontal className="ml-2 h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Apply to Selected</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleMarkActive} disabled={isAnyActionLoading}>
                  <ToggleRight className="mr-2 h-4 w-4 text-green-500" />
                  Mark as Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMarkInactiveSoon} disabled={isAnyActionLoading}>
                  <AlertTriangle className="mr-2 h-4 w-4 text-yellow-500" />
                  Mark as Inactive Soon
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMarkInactive} disabled={isAnyActionLoading}>
                  <ToggleLeft className="mr-2 h-4 w-4 text-orange-500" />
                  Mark as Inactive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSendEmails} disabled={isAnyActionLoading}>
                  {isEmailSending && selectedGymIds.length > 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                  Send Custom Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenDeleteDialog} className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/50" disabled={isAnyActionLoading}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete from Database
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {filteredGyms.length === 0 && !searchTerm && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg shadow-md border-0">
          <Info size={48} className="text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Gyms Yet</h3>
          <p className="text-muted-foreground">Click "Create New Gym" to add the first one.</p>
        </div>
      )}

      {filteredGyms.length === 0 && searchTerm && (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg shadow-md border-0">
          <Info size={48} className="text-primary mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Gyms Found</h3>
          <p className="text-muted-foreground">Your search for "{searchTerm}" did not match any gyms.</p>
        </div>
      )}

      {filteredGyms.length > 0 && (
        <div className="rounded-xl border border-white/10 shadow-2xl overflow-hidden bg-glass-heavy">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px] px-2 sm:px-4">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all visible gyms"
                    disabled={filteredGyms.length === 0 || isAnyActionLoading}
                  />
                </TableHead>
                <TableHead className="min-w-[150px]">Gym Name</TableHead>
                <TableHead className="min-w-[180px]">Owner Email</TableHead>
                <TableHead>Gym ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active Members</TableHead>
                <TableHead className="text-right">Gym Revenue (Mo)</TableHead>
                <TableHead className="text-right min-w-[100px]">Creation Date</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGyms.map((gym) => (
                <TableRow
                  key={gym.id}
                  className="hover:bg-muted/50 transition-colors align-middle"
                  data-state={selectedGymIds.includes(gym.id) ? 'selected' : undefined}
                >
                  <TableCell className="px-2 sm:px-4">
                    <Checkbox
                      checked={selectedGymIds.includes(gym.id)}
                      onCheckedChange={(checked) => handleSelectRow(gym.id, checked)}
                      aria-label={`Select gym ${gym.name}`}
                      disabled={isAnyActionLoading}
                    />
                  </TableCell>
                  <TableCell className="font-medium">
                    <Link href={`/dashboard/gym/${gym.id}`} className="hover:underline text-primary">
                      {gym.name}
                    </Link>
                  </TableCell>
                  <TableCell>{gym.ownerEmail}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary">{gym.formattedGymId}</Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyToClipboard(gym.formattedGymId, "Gym ID")}>
                        <Copy size={14} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={'outline'}
                      className={`capitalize ${getStatusBadgeClass(gym.status)}`}>
                      {gym.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {isLoadingStats ? <Loader2 className="h-4 w-4 animate-spin inline-block" /> : (gym.activeMembersCount ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {isLoadingStats ? <Loader2 className="h-4 w-4 animate-spin inline-block" /> : formatCurrency(gym.monthlyRevenue)}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {format(new Date(gym.creationDate), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/dashboard/gym/${gym.id}`}>
                        <Settings size={16} className="mr-1 sm:mr-2" />
                        Manage
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {selectedGymIds.length} gym(s)
              from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className={buttonVariants({ variant: "destructive" })}>
              Delete from Database
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}




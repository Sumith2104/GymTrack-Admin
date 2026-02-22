
"use client";

import { useState, useMemo } from 'react';
import type { Plan } from '@/types';
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
import { Package, CalendarDays, IndianRupee, FileText, Loader2, PlusCircle, Search, Edit, Trash2 } from 'lucide-react';

interface PlansTableProps {
  plans: Plan[];
  isLoading: boolean;
  onAdd: () => void;
  onEdit: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}

export function PlansTable({ plans, isLoading, onAdd, onEdit, onDelete }: PlansTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPlans = useMemo(() => {
    if (!searchTerm) return plans;
    return plans.filter(plan =>
      plan.plan_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, plans]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-3 text-lg">Loading Plans...</p>
      </div>
    );
  }

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '₹0.00';
    return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  };
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Filter by plan name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10"
          />
        </div>
        <Button onClick={onAdd}>
          <PlusCircle size={18} className="mr-2" />
          Add Plan
        </Button>
      </div>

      {filteredPlans.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-card-foreground/5 p-6 rounded-lg">
          <Package size={48} className="text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Plans Found</h3>
          <p className="text-muted-foreground">
             {searchTerm ? `Your search for "${searchTerm}" did not return any results.` : 'This gym currently has no membership plans configured.'}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><FileText className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Plan Name</TableHead>
                <TableHead><IndianRupee className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Price</TableHead>
                <TableHead><CalendarDays className="inline-block h-4 w-4 mr-1.5 relative -top-px" />Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlans.map((plan) => (
                <TableRow key={plan.id} className="hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">{plan.plan_name || 'N/A'}</TableCell>
                  <TableCell>{formatCurrency(plan.price)}</TableCell>
                  <TableCell>{plan.duration_months ? `${plan.duration_months} month(s)` : 'N/A'}</TableCell>
                  <TableCell>
                    <Badge variant={plan.is_active ? 'default' : 'secondary'} className={plan.is_active ? 'bg-green-500/20 text-green-700 dark:bg-green-700/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}>
                      {plan.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(plan)}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onDelete(plan)}><Trash2 className="h-4 w-4" /></Button>
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

"use client";

import { useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Member, Plan } from '@/types';
import { Loader2, Save } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const memberSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  plan_id: z.string().optional().nullable(),
  membership_status: z.string().min(1, 'Status is required'),
  join_date: z.string().optional().nullable(),
});

type MemberFormInputs = z.infer<typeof memberSchema>;

interface AddEditMemberDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MemberFormInputs, id?: string) => void;
  isSaving: boolean;
  memberToEdit: Member | null;
  plans: Plan[];
}

export function AddEditMemberDialog({ isOpen, onOpenChange, onSave, isSaving, memberToEdit, plans }: AddEditMemberDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<MemberFormInputs>({
    resolver: zodResolver(memberSchema),
  });
  
  const isEditMode = !!memberToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        const joinDate = memberToEdit.join_date ? format(parseISO(memberToEdit.join_date), 'yyyy-MM-dd') : '';
        reset({
          name: memberToEdit.name,
          email: memberToEdit.email,
          plan_id: memberToEdit.plan_id,
          membership_status: memberToEdit.membership_status,
          join_date: joinDate,
        });
      } else {
        reset({
          name: '',
          email: '',
          plan_id: '',
          membership_status: 'active',
          join_date: format(new Date(), 'yyyy-MM-dd'),
        });
      }
    }
  }, [isOpen, isEditMode, memberToEdit, reset]);

  const handleDialogClose = () => {
    if (!isSaving) {
      onOpenChange(false);
    }
  };

  const processSubmit: SubmitHandler<MemberFormInputs> = (data) => {
    const dataToSave = {
      ...data,
      join_date: data.join_date ? new Date(data.join_date).toISOString() : new Date().toISOString(),
      plan_id: data.plan_id === 'null' ? null : (data.plan_id || null),
    };
    onSave(dataToSave, memberToEdit?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? 'Edit Member' : 'Add New Member'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this member.' : 'Create a new member for this gym.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register('name')} className={errors.name ? 'border-destructive' : ''} placeholder="John Doe" disabled={isSaving} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
           <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" {...register('email')} className={errors.email ? 'border-destructive' : ''} placeholder="john.doe@example.com" disabled={isSaving} />
            {errors.email && <p className="text-sm text-destructive mt-1">{errors.email.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="plan_id">Membership Plan</Label>
              <Controller
                name="plan_id"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || ''} disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select a plan" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="null">No Plan</SelectItem>
                      {plans.map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.plan_name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="membership_status">Status</Label>
              <Controller
                name="membership_status"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} disabled={isSaving}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="join_date">Join Date</Label>
            <Input id="join_date" type="date" {...register('join_date')} className={errors.join_date ? 'border-destructive' : ''} disabled={isSaving} />
            {errors.join_date && <p className="text-sm text-destructive mt-1">{errors.join_date.message}</p>}
          </div>

          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save size={18} className="mr-2"/>}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

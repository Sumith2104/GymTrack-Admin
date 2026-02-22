
"use client";

import { useEffect } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { Plan } from '@/types';
import { Loader2, Save } from 'lucide-react';

const planSchema = z.object({
  plan_name: z.string().min(1, 'Plan name is required').max(100, 'Name is too long'),
  price: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 0 : parseFloat(String(val))),
    z.number().min(0, 'Price must be a positive number')
  ),
  duration_months: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? 1 : parseInt(String(val), 10)),
    z.number().int().min(1, 'Duration must be at least 1 month')
  ),
  is_active: z.boolean().default(true),
});

type PlanFormInputs = z.infer<typeof planSchema>;

interface AddEditPlanDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: PlanFormInputs, id?: string) => void;
  isSaving: boolean;
  planToEdit: Plan | null;
}

export function AddEditPlanDialog({ isOpen, onOpenChange, onSave, isSaving, planToEdit }: AddEditPlanDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<PlanFormInputs>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      is_active: true,
      duration_months: 1,
      price: 0,
    }
  });
  
  const isEditMode = !!planToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        reset(planToEdit);
      } else {
        reset({
          plan_name: '',
          price: 0,
          duration_months: 1,
          is_active: true,
        });
      }
    }
  }, [isOpen, isEditMode, planToEdit, reset]);

  const handleDialogClose = () => {
    if (!isSaving) {
      onOpenChange(false);
    }
  };

  const processSubmit: SubmitHandler<PlanFormInputs> = (data) => {
    onSave(data, planToEdit?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? 'Edit Plan' : 'Add New Plan'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this membership plan.' : 'Create a new membership plan for this gym.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="plan_name">Plan Name</Label>
            <Input
              id="plan_name"
              {...register('plan_name')}
              className={errors.plan_name ? 'border-destructive' : ''}
              placeholder="E.g., Gold Membership"
              disabled={isSaving}
            />
            {errors.plan_name && <p className="text-sm text-destructive mt-1">{errors.plan_name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price (INR)</Label>
              <Input id="price" type="number" step="0.01" {...register('price')} className={errors.price ? 'border-destructive' : ''} placeholder="e.g., 1000" disabled={isSaving} />
              {errors.price && <p className="text-sm text-destructive mt-1">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration_months">Duration (Months)</Label>
              <Input id="duration_months" type="number" {...register('duration_months')} className={errors.duration_months ? 'border-destructive' : ''} placeholder="e.g., 1" disabled={isSaving} />
              {errors.duration_months && <p className="text-sm text-destructive mt-1">{errors.duration_months.message}</p>}
            </div>
          </div>
          <div className="flex items-center space-x-2 pt-2">
             <Controller
                name="is_active"
                control={control}
                render={({ field }) => (
                    <Switch
                        id="is_active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={isSaving}
                    />
                )}
            />
            <Label htmlFor="is_active">Plan is Active</Label>
          </div>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save size={18} className="mr-2"/>}
              Save Plan
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

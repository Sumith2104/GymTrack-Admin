
"use client";

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import type { Announcement } from '@/types';
import { Loader2, Save } from 'lucide-react';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  content: z.string().min(1, 'Message is required').max(1000, 'Message is too long'),
});

type AnnouncementFormInputs = z.infer<typeof announcementSchema>;

interface AddEditAnnouncementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AnnouncementFormInputs, id?: string) => void;
  isSaving: boolean;
  announcementToEdit: Announcement | null;
}

export function AddEditAnnouncementDialog({ isOpen, onOpenChange, onSave, isSaving, announcementToEdit }: AddEditAnnouncementDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AnnouncementFormInputs>({
    resolver: zodResolver(announcementSchema),
  });

  const isEditMode = !!announcementToEdit;

  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        reset({ title: announcementToEdit.title, content: announcementToEdit.content });
      } else {
        reset({ title: '', content: '' });
      }
    }
  }, [isOpen, isEditMode, announcementToEdit, reset]);

  const handleDialogClose = () => {
    if (!isSaving) {
      onOpenChange(false);
    }
  };

  const processSubmit: SubmitHandler<AnnouncementFormInputs> = (data) => {
    onSave(data, announcementToEdit?.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">{isEditMode ? 'Edit Announcement' : 'Add New Announcement'}</DialogTitle>
          <DialogDescription>
            {isEditMode ? 'Update the details for this announcement.' : 'Create a new announcement for this gym.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(processSubmit)} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              {...register('title')}
              className={errors.title ? 'border-destructive' : ''}
              placeholder="E.g., Holiday Hours"
              disabled={isSaving}
            />
            {errors.title && <p className="text-sm text-destructive mt-1">{errors.title.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Message</Label>
            <Textarea
              id="content"
              {...register('content')}
              className={`min-h-[120px] ${errors.content ? 'border-destructive' : ''}`}
              placeholder="Enter the announcement details here."
              disabled={isSaving}
            />
            {errors.content && <p className="text-sm text-destructive mt-1">{errors.content.message}</p>}
          </div>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save size={18} className="mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

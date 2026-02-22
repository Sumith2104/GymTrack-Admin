"use client";

import { useEffect, useState, useTransition } from 'react';
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
import type { Gym } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save } from 'lucide-react';
import { flux } from '@/lib/flux/client';

// This component is no longer used directly from the main dashboard page.
// Its logic will be adapted for the individual gym detail page.
// Keeping the file for reference or future reuse if a modal approach is desired elsewhere.

const editGymSchema = z.object({
    name: z.string().min(1, { message: 'Gym name is required' }),
    ownerEmail: z.string().email({ message: 'Invalid owner email address' }),
});

type EditGymFormInputs = z.infer<typeof editGymSchema>;

interface EditGymDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    gymToEdit: Gym | null;
    onGymUpdated: (updatedGymData: Partial<Gym> & { id: string }) => Promise<boolean>;
}

export function EditGymDialog({ isOpen, onOpenChange, gymToEdit, onGymUpdated }: EditGymDialogProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors, isSubmitting: isFormSubmitting },
    } = useForm<EditGymFormInputs>({
        resolver: zodResolver(editGymSchema),
    });

    useEffect(() => {
        if (gymToEdit && isOpen) {
            setValue('name', gymToEdit.name);
            setValue('ownerEmail', gymToEdit.ownerEmail);
        } else if (!isOpen) {
            reset();
        }
    }, [gymToEdit, setValue, reset, isOpen]);

    const isDialogSubmitting = isFormSubmitting || isPending;

    const onSubmit: SubmitHandler<EditGymFormInputs> = async (data) => {
        if (!gymToEdit) {
            console.error("EditGymDialog: gymToEdit is null, cannot submit.");
            return;
        }

        const updatedGymDataForLocalState = {
            id: gymToEdit.id,
            name: data.name,
            ownerEmail: data.ownerEmail,
        };

        startTransition(async () => {
            try {
                const safeName = data.name.replace(/'/g, "''");
                const safeEmail = data.ownerEmail.replace(/'/g, "''");
                const query = `
            UPDATE gyms 
            SET name = '${safeName}', owner_email = '${safeEmail}' 
            WHERE id = '${gymToEdit.id}' 
            RETURNING *
        `;
                const { rows: updatedRows, error: dbError } = await flux.sql(query);

                if (dbError) {
                    console.error('Error updating gym in database:', dbError);
                    toast({
                        title: "Database Error",
                        description: `Failed to update gym: ${dbError.message}.`,
                        variant: "destructive",
                    });
                    return;
                }

                if (!updatedRows || updatedRows.length === 0) {
                    console.warn(`Update attempted for gym ID ${gymToEdit.id}, but no rows were affected. The gym might not exist in the DB or data was identical.`);
                }

                const localUpdateSuccess = await onGymUpdated(updatedGymDataForLocalState);

                if (localUpdateSuccess) {
                    toast({
                        title: "Gym Updated",
                        description: `${updatedGymDataForLocalState.name} has been successfully updated.`,
                    });
                    onOpenChange(false);
                } else {
                    toast({
                        title: "Local Update Error",
                        description: `Gym data might have been updated in the database, but the local display failed to refresh. Try refreshing the page.`,
                        variant: "destructive",
                    });
                }

            } catch (error) {
                console.error('Error during gym update process:', error);
                const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred.";
                toast({
                    title: "Operation Error",
                    description: `Failed to update gym. ${errorMessage}`,
                    variant: "destructive",
                });
            }
        });
    };

    if (!gymToEdit && isOpen) {
        return (
            <Dialog open={isOpen} onOpenChange={onOpenChange}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Error</DialogTitle>
                        <DialogDescription>No gym data provided for editing.</DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button onClick={() => onOpenChange(false)}>Close</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen && !!gymToEdit} onOpenChange={(open) => {
            if (!isDialogSubmitting) {
                onOpenChange(open);
            }
        }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Edit Gym: {gymToEdit?.name}</DialogTitle>
                    <DialogDescription>
                        Modify the details for this gym. Changes will be saved to the database.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-name" className="text-right">
                            Gym Name
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="edit-name"
                                {...register('name')}
                                className={errors.name ? 'border-destructive' : ''}
                                disabled={isDialogSubmitting}
                            />
                            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="edit-ownerEmail" className="text-right">
                            Owner Email
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="edit-ownerEmail"
                                type="email"
                                {...register('ownerEmail')}
                                className={errors.ownerEmail ? 'border-destructive' : ''}
                                disabled={isDialogSubmitting}
                            />
                            {errors.ownerEmail && <p className="text-sm text-destructive mt-1">{errors.ownerEmail.message}</p>}
                        </div>
                    </div>
                    <DialogFooter className="mt-2">
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isDialogSubmitting}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isDialogSubmitting}>
                            {isDialogSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} className="mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

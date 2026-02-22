"use client";

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
    DialogTrigger,
    DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Gym } from '@/types';
import { generateFormattedGymId, generateUUID } from '@/lib/utils';
import { sendWelcomeEmailAction } from '@/app/actions/gymActions';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Loader2 } from 'lucide-react';
import { useState, useTransition } from 'react';
import { flux } from '@/lib/flux/client';

const gymSchema = z.object({
    name: z.string().min(1, { message: 'Gym name is required' }),
    ownerEmail: z.string().email({ message: 'Invalid owner email address' }),
});

type GymFormInputs = z.infer<typeof gymSchema>;

interface CreateGymDialogProps {
    onGymCreated: (newGym: Gym) => boolean;
    existingGymFormattedIds: string[];
}

export function CreateGymDialog({ onGymCreated, existingGymFormattedIds }: CreateGymDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting: isFormSubmitting },
    } = useForm<GymFormInputs>({
        resolver: zodResolver(gymSchema),
    });

    const isDialogSubmitting = isFormSubmitting || isPending;

    const onSubmit: SubmitHandler<GymFormInputs> = async (data) => {
        let newFormattedGymId = generateFormattedGymId();
        while (existingGymFormattedIds.includes(newFormattedGymId)) {
            newFormattedGymId = generateFormattedGymId();
        }

        const newGym: Gym = {
            id: generateUUID(),
            name: data.name,
            ownerEmail: data.ownerEmail,
            formattedGymId: newFormattedGymId,
            creationDate: new Date().toISOString(),
            status: 'active',
            activeMembersCount: 0, // Initialize analytics fields
            monthlyRevenue: 0,     // Initialize analytics fields
        };

        const wasGymAddedLocally = onGymCreated(newGym);

        if (wasGymAddedLocally) {
            startTransition(async () => {
                try {
                    const safeName = newGym.name.replace(/'/g, "''");
                    const safeEmail = newGym.ownerEmail.replace(/'/g, "''");
                    const insertQuery = `
            INSERT INTO gyms (id, name, owner_email, formatted_gym_id, created_at, status) 
            VALUES ('${newGym.id}', '${safeName}', '${safeEmail}', '${newGym.formattedGymId}', '${newGym.creationDate}', '${newGym.status}')
          `;
                    const { error: dbError } = await flux.sql(insertQuery);

                    if (dbError) {
                        console.error('Error saving gym to database:', dbError);
                        toast({
                            title: "Database Error",
                            description: `Failed to save gym to database: ${dbError.message}. The gym was added locally. Check console for details.`,
                            variant: "destructive",
                        });
                        return;
                    }

                    toast({
                        title: "Gym Saved to Database",
                        description: `${newGym.name} has been successfully saved to the database.`,
                    });

                    const emailResult = await sendWelcomeEmailAction({
                        name: newGym.name,
                        ownerEmail: newGym.ownerEmail,
                        formattedGymId: newGym.formattedGymId,
                    });

                    if (emailResult.success) {
                        toast({
                            title: "Welcome Email Sent",
                            description: `An email has been sent to ${newGym.ownerEmail}.`,
                        });
                    } else {
                        toast({
                            title: "Email Sending Failed",
                            description: emailResult.error || "Could not send the welcome email. The gym was created and saved to DB, but please notify the owner manually.",
                            variant: "destructive",
                        });
                    }
                } catch (error) {
                    console.error('Error during gym creation process:', error);
                    toast({
                        title: "Operation Error",
                        description: "An unexpected error occurred during the gym creation process. Check console for details.",
                        variant: "destructive",
                    });
                }
            });
            reset();
            setIsOpen(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!isDialogSubmitting) {
                setIsOpen(open);
                if (!open) reset();
            }
        }}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle size={18} className="mr-2" />
                    Create New Gym
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="font-headline">Create New Gym</DialogTitle>
                    <DialogDescription>
                        Fill in the details below to add a new gym to the system. It will be saved to the database and an email will be sent to the owner.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="name" className="text-right">
                            Gym Name
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="name"
                                {...register('name')}
                                className={errors.name ? 'border-destructive' : ''}
                                placeholder="Example Fitness Center"
                                disabled={isDialogSubmitting}
                            />
                            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="ownerEmail" className="text-right">
                            Owner Email
                        </Label>
                        <div className="col-span-3">
                            <Input
                                id="ownerEmail"
                                type="email"
                                {...register('ownerEmail')}
                                className={errors.ownerEmail ? 'border-destructive' : ''}
                                placeholder="owner@example.com"
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
                                    Processing...
                                </>
                            ) : (
                                'Create Gym, Save & Send Email'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';
import { flux } from '@/lib/flux/client';
import type { Gym, GymRequest } from '@/types';
import { generateFormattedGymId, generateUUID } from '@/lib/utils';
import { sendWelcomeEmailAction, sendRejectionEmailAction } from '@/app/actions/gymActions';
import { Loader2, UserPlus, Info, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react';

interface GymRequestsDialogProps {
    onGymApproved: (newGym: Gym) => void;
    existingGymFormattedIds: string[];
}

export function GymRequestsDialog({ onGymApproved, existingGymFormattedIds }: GymRequestsDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [requests, setRequests] = useState<GymRequest[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isProcessing, startProcessTransition] = useTransition();
    const [processingId, setProcessingId] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchRequests = useCallback(async () => {
        if (!isOpen) return;
        setIsLoading(true);
        try {
            const { rows: data, error } = await flux.sql(
                "SELECT * FROM gym_requests WHERE status = 'pending' ORDER BY created_at ASC"
            );

            if (error) throw error;

            setRequests(data || []);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            toast({
                title: 'Error Fetching Requests',
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }, [isOpen, toast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleApprove = (request: GymRequest) => {
        setProcessingId(request.id);
        startProcessTransition(async () => {
            try {
                let newFormattedGymId = generateFormattedGymId();
                while (existingGymFormattedIds.includes(newFormattedGymId)) {
                    newFormattedGymId = generateFormattedGymId();
                }

                const newGym: Gym = {
                    id: generateUUID(),
                    name: request.gym_name,
                    ownerEmail: request.email,
                    formattedGymId: newFormattedGymId,
                    creationDate: new Date().toISOString(),
                    status: 'active',
                    activeMembersCount: 0,
                    monthlyRevenue: 0,
                };

                // 1. Create the gym in the 'gyms' table
                const safeName = newGym.name.replace(/'/g, "''");
                const safeEmail = newGym.ownerEmail.replace(/'/g, "''");

                const insertQuery = `
          INSERT INTO gyms (id, name, owner_email, formatted_gym_id, created_at, status) 
          VALUES ('${newGym.id}', '${safeName}', '${safeEmail}', '${newGym.formattedGymId}', '${newGym.creationDate}', '${newGym.status}')
        `;
                const { error: gymInsertError } = await flux.sql(insertQuery);

                if (gymInsertError) {
                    throw new Error(`Failed to create gym: ${gymInsertError.message}`);
                }

                // 2. Update the request status to 'approved'
                const { error: requestUpdateError } = await flux.sql(
                    `UPDATE gym_requests SET status = 'approved' WHERE id = '${request.id}'`
                );

                if (requestUpdateError) {
                    // This toast is important for debugging RLS issues.
                    toast({ title: "Database Warning", description: `Gym created, but failed to update request status: ${requestUpdateError.message}. Check RLS policies.`, variant: 'warning' });
                    console.error("Failed to update request status:", requestUpdateError);
                }

                // 3. Send welcome email
                const emailResult = await sendWelcomeEmailAction({
                    name: newGym.name,
                    ownerEmail: newGym.ownerEmail,
                    formattedGymId: newGym.formattedGymId,
                });

                if (!emailResult.success) {
                    toast({ title: "Email Failed", description: emailResult.error || "Gym created, but failed to send welcome email.", variant: 'warning' });
                }

                toast({ title: "Gym Approved", description: `"${newGym.name}" has been created successfully.` });

                // 4. Update UI
                onGymApproved(newGym);
                setRequests(prev => prev.filter(r => r.id !== request.id));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during approval.';
                toast({
                    title: "Approval Error",
                    description: errorMessage,
                    variant: "destructive",
                });
                console.error("Approval process failed:", error);
            } finally {
                setProcessingId(null);
            }
        });
    };

    const handleReject = (request: GymRequest) => {
        setProcessingId(request.id);
        startProcessTransition(async () => {
            try {
                // 1. Update the request status to 'rejected'
                const { error: requestUpdateError } = await flux.sql(
                    `UPDATE gym_requests SET status = 'rejected' WHERE id = '${request.id}'`
                );

                if (requestUpdateError) {
                    throw new Error(`Failed to update request status: ${requestUpdateError.message}. Check RLS policies.`);
                }

                // 2. Send rejection email
                const emailResult = await sendRejectionEmailAction({
                    gym_name: request.gym_name,
                    email: request.email,
                });

                if (!emailResult.success) {
                    toast({ title: "Email Failed", description: emailResult.error || "Request rejected, but failed to send rejection email.", variant: 'warning' });
                }

                toast({ title: "Request Rejected", description: `Request for "${request.gym_name}" has been rejected.` });

                // 3. Update UI
                setRequests(prev => prev.filter(r => r.id !== request.id));

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during rejection.';
                toast({
                    title: "Rejection Error",
                    description: errorMessage,
                    variant: "destructive",
                });
                console.error("Rejection process failed:", error);
            } finally {
                setProcessingId(null);
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button>
                    <UserPlus size={18} className="mr-2" />
                    View Gym Requests
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-[95vw] sm:w-full sm:max-w-4xl rounded-lg flex flex-col h-[80vh]">
                <DialogHeader>
                    <DialogTitle>Pending Gym Requests</DialogTitle>
                    <DialogDescription>
                        Review and approve or reject new gym registrations.
                    </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex-grow overflow-hidden">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <p className="ml-2">Loading requests...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-8">
                            <Info size={40} className="text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold">No Pending Requests</h3>
                            <p className="text-muted-foreground">There are currently no new gym requests to review.</p>
                        </div>
                    ) : (
                        <div className="h-full w-full overflow-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[150px]">Gym Name</TableHead>
                                        <TableHead className="min-w-[150px]">Owner</TableHead>
                                        <TableHead className="min-w-[200px]">Email</TableHead>
                                        <TableHead className="min-w-[120px]">Phone</TableHead>
                                        <TableHead className="min-w-[120px]">City</TableHead>
                                        <TableHead className="text-right sticky right-0 bg-background/95 min-w-[100px]">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell className="font-medium">{req.gym_name}</TableCell>
                                            <TableCell>{req.owner_name}</TableCell>
                                            <TableCell>{req.email}</TableCell>
                                            <TableCell>{req.phone}</TableCell>
                                            <TableCell>{req.city}</TableCell>
                                            <TableCell className="text-right sticky right-0 bg-background/95">
                                                {isProcessing && processingId === req.id ? (
                                                    <Button size="sm" disabled>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Processing...
                                                    </Button>
                                                ) : (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="outline" size="sm">
                                                                Actions <MoreHorizontal className="ml-2 h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onSelect={() => handleApprove(req)}>
                                                                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                                                                Approve
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleReject(req)} className="text-red-600 focus:text-red-600">
                                                                <XCircle className="mr-2 h-4 w-4" />
                                                                Reject
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

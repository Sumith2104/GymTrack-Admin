"use client";

import { useEffect, useState, useTransition, useCallback } from 'react';
import { GymRequestsDialog } from '@/components/dashboard/GymRequestsDialog';
import { GymTable } from '@/components/dashboard/GymTable';
import type { Gym, Member } from '@/types';
import { GYMS_KEY } from '@/lib/constants';
import { useToast } from '@/hooks/use-toast';
import { Users, Landmark, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { flux } from '@/lib/flux/client';
import { sendPromotionalEmailAction, sendGymStatusChangeEmailAction } from '@/app/actions/gymActions';
import { ComposeEmailDialog } from '@/components/dashboard/ComposeEmailDialog';

interface EmailFormData {
    subject: string;
    body: string;
}

export default function DashboardPage() {
    const [gyms, setGyms] = useState<Gym[]>([]);
    const [isClient, setIsClient] = useState(false);
    const { toast } = useToast();
    const [isEmailSending, startEmailTransition] = useTransition();
    const [isStatusUpdating, startStatusUpdateTransition] = useTransition();

    const [totalActiveMembers, setTotalActiveMembers] = useState(0);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingGyms, setIsLoadingGyms] = useState(true);

    const [isComposeEmailDialogOpen, setIsComposeEmailDialogOpen] = useState(false);
    const [gymIdsForCustomEmail, setGymIdsForCustomEmail] = useState<string[]>([]);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const loadGyms = useCallback(async (isRefreshing = false) => {
        if (!isClient) return;
        if (!isRefreshing) setIsLoadingGyms(true);
        let finalGymsToSet: Gym[] = [];

        try {
            const { rows: fetchedSupabaseGyms, error: supabaseError } = await flux.sql(
                'SELECT * FROM gyms ORDER BY created_at DESC'
            );

            if (supabaseError) {
                const isNetworkError = supabaseError.message && typeof supabaseError.message === 'string' && supabaseError.message.toLowerCase().includes('failed to fetch');
                console.error('Supabase error object:', supabaseError);
                console.error(`Error fetching gyms from Supabase (message): ${supabaseError.message || 'No message available'}`);
                toast({
                    title: isNetworkError ? 'Network Error' : 'Failed to Fetch Gyms',
                    description: isNetworkError
                        ? 'Could not connect to the database. Please check your internet connection and Supabase URL/key configuration. Trying local cache.'
                        : `Database error: ${supabaseError.message || 'Details in console'}. Trying local cache.`,
                    variant: 'destructive',
                });

                const storedGyms = localStorage.getItem(GYMS_KEY);
                if (storedGyms) {
                    try {
                        const parsedItems = JSON.parse(storedGyms);
                        if (Array.isArray(parsedItems)) {
                            finalGymsToSet = parsedItems.map((item: any) => ({
                                id: String(item.id || ''),
                                name: String(item.name || ''),
                                ownerEmail: String(item.ownerEmail || item.owner_email || ''),
                                formattedGymId: String(item.formattedGymId || item.formatted_gym_id || ''),
                                creationDate: String(item.creationDate || item.created_at || new Date().toISOString()),
                                status: (item.status === 'active' || item.status === 'inactive' || item.status === 'inactive soon') ? item.status : 'active',
                                activeMembersCount: Number(item.activeMembersCount || 0),
                                monthlyRevenue: Number(item.monthlyRevenue || 0),
                            })).filter((gym: any) => gym.id && gym.name);
                        } else {
                            console.warn("Gyms data in localStorage is not an array or is invalid.");
                        }
                    } catch (e) {
                        console.error("Failed to parse gyms from localStorage.", e);
                        localStorage.removeItem(GYMS_KEY);
                    }
                }
            } else if (fetchedSupabaseGyms) {
                finalGymsToSet = fetchedSupabaseGyms.map((gym: any) => ({
                    id: String(gym.id || ''),
                    name: String(gym.name || ''),
                    ownerEmail: String(gym.owner_email || ''),
                    formattedGymId: String(gym.formatted_gym_id || ''),
                    creationDate: String(gym.created_at || new Date().toISOString()),
                    status: (gym.status === 'active' || gym.status === 'inactive' || gym.status === 'inactive soon') ? gym.status : 'active',
                    activeMembersCount: 0,
                    monthlyRevenue: 0,
                })).filter((g: any) => g.id && g.name);

                localStorage.setItem(GYMS_KEY, JSON.stringify(finalGymsToSet));
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            console.error('Unexpected error during gym fetch process:', err);
            toast({
                title: 'Gym Loading Error',
                description: `An unexpected error occurred: ${errorMessage}. Check console for details.`,
                variant: 'destructive',
            });
        }

        setGyms(finalGymsToSet);
        setIsLoadingGyms(false);
    }, [isClient, toast]);

    useEffect(() => {
        loadGyms();
    }, [loadGyms]);

    useEffect(() => {
        if (isClient && !isLoadingGyms) {
            localStorage.setItem(GYMS_KEY, JSON.stringify(gyms));
        }
    }, [gyms, isClient, isLoadingGyms]);

    const fetchAndProcessMemberStats = useCallback(async (currentGyms: Gym[]) => {
        if (!isClient || currentGyms.length === 0) {
            if (isClient && currentGyms.length === 0) {
                setTotalActiveMembers(0);
                setGyms(prevGyms => {
                    const shouldUpdate = prevGyms.some(g => (g.activeMembersCount ?? 0) !== 0 || (g.monthlyRevenue ?? 0) !== 0);
                    if (shouldUpdate) {
                        return prevGyms.map(g => ({ ...g, activeMembersCount: 0, monthlyRevenue: 0 }));
                    }
                    return prevGyms;
                });
                setIsLoadingStats(false);
            }
            return;
        }

        setIsLoadingStats(true);
        try {
            const query = `
        SELECT m.id, m.gym_id, m.membership_status, p.price 
        FROM members m 
        LEFT JOIN plans p ON m.plan_id = p.id 
        WHERE m.membership_status = 'active'
      `;
            const { rows: membersData, error } = await flux.sql(query);

            if (error) {
                console.error('Error fetching member stats (Supabase error):', error);
                toast({
                    title: 'Error Fetching Member Stats',
                    description: `Could not load member statistics: ${error.message}. Stats may be inaccurate.`,
                    variant: 'destructive',
                });
                setTotalActiveMembers(0);
                setGyms(prevGymsState => {
                    let statsChanged = false;
                    const updatedGyms = prevGymsState.map(g => {
                        const newActiveMembersCount = 0;
                        const newMonthlyRevenue = 0;
                        if ((g.activeMembersCount ?? 0) !== newActiveMembersCount || (g.monthlyRevenue ?? 0) !== newMonthlyRevenue) {
                            statsChanged = true;
                        }
                        return { ...g, activeMembersCount: newActiveMembersCount, monthlyRevenue: newMonthlyRevenue };
                    });
                    return statsChanged ? updatedGyms : prevGymsState;
                });
            } else if (membersData) {
                setTotalActiveMembers(membersData.length);

                setGyms(prevGymsState => {
                    let hasStatsChanged = false;
                    const newGymsWithStats = prevGymsState.map(gym => {
                        let gymActiveMembersCount = 0;
                        let gymMonthlyRevenue = 0;
                        membersData.forEach((member: any) => {
                            if (member.gym_id === gym.id) {
                                gymActiveMembersCount++;
                                const price = (member.price && typeof member.price === 'number') ? member.price : 0;
                                gymMonthlyRevenue += price;
                            }
                        });
                        if (gym.activeMembersCount !== gymActiveMembersCount || gym.monthlyRevenue !== gymMonthlyRevenue) {
                            hasStatsChanged = true;
                        }
                        return { ...gym, activeMembersCount: gymActiveMembersCount, monthlyRevenue: gymMonthlyRevenue };
                    });

                    return hasStatsChanged ? newGymsWithStats : prevGymsState;
                });
            } else {
                setTotalActiveMembers(0);
                setGyms(prevGymsState => {
                    let statsChanged = false;
                    const updatedGyms = prevGymsState.map(g => {
                        const newActiveMembersCount = 0;
                        const newMonthlyRevenue = 0;
                        if ((g.activeMembersCount ?? 0) !== newActiveMembersCount || (g.monthlyRevenue ?? 0) !== newMonthlyRevenue) {
                            statsChanged = true;
                        }
                        return { ...g, activeMembersCount: newActiveMembersCount, monthlyRevenue: newMonthlyRevenue };
                    });
                    return statsChanged ? updatedGyms : prevGymsState;
                });
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred.';
            console.error('Unexpected error fetching member stats (e.g. network error):', err);
            toast({
                title: 'Error Fetching Member Stats',
                description: `Could not load member statistics: ${errorMessage}. Stats may be inaccurate.`,
                variant: 'destructive',
            });
            setTotalActiveMembers(0);
            setGyms(prevGymsState => {
                let statsChanged = false;
                const updatedGyms = prevGymsState.map(g => {
                    const newActiveMembersCount = 0;
                    const newMonthlyRevenue = 0;
                    if ((g.activeMembersCount ?? 0) !== newActiveMembersCount || (g.monthlyRevenue ?? 0) !== newMonthlyRevenue) {
                        statsChanged = true;
                    }
                    return { ...g, activeMembersCount: newActiveMembersCount, monthlyRevenue: newMonthlyRevenue };
                });
                return statsChanged ? updatedGyms : prevGymsState;
            });
        } finally {
            setIsLoadingStats(false);
        }
    }, [isClient, toast]);

    useEffect(() => {
        if (isClient && !isLoadingGyms && gyms) {
            if (gyms.length > 0) {
                fetchAndProcessMemberStats(gyms);
            } else {
                setTotalActiveMembers(0);
                setGyms(prevGyms => {
                    if (prevGyms.length === 0 && prevGyms.every(g => (g.activeMembersCount ?? 0) === 0 && (g.monthlyRevenue ?? 0) === 0)) {
                        return prevGyms;
                    }
                    return [];
                });
                setIsLoadingStats(false);
            }
        }
    }, [isClient, isLoadingGyms, gyms, fetchAndProcessMemberStats]);


    const handleGymApproved = (newGym: Gym) => {
        const gymWithDefaults = {
            ...newGym,
            activeMembersCount: newGym.activeMembersCount ?? 0,
            monthlyRevenue: newGym.monthlyRevenue ?? 0,
        };
        setGyms((prevGyms) => [gymWithDefaults, ...prevGyms]);
        fetchAndProcessMemberStats([gymWithDefaults, ...gyms]);
    };

    const handleDeleteGyms = async (gymIdsToDelete: string[]) => {
        let hasError = false;
        let errorMessage = "";
        const successfullyDeletedIds: string[] = [];

        const deletePromises = gymIdsToDelete.map(async (id) => {
            const cleanId = id.replace(/'/g, "''");

            // Cascade delete related records concurrently for this gym
            await Promise.all([
                flux.sql(`DELETE FROM check_ins WHERE gym_id = '${cleanId}'`),
                flux.sql(`DELETE FROM members WHERE gym_id = '${cleanId}'`),
                flux.sql(`DELETE FROM plans WHERE gym_id = '${cleanId}'`),
                flux.sql(`DELETE FROM announcements WHERE gym_id = '${cleanId}'`)
            ]);

            const query = `DELETE FROM gyms WHERE id = '${cleanId}'`;
            const { error } = await flux.sql(query);
            if (error) {
                hasError = true;
                errorMessage = error.message;
            } else {
                successfullyDeletedIds.push(id);
            }
        });

        await Promise.all(deletePromises);

        if (successfullyDeletedIds.length > 0) {
            setGyms((prevGyms) => prevGyms.filter(gym => !successfullyDeletedIds.includes(gym.id)));
            toast({
                title: `${successfullyDeletedIds.length} Gym(s) Deleted`,
                description: "Selected gym(s) have been permanently removed from the database.",
            });
        }

        if (hasError) {
            toast({
                title: "Some Deletes Failed",
                description: `Could not delete all selected gym(s): ${errorMessage}`,
                variant: "destructive",
            });
        }
    };

    const handleSetGymsStatus = async (gymIdsToUpdate: string[], newStatus: 'active' | 'inactive' | 'inactive soon') => {
        startStatusUpdateTransition(async () => {
            let successDbCount = 0;
            let failDbCount = 0;
            let emailSuccessCount = 0;
            let emailFailCount = 0;

            const updates = gymIdsToUpdate.map(async (gymId) => {
                const safeStatus = newStatus.replace(/'/g, "''");
                const safeGymId = gymId.replace(/'/g, "''");
                const query = `UPDATE gyms SET status = '${safeStatus}' WHERE id = '${safeGymId}'`;
                const { error } = await flux.sql(query);

                if (error) {
                    console.error(`Error updating status for gym ${gymId} in DB:`, error);
                    failDbCount++;
                    return { gymId, dbSuccess: false };
                }
                successDbCount++;
                return { gymId, dbSuccess: true };
            });

            const dbResults = await Promise.all(updates);

            const updatedGymsLocally = gyms.map(gym =>
                gymIdsToUpdate.includes(gym.id) ? { ...gym, status: newStatus } : gym
            );
            setGyms(updatedGymsLocally);

            if (newStatus === 'inactive' || newStatus === 'inactive soon') {
                for (const result of dbResults) {
                    if (result.dbSuccess) {
                        const gymDetails = updatedGymsLocally.find(g => g.id === result.gymId);
                        if (gymDetails) {
                            const emailResult = await sendGymStatusChangeEmailAction(
                                { name: gymDetails.name, ownerEmail: gymDetails.ownerEmail, formattedGymId: gymDetails.formattedGymId },
                                newStatus
                            );
                            if (emailResult.success) {
                                emailSuccessCount++;
                            } else {
                                emailFailCount++;
                                console.error(`Failed to send status change email to ${gymDetails.ownerEmail}: ${emailResult.error}`);
                            }
                        }
                    }
                }
            }

            if (successDbCount > 0) {
                toast({
                    title: "Gym Status Updated",
                    description: `${successDbCount} gym(s) successfully marked as ${newStatus} in the database and locally.`,
                });
            }
            if (failDbCount > 0) {
                toast({
                    title: "Some Status Updates Failed",
                    description: `Failed to update status for ${failDbCount} gym(s) in the database. Local state might be ahead. Check console.`,
                    variant: "destructive",
                });
            }
            if ((newStatus === 'inactive' || newStatus === 'inactive soon') && emailSuccessCount > 0) {
                toast({ title: "Owner Notifications Sent", description: `Successfully notified ${emailSuccessCount} gym owner(s).` });
            }
            if ((newStatus === 'inactive' || newStatus === 'inactive soon') && emailFailCount > 0) {
                toast({ title: "Some Owner Notifications Failed", description: `Failed to notify ${emailFailCount} gym owner(s). Check console.`, variant: "destructive" });
            }
            if (successDbCount === 0 && failDbCount === 0 && gymIdsToUpdate.length > 0) {
                toast({
                    title: "Status Update Attempted",
                    description: "No changes made. Gyms may have already been in the target status or an issue occurred.",
                    variant: "default",
                });
            } else if (gymIdsToUpdate.length === 0) {
                toast({
                    title: "No Gyms Selected",
                    description: "Please select gyms to update their status.",
                    variant: "default",
                });
            }
        });
    };

    const handleOpenComposeEmailDialog = (gymIdsToEmail: string[]) => {
        if (gymIdsToEmail.length === 0) {
            toast({
                title: "No Gyms Selected",
                description: "Please select gyms to send emails.",
                variant: "default",
            });
            return;
        }
        setGymIdsForCustomEmail(gymIdsToEmail);
        setIsComposeEmailDialogOpen(true);
    };

    const handleDispatchComposedEmail = (formData: EmailFormData) => {
        startEmailTransition(async () => {
            let successCount = 0;
            let failCount = 0;
            const gymsToEmailList = gyms.filter(gym => gymIdsForCustomEmail.includes(gym.id));

            for (const gym of gymsToEmailList) {
                const emailResult = await sendPromotionalEmailAction(
                    {
                        name: gym.name,
                        ownerEmail: gym.ownerEmail,
                        formattedGymId: gym.formattedGymId,
                    },
                    formData.subject,
                    formData.body
                );
                if (emailResult.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`Failed to send custom email to ${gym.ownerEmail}: ${emailResult.error}`);
                }
            }

            if (successCount > 0) {
                toast({
                    title: "Custom Emails Sent",
                    description: `Successfully sent ${successCount} custom email(s).`,
                });
            }
            if (failCount > 0) {
                toast({
                    title: "Some Custom Emails Failed",
                    description: `Failed to send ${failCount} custom email(s). Check console for details.`,
                    variant: "destructive",
                });
            }
            setGymIdsForCustomEmail([]);
            setIsComposeEmailDialogOpen(false);
        });
    };

    const handleRefreshData = useCallback(async () => {
        toast({ title: "Refreshing Data...", description: "Fetching latest gym and statistics information." });
        setIsLoadingGyms(true);
        setIsLoadingStats(true);
        await loadGyms(true);
    }, [loadGyms, toast]);


    if (!isClient) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Initializing Dashboard...</p>
            </div>
        );
    }

    if (isLoadingGyms && gyms.length === 0) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading Dashboard Data...</p>
            </div>
        );
    }

    const totalGymsCount = gyms.length;
    const existingGymFormattedIds = gyms.map(g => g.formattedGymId);
    const isRefreshing = isLoadingGyms || isLoadingStats;

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold font-headline tracking-tight">Gym Management Dashboard</h2>
                    <p className="text-muted-foreground">
                        Oversee and manage all registered gyms.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleRefreshData} variant="outline" disabled={isRefreshing}>
                        <RefreshCw size={18} className={`mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh Data
                    </Button>
                    <GymRequestsDialog onGymApproved={handleGymApproved} existingGymFormattedIds={existingGymFormattedIds} />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="shadow-lg border-0">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Gyms</CardTitle>
                        {isLoadingGyms ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : <Landmark className="h-5 w-5 text-primary" />}
                    </CardHeader>
                    <CardContent>
                        {isLoadingGyms ? (
                            <Loader2 className="h-7 w-7 animate-spin text-primary" />
                        ) : (
                            <div className="text-3xl font-bold">{totalGymsCount}</div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Number of gyms in the system
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-lg border-0">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Active Members</CardTitle>
                        {isLoadingStats ? <Loader2 className="h-5 w-5 animate-spin text-accent" /> : <Users className="h-5 w-5 text-accent" />}
                    </CardHeader>
                    <CardContent>
                        {isLoadingStats ? (
                            <Loader2 className="h-7 w-7 animate-spin text-accent" />
                        ) : (
                            <div className="text-3xl font-bold">{totalActiveMembers.toLocaleString()}</div>
                        )}
                        <p className="text-xs text-muted-foreground">
                            Across all gyms
                        </p>
                    </CardContent>
                </Card>
            </div>

            <GymTable
                gyms={gyms}
                onDeleteGyms={handleDeleteGyms}
                onSetGymsStatus={handleSetGymsStatus}
                onSendCustomEmail={handleOpenComposeEmailDialog}
                isEmailSending={isEmailSending}
                isStatusUpdating={isStatusUpdating}
                isLoadingStats={isLoadingStats}
            />

            <ComposeEmailDialog
                isOpen={isComposeEmailDialogOpen}
                onOpenChange={setIsComposeEmailDialogOpen}
                onSubmitEmail={handleDispatchComposedEmail}
                isSending={isEmailSending}
                recipientCount={gymIdsForCustomEmail.length}
            />
        </div>
    );
}

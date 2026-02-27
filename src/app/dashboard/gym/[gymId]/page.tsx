"use client";

import { useEffect, useState, useTransition, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { flux } from '@/lib/flux/client';
import type { Gym, Member, Plan, CheckIn, Announcement } from '@/types';
import { ArrowLeft, Loader2, Save, Mail, Users, DollarSign, Info, Power, PowerOff, AlertTriangle, ChevronDown, Database, Package, ClipboardCheck, Megaphone } from 'lucide-react';
import { ComposeEmailDialog } from '@/components/dashboard/ComposeEmailDialog';
import { sendPromotionalEmailAction, sendGymStatusChangeEmailAction } from '@/app/actions/gymActions';
import { MembersTable } from '@/components/dashboard/MembersTable';
import { PlansTable } from '@/components/dashboard/PlansTable';
import { CheckInsTable } from '@/components/dashboard/CheckInsTable';
import { AnnouncementsTable } from '@/components/dashboard/AnnouncementsTable';
import { format } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { AddEditPlanDialog } from '@/components/dashboard/AddEditPlanDialog';
import { AddEditAnnouncementDialog } from '@/components/dashboard/AddEditAnnouncementDialog';
import { AddEditMemberDialog } from '@/components/dashboard/AddEditMemberDialog';
import { DeleteConfirmationDialog } from '@/components/dashboard/DeleteConfirmationDialog';
import { generateUUID } from '@/lib/utils';


const editGymSchema = z.object({
    name: z.string().min(1, { message: 'Gym name is required' }),
    ownerEmail: z.string().email({ message: 'Invalid owner email address' }),
});

type EditGymFormInputs = z.infer<typeof editGymSchema>;

interface EmailFormData {
    subject: string;
    body: string;
}

type DialogType = 'edit-plan' | 'add-plan' | 'edit-member' | 'add-member' | 'edit-announcement' | 'add-announcement' | 'delete-plan' | 'delete-member' | 'delete-announcement' | 'delete-checkin';

interface DialogState {
    type: DialogType | null;
    data: any | null;
    isOpen: boolean;
}

export default function GymDetailPage() {
    const params = useParams();
    const router = useRouter();
    const gymId = params.gymId as string;
    const { toast } = useToast();

    const [gym, setGym] = useState<Gym | null>(null);
    const [members, setMembers] = useState<Member[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);

    const [activeMembersCount, setActiveMembersCount] = useState(0);
    const [monthlyRevenue, setMonthlyRevenue] = useState(0);

    const [isLoading, setIsLoading] = useState({
        gym: true,
        members: true,
        plans: true,
        checkIns: true,
        announcements: true
    });

    const [isSaving, startSaveTransition] = useTransition();
    const [isEmailSending, startEmailTransition] = useTransition();
    const [isStatusUpdating, startStatusTransition] = useTransition();
    const [isSubmitting, startSubmitTransition] = useTransition();

    const [isComposeEmailDialogOpen, setIsComposeEmailDialogOpen] = useState(false);
    const [dialogState, setDialogState] = useState<DialogState>({ type: null, data: null, isOpen: false });

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting: isFormSubmitting },
    } = useForm<EditGymFormInputs>({
        resolver: zodResolver(editGymSchema),
    });

    const openDialog = (type: DialogType, data: any = null) => setDialogState({ type, data, isOpen: true });
    const closeDialog = () => setDialogState({ type: null, data: null, isOpen: false });


    const fetchAllData = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, gym: true, members: true, plans: true, checkIns: true, announcements: true }));
        try {
            const [gymResult, membersResult, plansResult, checkInsResult, announcementsResult] = await Promise.all([
                flux.sql(`SELECT * FROM gyms WHERE id = '${gymId}' LIMIT 1`),
                flux.sql(`SELECT m.*, p.plan_name as plan_name_joined, p.price as plan_price_joined FROM members m LEFT JOIN plans p ON m.plan_id = p.id WHERE m.gym_id = '${gymId}' ORDER BY m.created_at DESC`),
                flux.sql(`SELECT * FROM plans WHERE gym_id = '${gymId}' ORDER BY plan_name ASC`),
                flux.sql(`SELECT c.*, m.name, m.email FROM check_ins c LEFT JOIN members m ON c.member_table_id = m.id WHERE c.gym_id = '${gymId}' ORDER BY c.created_at DESC LIMIT 100`),
                flux.sql(`SELECT * FROM announcements WHERE gym_id = '${gymId}' ORDER BY created_at DESC`)
            ]);

            // Gym
            if (gymResult.error || !gymResult.rows || gymResult.rows.length === 0) throw new Error(gymResult.error?.message || 'Gym not found.');
            const gymData = gymResult.rows[0];
            const typedGymData: Gym = {
                id: String(gymData.id || ''), name: String(gymData.name || ''), ownerEmail: String(gymData.owner_email || ''), formattedGymId: String(gymData.formatted_gym_id || ''), creationDate: String(gymData.created_at || new Date().toISOString()), status: (gymData.status === 'active' || gymData.status === 'inactive' || gymData.status === 'inactive soon') ? gymData.status : 'active',
            };
            setGym(typedGymData);
            setValue('name', typedGymData.name);
            setValue('ownerEmail', typedGymData.ownerEmail);
            setIsLoading(prev => ({ ...prev, gym: false }));

            // Members
            if (membersResult.error) { toast({ title: "Error Fetching Members", description: membersResult.error.message, variant: "destructive" }); }
            else {
                const typedMembers: Member[] = (membersResult.rows || []).map((m: any) => ({
                    id: String(m.id), gym_id: String(m.gym_id), plan_id: m.plan_id ? String(m.plan_id) : undefined, member_id: m.member_id ? String(m.member_id) : undefined, name: m.name ? String(m.name) : undefined, email: m.email ? String(m.email) : undefined, membership_status: m.membership_status ? String(m.membership_status) : undefined, created_at: m.created_at ? String(m.created_at) : undefined, age: typeof m.age === 'number' ? m.age : undefined, phone_number: m.phone_number ? String(m.phone_number) : undefined, join_date: m.join_date ? String(m.join_date) : undefined, expiry_date: m.expiry_date ? String(m.expiry_date) : undefined,
                    plans: m.plan_name_joined ? { plan_name: m.plan_name_joined, price: m.plan_price_joined } : null,
                }));
                setMembers(typedMembers);
                let currentGymActiveMembers = 0;
                let currentGymMonthlyRevenue = 0;
                typedMembers.forEach((member) => {
                    if (member.membership_status === 'active') {
                        currentGymActiveMembers++;
                        const price = (member.plans && typeof member.plans.price === 'number') ? member.plans.price : 0;
                        currentGymMonthlyRevenue += price;
                    }
                });
                setActiveMembersCount(currentGymActiveMembers);
                setMonthlyRevenue(currentGymMonthlyRevenue);
            }
            setIsLoading(prev => ({ ...prev, members: false }));

            // Plans
            if (plansResult.error) { toast({ title: "Error Fetching Plans", description: plansResult.error.message, variant: "destructive" }); }
            else setPlans(plansResult.rows || []);
            setIsLoading(prev => ({ ...prev, plans: false }));

            // Check-ins
            if (checkInsResult.error) { toast({ title: "Error Fetching Check-ins", description: checkInsResult.error.message, variant: "destructive" }); }
            else {
                const typedCheckIns = (checkInsResult.rows || []).map((c: any) => ({
                    ...c,
                    members: { name: c.name, email: c.email }
                }));
                setCheckIns(typedCheckIns);
            }
            setIsLoading(prev => ({ ...prev, checkIns: false }));

            // Announcements
            if (announcementsResult.error) { toast({ title: "Error Fetching Announcements", description: announcementsResult.error.message, variant: "destructive" }); }
            else setAnnouncements(announcementsResult.rows || []);
            setIsLoading(prev => ({ ...prev, announcements: false }));
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
            toast({ title: "Failed to Load Gym Data", description: errorMessage, variant: "destructive" });
            router.push('/dashboard');
        }
    }, [gymId, router, toast, setValue]);

    useEffect(() => {
        if (!gymId) {
            toast({ title: "Error", description: "Gym ID is missing.", variant: "destructive" });
            router.push('/dashboard');
            return;
        }
        fetchAllData();
    }, [gymId, router, toast, fetchAllData]);

    const onSubmitEdit: SubmitHandler<EditGymFormInputs> = async (data) => {
        if (!gym) return;
        startSaveTransition(async () => {
            try {
                const query = `UPDATE gyms SET name = '${data.name.replace(/'/g, "''")}', owner_email = '${data.ownerEmail.replace(/'/g, "''")}' WHERE id = '${gym.id}'`;
                const { error } = await flux.sql(query);
                if (error) throw error;
                setGym(prevGym => prevGym ? { ...prevGym, name: data.name, ownerEmail: data.ownerEmail } : null);
                toast({ title: "Gym Updated", description: "Gym details saved successfully." });
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                toast({ title: "Update Failed", description: errorMessage, variant: "destructive" });
            }
        });
    };

    const handleSavePlan = async (planData: Omit<Plan, 'id' | 'gym_id' | 'created_at'>, id?: string) => {
        startSubmitTransition(async () => {
            const dataToUpsert = { ...planData, id: id || generateUUID(), gym_id: gymId };
            const safeName = (dataToUpsert.plan_name || '').replace(/'/g, "''");
            const safeDesc = dataToUpsert.description ? dataToUpsert.description.replace(/'/g, "''") : '';
            const query = `
            INSERT INTO plans (id, gym_id, plan_name, price, duration_days, description) 
            VALUES ('${dataToUpsert.id}', '${dataToUpsert.gym_id}', '${safeName}', ${dataToUpsert.price}, ${dataToUpsert.duration_days}, '${safeDesc}')
            ON CONFLICT (id) DO UPDATE SET 
              plan_name = EXCLUDED.plan_name,
              price = EXCLUDED.price,
              duration_days = EXCLUDED.duration_days,
              description = EXCLUDED.description
          `;
            const { error } = await flux.sql(query);
            if (error) {
                toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Plan Saved', description: `Plan "${planData.plan_name}" has been saved.` });
                if (id) { // Edit
                    setPlans(plans.map(p => p.id === id ? { ...p, ...dataToUpsert } as Plan : p));
                } else { // Add
                    setPlans([dataToUpsert as Plan, ...plans]);
                }
                closeDialog();
            }
        });
    };

    const handleSaveAnnouncement = async (announcementData: Omit<Announcement, 'id' | 'gym_id' | 'created_at'>, id?: string) => {
        startSubmitTransition(async () => {
            const dataToUpsert = { ...announcementData, id: id || generateUUID(), gym_id: gymId };
            const safeTitle = (dataToUpsert.title || '').replace(/'/g, "''");
            const safeContent = (dataToUpsert.content || '').replace(/'/g, "''");
            const query = `
            INSERT INTO announcements (id, gym_id, title, content) 
            VALUES ('${dataToUpsert.id}', '${dataToUpsert.gym_id}', '${safeTitle}', '${safeContent}')
            ON CONFLICT (id) DO UPDATE SET 
              title = EXCLUDED.title,
              content = EXCLUDED.content
          `;
            const { error } = await flux.sql(query);
            if (error) {
                toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Announcement Saved', description: `Announcement "${announcementData.title}" has been saved.` });
                if (id) {
                    setAnnouncements(announcements.map(a => a.id === id ? { ...a, ...dataToUpsert } as Announcement : a));
                } else {
                    setAnnouncements([{ ...dataToUpsert, created_at: new Date().toISOString() } as Announcement, ...announcements]);
                }
                closeDialog();
            }
        });
    };

    const handleSaveMember = async (memberData: any, id?: string) => {
        startSubmitTransition(async () => {
            const dataToUpsert = { ...memberData, id: id || generateUUID(), gym_id: gymId };

            const safeName = dataToUpsert.name ? `'${dataToUpsert.name.replace(/'/g, "''")}'` : 'NULL';
            const safeEmail = dataToUpsert.email ? `'${dataToUpsert.email.replace(/'/g, "''")}'` : 'NULL';
            const safePhone = dataToUpsert.phone_number ? `'${dataToUpsert.phone_number.replace(/'/g, "''")}'` : 'NULL';
            const safeJoin = dataToUpsert.join_date ? `'${dataToUpsert.join_date}'` : 'NULL';
            const safeExpiry = dataToUpsert.expiry_date ? `'${dataToUpsert.expiry_date}'` : 'NULL';
            const safeAge = dataToUpsert.age ? dataToUpsert.age : 'NULL';
            const safeMemberId = dataToUpsert.member_id ? `'${dataToUpsert.member_id.replace(/'/g, "''")}'` : 'NULL';
            const safePlanId = dataToUpsert.plan_id ? `'${dataToUpsert.plan_id}'` : 'NULL';
            const safeStatus = dataToUpsert.membership_status ? `'${dataToUpsert.membership_status}'` : "'active'";

            const query = `
            INSERT INTO members (id, gym_id, name, email, phone_number, age, join_date, expiry_date, member_id, plan_id, membership_status) 
            VALUES ('${dataToUpsert.id}', '${dataToUpsert.gym_id}', ${safeName}, ${safeEmail}, ${safePhone}, ${safeAge}, ${safeJoin}, ${safeExpiry}, ${safeMemberId}, ${safePlanId}, ${safeStatus})
            ON CONFLICT (id) DO UPDATE SET 
              name = EXCLUDED.name,
              email = EXCLUDED.email,
              phone_number = EXCLUDED.phone_number,
              age = EXCLUDED.age,
              join_date = EXCLUDED.join_date,
              expiry_date = EXCLUDED.expiry_date,
              member_id = EXCLUDED.member_id,
              plan_id = EXCLUDED.plan_id,
              membership_status = EXCLUDED.membership_status
            RETURNING *
          `;
            const { rows, error } = await flux.sql(query);
            const data = rows?.[0];

            if (error || !data) {
                toast({ title: 'Save Failed', description: error?.message || 'Failed to save member', variant: 'destructive' });
            } else {
                toast({ title: 'Member Saved', description: `Member "${memberData.name}" has been saved.` });

                // We need to fetch the plan details locally to update the UI correctly since returning * on members doesn't join
                const plan = plans.find(p => String(p.id) === String(data.plan_id));
                const formattedMember: Member = {
                    id: String(data.id), gym_id: String(data.gym_id), plan_id: data.plan_id ? String(data.plan_id) : undefined, member_id: data.member_id ? String(data.member_id) : undefined, name: data.name ? String(data.name) : undefined, email: data.email ? String(data.email) : undefined, membership_status: data.membership_status ? String(data.membership_status) : undefined, created_at: data.created_at ? String(data.created_at) : undefined, age: typeof data.age === 'number' ? data.age : undefined, phone_number: data.phone_number ? String(data.phone_number) : undefined, join_date: data.join_date ? String(data.join_date) : undefined, expiry_date: data.expiry_date ? String(data.expiry_date) : undefined,
                    plans: plan ? { plan_name: plan.plan_name, price: plan.price } : null,
                };

                if (id) {
                    setMembers(members.map(m => m.id === id ? formattedMember : m));
                } else {
                    setMembers([formattedMember, ...members]);
                }
                closeDialog();
            }
        });
    };

    const handleDelete = async () => {
        if (!dialogState.type || !dialogState.data) return;

        const { type, data } = dialogState;
        const id = data.id;
        let tableName = '';
        let stateUpdater: React.Dispatch<React.SetStateAction<any[]>> | null = null;
        let itemName = '';

        if (type.startsWith('delete-')) {
            switch (type) {
                case 'delete-plan': tableName = 'plans'; stateUpdater = setPlans; itemName = data.plan_name; break;
                case 'delete-member': tableName = 'members'; stateUpdater = setMembers; itemName = data.name; break;
                case 'delete-announcement': tableName = 'announcements'; stateUpdater = setAnnouncements; itemName = data.title; break;
                case 'delete-checkin': tableName = 'check_ins'; stateUpdater = setCheckIns; itemName = `record for ${data.members?.name}`; break;
            }
        }

        if (!tableName || !stateUpdater) return;

        startSubmitTransition(async () => {
            const { error } = await flux.sql(`DELETE FROM ${tableName} WHERE id = '${id}'`);
            if (error) {
                toast({ title: 'Delete Failed', description: error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Item Deleted', description: `${itemName || 'Item'} has been deleted.` });
                stateUpdater(prev => prev.filter(item => item.id !== id));
                closeDialog();
            }
        });
    };


    const handleDispatchComposedEmail = (formData: EmailFormData) => {
        if (!gym) return;
        startEmailTransition(async () => {
            const emailResult = await sendPromotionalEmailAction({ name: gym.name, ownerEmail: gym.ownerEmail, formattedGymId: gym.formattedGymId, }, formData.subject, formData.body);
            if (emailResult.success) {
                toast({ title: "Email Sent", description: `Successfully sent email to ${gym.ownerEmail}.` });
            } else {
                toast({ title: "Email Failed", description: emailResult.error || "Could not send email.", variant: "destructive" });
            }
            setIsComposeEmailDialogOpen(false);
        });
    };

    const handleChangeGymStatus = async (newStatus: 'active' | 'inactive' | 'inactive soon') => {
        if (!gym || gym.status === newStatus) return;
        startStatusTransition(async () => {
            try {
                const query = `UPDATE gyms SET status = '${newStatus.replace(/'/g, "''")}' WHERE id = '${gym.id}'`;
                const { error } = await flux.sql(query);
                if (error) throw error;
                setGym(prevGym => prevGym ? { ...prevGym, status: newStatus } : null);
                toast({ title: "Gym Status Updated", description: `Gym marked as ${newStatus}.` });
                if (newStatus === 'inactive' || newStatus === 'inactive soon') {
                    const emailResult = await sendGymStatusChangeEmailAction({ name: gym.name, ownerEmail: gym.ownerEmail, formattedGymId: gym.formattedGymId }, newStatus);
                    if (emailResult.success) {
                        toast({ title: "Notification Sent", description: `Owner notified about status change to ${newStatus}.` });
                    } else {
                        toast({ title: "Notification Failed", description: `Could not notify owner: ${emailResult.error}`, variant: "destructive" });
                    }
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
                toast({ title: "Status Update Failed", description: errorMessage, variant: "destructive" });
            }
        });
    };

    const formatCurrency = (value: number | undefined) => {
        if (value === undefined) return '₹0.00';
        return value.toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    const getStatusBadgeClass = (status: Gym['status']) => {
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-700 dark:bg-green-700/30 dark:text-green-400';
            case 'inactive': return 'bg-orange-500/20 text-orange-700 dark:bg-orange-700/30 dark:text-orange-400';
            case 'inactive soon': return 'bg-yellow-500/20 text-yellow-700 dark:bg-yellow-700/30 dark:text-yellow-400 border-yellow-500/30';
            default: return '';
        }
    };

    const getDialogTitle = () => {
        if (!dialogState.type) return '';
        if (dialogState.type.startsWith('add')) return `Add New ${dialogState.type.split('-')[1]}`;
        if (dialogState.type.startsWith('edit')) return `Edit ${dialogState.type.split('-')[1]}`;
        return '';
    };


    if (isLoading.gym) {
        return (
            <div className="flex h-[calc(100vh-10rem)] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="ml-3 text-lg">Loading Gym Details...</p>
            </div>
        );
    }

    if (!gym) {
        return (
            <div className="flex h-[calc(100vh-10rem)] flex-col items-center justify-center">
                <Info className="h-12 w-12 text-destructive mb-4" />
                <h2 className="text-2xl font-semibold mb-2">Gym Not Found</h2>
                <p className="text-muted-foreground mb-6">The gym you are looking for does not exist or could not be loaded.</p>
                <Button onClick={() => router.push('/dashboard')}><ArrowLeft size={18} className="mr-2" />Back to Dashboard</Button>
            </div>
        );
    }

    const isProcessing = isSaving || isFormSubmitting || isStatusUpdating;

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold font-headline tracking-tight">Manage Gym: {gym.name}</h1>
                <Button variant="outline" onClick={() => router.push('/dashboard')}><ArrowLeft size={18} className="mr-2" />Back to Dashboard</Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card className="shadow-lg border-0">
                        <CardHeader><CardTitle>Edit Gym Details</CardTitle><CardDescription>Modify the name and owner email.</CardDescription></CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit(onSubmitEdit)} className="space-y-6">
                                <div>
                                    <Label htmlFor="name">Gym Name</Label>
                                    <Input id="name" {...register('name')} className={`mt-1 ${errors.name ? 'border-destructive' : ''}`} disabled={isProcessing} />
                                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                                </div>
                                <div>
                                    <Label htmlFor="ownerEmail">Owner Email</Label>
                                    <Input id="ownerEmail" type="email" {...register('ownerEmail')} className={`mt-1 ${errors.ownerEmail ? 'border-destructive' : ''}`} disabled={isProcessing} />
                                    {errors.ownerEmail && <p className="text-sm text-destructive mt-1">{errors.ownerEmail.message}</p>}
                                </div>
                                <Button type="submit" disabled={isSaving || isFormSubmitting} className="w-full">{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save size={18} className="mr-2" />}Save Changes</Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg border-0">
                        <CardHeader><CardTitle>Gym Information</CardTitle></CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <p><strong>Formatted ID:</strong> <span className="font-mono p-1 bg-muted rounded text-xs">{gym.formattedGymId}</span></p>
                            <p><strong>Created:</strong> {format(new Date(gym.creationDate), 'dd MMM yyyy, HH:mm')}</p>
                            <div className="flex items-center justify-between pt-2">
                                <div><strong>Status:</strong> <span className={`capitalize px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(gym.status)}`}>{gym.status}</span></div>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" disabled={isStatusUpdating} className="w-[150px] justify-between">{isStatusUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><span>Change Status</span><ChevronDown size={16} /></>}</Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-[150px]">
                                        <DropdownMenuLabel>Set status to</DropdownMenuLabel><DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => handleChangeGymStatus('active')} disabled={gym.status === 'active' || isStatusUpdating}><Power size={16} className="mr-2 text-green-500" />Active</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleChangeGymStatus('inactive soon')} disabled={gym.status === 'inactive soon' || isStatusUpdating}><AlertTriangle size={16} className="mr-2 text-yellow-500" />Inactive Soon</DropdownMenuItem>
                                        <DropdownMenuItem onSelect={() => handleChangeGymStatus('inactive')} disabled={gym.status === 'inactive' || isStatusUpdating}><PowerOff size={16} className="mr-2 text-orange-500" />Inactive</DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-lg border-0">
                        <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center"><Users className="h-5 w-5 mr-2 text-accent" /> Active Members</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{isLoading.members ? <Loader2 className="h-6 w-6 animate-spin" /> : activeMembersCount.toLocaleString()}</div></CardContent>
                    </Card>
                    <Card className="shadow-lg border-0">
                        <CardHeader className="pb-2"><CardTitle className="text-base font-medium flex items-center"><DollarSign className="h-5 w-5 mr-2 text-primary" /> Monthly Revenue</CardTitle></CardHeader>
                        <CardContent><div className="text-2xl font-bold">{isLoading.members ? <Loader2 className="h-6 w-6 animate-spin" /> : formatCurrency(monthlyRevenue)}</div></CardContent>
                    </Card>

                    <Card className="shadow-lg border-0">
                        <CardHeader><CardTitle>Communication</CardTitle><CardDescription>Send a custom email to this gym's owner.</CardDescription></CardHeader>
                        <CardContent>
                            <Button onClick={() => setIsComposeEmailDialogOpen(true)} disabled={isEmailSending} className="w-full">{isEmailSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail size={18} className="mr-2" />}Send Custom Email to Owner</Button>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="shadow-lg border-0">
                        <CardHeader><CardTitle className="flex items-center gap-2"><Database size={24} /> Data Management</CardTitle><CardDescription>Manage members, plans, check-ins, and announcements for this gym.</CardDescription></CardHeader>
                        <CardContent>
                            <Tabs defaultValue="members" className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="members"><Users className="mr-2" />Members</TabsTrigger>
                                    <TabsTrigger value="plans"><Package className="mr-2" />Plans</TabsTrigger>
                                    <TabsTrigger value="check_ins"><ClipboardCheck className="mr-2" />Check-ins</TabsTrigger>
                                    <TabsTrigger value="announcements"><Megaphone className="mr-2" />Announcements</TabsTrigger>
                                </TabsList>
                                <TabsContent value="members" className="mt-4">
                                    <MembersTable members={members} isLoading={isLoading.members} onEdit={(member) => openDialog('edit-member', member)} onAdd={() => openDialog('add-member')} onDelete={(member) => openDialog('delete-member', member)} />
                                </TabsContent>
                                <TabsContent value="plans" className="mt-4">
                                    <PlansTable plans={plans} isLoading={isLoading.plans} onEdit={(plan) => openDialog('edit-plan', plan)} onAdd={() => openDialog('add-plan')} onDelete={(plan) => openDialog('delete-plan', plan)} />
                                </TabsContent>
                                <TabsContent value="check_ins" className="mt-4">
                                    <CheckInsTable checkIns={checkIns} isLoading={isLoading.checkIns} onDelete={(checkIn) => openDialog('delete-checkin', checkIn)} />
                                </TabsContent>
                                <TabsContent value="announcements" className="mt-4">
                                    <AnnouncementsTable announcements={announcements} isLoading={isLoading.announcements} onEdit={(ann) => openDialog('edit-announcement', ann)} onAdd={() => openDialog('add-announcement')} onDelete={(ann) => openDialog('delete-announcement', ann)} />
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AddEditPlanDialog
                isOpen={dialogState.isOpen && (dialogState.type === 'add-plan' || dialogState.type === 'edit-plan')}
                onOpenChange={closeDialog}
                onSave={handleSavePlan}
                isSaving={isSubmitting}
                planToEdit={dialogState.type === 'edit-plan' ? dialogState.data : null}
            />

            <AddEditAnnouncementDialog
                isOpen={!!(dialogState.isOpen && (dialogState.type === 'add-announcement' || dialogState.type === 'edit-announcement'))}
                onOpenChange={closeDialog}
                onSave={handleSaveAnnouncement}
                isSaving={isSubmitting}
                announcementToEdit={dialogState.type === 'edit-announcement' ? dialogState.data : null}
            />

            <AddEditMemberDialog
                isOpen={!!(dialogState.isOpen && (dialogState.type === 'add-member' || dialogState.type === 'edit-member'))}
                onOpenChange={closeDialog}
                onSave={handleSaveMember}
                isSaving={isSubmitting}
                memberToEdit={dialogState.type === 'edit-member' ? dialogState.data : null}
                plans={plans}
            />

            <DeleteConfirmationDialog
                isOpen={!!(dialogState.isOpen && dialogState.type?.startsWith('delete-'))}
                onOpenChange={closeDialog}
                onConfirm={handleDelete}
                isPending={isSubmitting}
                itemType={dialogState.type?.split('-')[1] || 'item'}
                itemName={dialogState.data?.name || dialogState.data?.title || dialogState.data?.plan_name || `ID: ${dialogState.data?.id}`}
            />

            <ComposeEmailDialog isOpen={isComposeEmailDialogOpen} onOpenChange={setIsComposeEmailDialogOpen} onSubmitEmail={handleDispatchComposedEmail} isSending={isEmailSending} recipientCount={1} />
        </div>
    );
}

'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { flux } from '@/lib/flux/client';
import { DataCenterTable } from '@/components/dashboard/DataCenterTable';
import { Loader2, AlertTriangle, DatabaseZap, ArrowLeft, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { EditRowDialog } from '@/components/dashboard/EditRowDialog';
import { cn } from '@/lib/utils';

// Helper to get a more readable display name for the table.
const getTableDisplayName = (tableName: string): string => {
    const nameMap: Record<string, string> = {
        'super_admins': 'Super Admins',
        'gyms': 'Gyms',
        'gym_requests': 'Gym Requests',
        'members': 'Members',
        'plans': 'Plans',
        'check_ins': 'Check-ins',
        'announcements': 'Announcements',
        'messages': 'Messages',
    };
    // Fallback for any tables not in the map
    return nameMap[tableName] || tableName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function TableView() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const tableName = params.tableName as string;
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, startUpdateTransition] = useTransition();

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [rowToEdit, setRowToEdit] = useState<any | null>(null);

    const displayName = getTableDisplayName(tableName);

    const fetchData = useCallback(async () => {
        if (!tableName) return;

        setLoading(true);
        setError(null);
        setData([]);

        try {
            const { rows: tableData, error: tableError } = await flux.sql(
                `SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT 100`
            );

            if (tableError) {
                throw tableError;
            }

            setData(tableData || []);
        } catch (err: any) {
            console.error(`Error fetching data for table ${tableName}:`, err);
            const errorMessage = err.message || 'An unknown error occurred.';
            setError(errorMessage);
            toast({
                title: `Error fetching table: ${displayName}`,
                description: errorMessage,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    }, [tableName, displayName, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenEditDialog = (row: any) => {
        setRowToEdit(row);
        setIsEditDialogOpen(true);
    };

    const handleUpdateRow = async (updatedData: Record<string, any>) => {
        if (!rowToEdit) return;

        startUpdateTransition(async () => {
            if (Object.keys(updatedData).length === 0) {
                setIsEditDialogOpen(false);
                setRowToEdit(null);
                return;
            }

            const setClauses = Object.entries(updatedData)
                .map(([key, value]) => {
                    if (value === null) return `${key} = NULL`;
                    if (typeof value === 'number') return `${key} = ${value}`;
                    if (typeof value === 'boolean') return `${key} = ${value}`;
                    return `${key} = '${String(value).replace(/'/g, "''")}'`;
                })
                .join(', ');

            const { error: updateError } = await flux.sql(
                `UPDATE ${tableName} SET ${setClauses} WHERE id = '${rowToEdit.id}'`
            );

            if (updateError) {
                toast({
                    title: 'Update Failed',
                    description: `Could not update row: ${updateError.message}.`,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: 'Row Updated',
                    description: `Successfully updated row in ${displayName}.`,
                });
                setData(currentData =>
                    currentData.map(row =>
                        row.id === rowToEdit.id ? { ...row, ...updatedData, id: row.id } : row
                    )
                );
                setIsEditDialogOpen(false);
                setRowToEdit(null);
            }
        });
    };

    const handleDeleteRow = async (rowId: any) => {
        setData(currentData => currentData.filter(row => row.id !== rowId));

        const { error: deleteError } = await flux.sql(`DELETE FROM ${tableName} WHERE id = '${rowId}'`);

        if (deleteError) {
            toast({
                title: 'Delete Failed',
                description: `Could not delete row: ${deleteError.message}. The view may be out of sync.`,
                variant: 'destructive',
            });
            // Re-fetch data to sync UI on failure
            fetchData();
        } else {
            toast({
                title: 'Row Deleted',
                description: `Successfully deleted row from ${tableName}.`,
            });
        }
    };


    if (loading && data.length === 0) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-3">Loading data for <span className="font-bold">{displayName}</span>...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center text-center">
                <div>
                    <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
                    <h2 className="mt-4 text-xl font-semibold">Failed to load data for "{displayName}"</h2>
                    <p className="mt-2 text-sm text-muted-foreground">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    {displayName}
                </h1>
                <Button variant="outline" onClick={() => fetchData()} disabled={loading}>
                    <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
                    Refresh
                </Button>
            </div>
            <DataCenterTable
                data={data}
                tableName={tableName}
                onDeleteRow={handleDeleteRow}
                onEditRow={handleOpenEditDialog}
            />
            <EditRowDialog
                isOpen={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                rowData={rowToEdit}
                tableName={displayName}
                onUpdateRow={handleUpdateRow}
                isUpdating={isUpdating}
            />
        </div>
    );
}

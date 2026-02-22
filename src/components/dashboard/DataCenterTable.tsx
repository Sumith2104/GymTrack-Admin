
'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button, buttonVariants } from '@/components/ui/button';
import { Trash2, Edit, AlertCircle, Eye, EyeOff } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { format } from 'date-fns';


interface DataCenterTableProps {
  data: any[];
  tableName: string;
  onDeleteRow: (id: any) => void;
  onEditRow: (row: any) => void;
}

// Helper to check if a value is a likely ISO date string
const isIsoDateString = (value: any): boolean => {
  if (typeof value !== 'string') return false;
  // Regex to match YYYY-MM-DDTHH:MM:SS format, with optional milliseconds and timezone.
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|([+-]\d{2}:\d{2}))?$/;
  return isoDateRegex.test(value);
};

export function DataCenterTable({ data, tableName, onDeleteRow, onEditRow }: DataCenterTableProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<any | null>(null);
  const [passwordVisibility, setPasswordVisibility] = useState<Record<string, boolean>>({});


  if (data.length === 0) {
    return (
       <div className="flex flex-col items-center justify-center py-12 text-center bg-card-foreground/5 p-6 rounded-lg">
        <AlertCircle size={48} className="text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold mb-2">No Data Found</h3>
        <p className="text-muted-foreground">The table "{tableName}" is empty or no data could be retrieved.</p>
      </div>
    );
  }

  // Filter out primary and foreign key columns for a cleaner display.
  const columns = Object.keys(data[0] || {}).filter(key => {
    // Always hide the raw 'id' column.
    if (key === 'id') return false;
    // Hide columns ending in '_id' (generic foreign key pattern), but make an exception for user-facing IDs.
    if (key.endsWith('_id') && key !== 'formatted_gym_id') return false;
    // Hide SMTP-related columns for security.
    if (key.startsWith('smtp_')) return false;
    // Show all other columns.
    return true;
  });
  
  const handleOpenDeleteDialog = (row: any) => {
    if (!row.id) {
        // Cannot delete rows without an 'id' column through this UI
        alert("This row cannot be deleted because it does not have a unique 'id' column.");
        return;
    }
    setRowToDelete(row);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (rowToDelete) {
      onDeleteRow(rowToDelete.id);
      setRowToDelete(null);
      setIsDeleteDialogOpen(false);
    }
  };


  const renderCellContent = (content: any, key: string, rowId: any) => {
    if (content === null) return <span className="text-muted-foreground/70">NULL</span>;
    
    // A column is sensitive if it contains "password" or "secret", or ends with "_pass", "_key" or is exactly "pass" or "key".
    // This is to avoid accidentally masking columns like "bypass" or "compass".
    const keyLower = key.toLowerCase();
    const isSensitive = keyLower.includes('password') || 
                        keyLower.includes('secret') || 
                        keyLower.endsWith('_pass') ||
                        keyLower.endsWith('_key') ||
                        keyLower === 'pass' ||
                        keyLower === 'key';
    
    if (isSensitive) {
        const cellKey = `${rowId}-${key}`;
        const isVisible = passwordVisibility[cellKey];

        const toggleVisibility = () => {
            setPasswordVisibility(prev => ({ ...prev, [cellKey]: !prev[cellKey] }));
        };

        return (
            <div className="flex items-center gap-2">
                <span className="font-mono">{isVisible ? content : '••••••••••'}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={toggleVisibility} title={isVisible ? 'Hide value' : 'Show value'}>
                    {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
        );
    }

    if (isIsoDateString(content)) {
      try {
        return format(new Date(content), 'dd MMM yyyy, HH:mm:ss');
      } catch {
        // Fallback for invalid dates
        return String(content);
      }
    }

    if (typeof content === 'boolean') {
      return <span className={content ? 'text-green-400' : 'text-orange-400'}>{content.toString()}</span>;
    }
    if (typeof content === 'object') {
      return <pre className="text-xs bg-muted p-1 rounded-sm max-w-xs overflow-x-auto">{JSON.stringify(content, null, 2)}</pre>;
    }
    const stringContent = String(content);
    if (stringContent.length > 70) {
      return <span title={stringContent}>{stringContent.substring(0, 70)}...</span>;
    }
    return stringContent;
  };

  return (
    <>
      <div className="rounded-lg border shadow-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col}>{col.replace(/_/g, ' ')}</TableHead>
              ))}
              <TableHead className="text-right sticky right-0 bg-background/95">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={row.id || rowIndex}>
                {columns.map((col) => (
                  <TableCell key={`${row.id || rowIndex}-${col}`}>
                    {renderCellContent(row[col], col, row.id || rowIndex)}
                  </TableCell>
                ))}
                <TableCell className="text-right sticky right-0 bg-background/95">
                    <div className="flex gap-2 justify-end">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          title="Edit Row" 
                          onClick={() => onEditRow(row)}
                          disabled={!row.id}
                        >
                            <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive" 
                          title="Delete Row" 
                          onClick={() => handleOpenDeleteDialog(row)}
                          disabled={!row.id}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the row with ID <span className="font-mono bg-muted p-1 rounded">{rowToDelete?.id}</span> from the "{tableName}" table.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className={buttonVariants({ variant: "destructive" })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
    
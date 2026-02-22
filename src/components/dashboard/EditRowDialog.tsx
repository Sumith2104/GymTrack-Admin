
'use client';

import { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
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
import { Loader2, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface EditRowDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  rowData: Record<string, any> | null;
  tableName: string;
  onUpdateRow: (updatedData: Record<string, any>) => Promise<void>;
  isUpdating: boolean;
}

// Fields that should not be editable in the generic dialog.
const READ_ONLY_FIELDS = [
    'id', 
    'created_at', 
];

export function EditRowDialog({
  isOpen,
  onOpenChange,
  rowData,
  tableName,
  onUpdateRow,
  isUpdating,
}: EditRowDialogProps) {
  const { register, handleSubmit, reset, setValue, watch, getValues } = useForm();

  useEffect(() => {
    if (rowData) {
      reset(rowData);
    }
  }, [rowData, reset]);

  const handleDialogClose = () => {
    if (!isUpdating) {
      onOpenChange(false);
    }
  };

  const onSubmit: SubmitHandler<Record<string, any>> = async (formData) => {
    if (!rowData) return;
    
    // Create a payload with only the fields that were actually changed.
    const updatePayload: Record<string, any> = {};
    const editableFields = Object.keys(rowData).filter(key => !READ_ONLY_FIELDS.includes(key));
    
    editableFields.forEach(key => {
      // Handle null from DB vs empty string from form
      const formValue = formData[key] === '' && rowData[key] === null ? null : formData[key];
      if (formValue !== rowData[key]) {
        updatePayload[key] = formValue;
      }
    });

    if (Object.keys(updatePayload).length > 0) {
        await onUpdateRow(updatePayload);
    } else {
        // No changes were made, just close the dialog
        handleDialogClose();
    }
  };

  const renderInputField = (key: string, value: any) => {
    if (typeof value === 'boolean') {
      return (
        <div className="flex items-center space-x-2 mt-1">
           <Switch
            id={key}
            checked={watch(key)}
            onCheckedChange={(checked) => setValue(key, checked, { shouldDirty: true })}
            disabled={isUpdating}
          />
          <Label htmlFor={key}>{watch(key) ? 'True' : 'False'}</Label>
        </div>
      );
    }
    if (typeof value === 'number') {
      return (
        <Input
          id={key}
          type="number"
          step="any" // Allow decimals
          {...register(key, { valueAsNumber: true })}
          className="mt-1"
          disabled={isUpdating}
        />
      );
    }
    
    // Default to text input for strings, nulls, dates etc.
    return (
      <Input
        id={key}
        type="text"
        {...register(key)}
        className="mt-1"
        disabled={isUpdating}
        placeholder={value === null ? 'NULL' : ''}
      />
    );
  };
  
  if (!rowData) return null;

  const editableFields = Object.keys(rowData).filter(key => !READ_ONLY_FIELDS.includes(key));

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Row in "{tableName}"</DialogTitle>
          <DialogDescription>
            Modify the fields below. The row ID is{' '}
            <span className="font-mono bg-muted p-1 rounded text-xs">{rowData.id}</span>.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ScrollArea className="h-96 pr-6">
            <div className="grid gap-4 py-4">
              {editableFields.length > 0 ? (
                 editableFields.map((key) => (
                  <div key={key}>
                    <Label htmlFor={key} className="capitalize">{key.replace(/_/g, ' ')}</Label>
                    {renderInputField(key, rowData[key])}
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">No editable fields for this entry.</p>
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="mt-4 pt-4 border-t">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isUpdating}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isUpdating || editableFields.length === 0}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} className="mr-2"/>
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


"use client";

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
import { Loader2, Send } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DefaultValues } from 'react-hook-form';

const emailSchema = z.object({
  subject: z.string().min(1, { message: 'Subject is required' }),
  body: z.string().min(1, { message: 'Email body is required' }),
});

type EmailFormInputs = z.infer<typeof emailSchema>;

interface EmailTemplate {
  name: string;
  subject: string;
  body: string;
}

const emailTemplates: EmailTemplate[] = [
  {
    name: "General Announcement",
    subject: "Important Announcement for {{gymName}}",
    body: `<h2>Important Announcement</h2>
<p>Hello {{gymName}} Team,</p>
<p>We have an important update for you regarding our services. Please review the details below:</p>
<p>[Your announcement details here]</p>
<p>If you have any questions, feel free to reach out.</p>
<br/>
<p>Thank you,</p>
<p>The GymTrack Admin Team</p>`,
  },
  {
    name: "Scheduled Maintenance Alert",
    subject: "Scheduled Maintenance Notification for {{gymName}}",
    body: `<h2>Scheduled Maintenance</h2>
<p>Dear {{gymName}} Owner,</p>
<p>Please be advised that we will be performing scheduled maintenance on the GymTrack platform.</p>
<p><strong>Date:</strong> [MAINTENANCE_DATE]</p>
<p><strong>Time:</strong> [MAINTENANCE_TIME_WINDOW]</p>
<p><strong>Expected Duration:</strong> [MAINTENANCE_DURATION]</p>
<p>During this time, access to the admin dashboard might be intermittent. We apologize for any inconvenience this may cause and appreciate your understanding as we work to improve our services.</p>
<br/>
<p>Sincerely,</p>
<p>The GymTrack Admin Team</p>`,
  },
    {
    name: "New Feature Rollout",
    subject: "Exciting New Features for {{gymName}}!",
    body: `<h2>New Features Launched!</h2>
<p>Hello {{gymName}},</p>
<p>We're thrilled to announce the rollout of new features on the GymTrack platform designed to enhance your management experience!</p>
<p>[Briefly describe new feature 1]</p>
<p>[Briefly describe new feature 2]</p>
<p>We encourage you to explore these new additions. Your feedback is always welcome.</p>
<br/>
<p>Best regards,</p>
<p>The GymTrack Admin Team</p>`,
  },
  {
    name: "Renew Platform Subscription",
    subject: "Action Required: Renew Your GymTrack Subscription for {{gymName}}",
    body: `<h2>Subscription Renewal Reminder</h2>
<p>Hello {{gymName}} Team,</p>
<p>This is a friendly reminder that your subscription for the GymTrack platform is due for renewal soon.</p>
<p>To ensure uninterrupted access to our services, please renew your subscription by [RENEWAL_DATE].</p>
<p>You can renew by [Instructions on how to renew, e.g., visiting a link, contacting support].</p>
<p>If you have already renewed, please disregard this message. For any questions, please contact our support team.</p>
<br/>
<p>Thank you for being a valued member of the GymTrack community!</p>
<p>The GymTrack Admin Team</p>`,
  }
];


interface ComposeEmailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmitEmail: (data: EmailFormInputs) => void;
  isSending: boolean;
  recipientCount: number;
}

export function ComposeEmailDialog({ 
  isOpen, 
  onOpenChange, 
  onSubmitEmail, 
  isSending,
  recipientCount
}: ComposeEmailDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue, // Import setValue from react-hook-form
    formState: { errors, isSubmitting: isFormSubmitting },
  } = useForm<EmailFormInputs>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
        subject: '',
        body: '',
    } as DefaultValues<EmailFormInputs>
  });

  const handleDialogClose = () => {
    if (!isSending) {
      reset({subject: '', body: ''}); // Reset form on close
      onOpenChange(false);
    }
  };
  
  const handleActualSubmit: SubmitHandler<EmailFormInputs> = (data) => {
    onSubmitEmail(data);
    // Do not reset or close here; parent component will handle it after submission.
  };

  const handleTemplateSelect = (templateName: string) => {
    if (!templateName) {
        // Optionally clear fields if a "none" or placeholder option is selected
        // setValue('subject', '');
        // setValue('body', '');
        return;
    }
    const selectedTemplate = emailTemplates.find(t => t.name === templateName);
    if (selectedTemplate) {
      setValue('subject', selectedTemplate.subject);
      setValue('body', selectedTemplate.body);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-headline">Compose Custom Email</DialogTitle>
          <DialogDescription>
            Write the subject and body for the email. It will be sent to {recipientCount} selected gym(s).
            {' You can use `{{gymName}}` and `{{gymId}}` as placeholders. Selecting a template will overwrite current content.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleActualSubmit)} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="template-select">Quick Template (Optional)</Label>
            <Select onValueChange={handleTemplateSelect} disabled={isSending || isFormSubmitting}>
              <SelectTrigger id="template-select" className="w-full">
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {emailTemplates.map(template => (
                  <SelectItem key={template.name} value={template.name}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              {...register('subject')}
              className={errors.subject ? 'border-destructive' : ''}
              placeholder="Your Email Subject"
              disabled={isSending || isFormSubmitting}
            />
            {errors.subject && <p className="text-sm text-destructive mt-1">{errors.subject.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Email Body (HTML is supported)</Label>
            <Textarea
              id="body"
              {...register('body')}
              className={`min-h-[150px] ${errors.body ? 'border-destructive' : ''}`}
              placeholder="Write your email content here. You can use HTML tags. Placeholders: {{gymName}}, {{gymId}}"
              disabled={isSending || isFormSubmitting}
            />
            {errors.body && <p className="text-sm text-destructive mt-1">{errors.body.message}</p>}
          </div>
          <DialogFooter className="mt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={isSending || isFormSubmitting}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isSending || isFormSubmitting}>
              {isSending || isFormSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={18} className="mr-2"/>
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

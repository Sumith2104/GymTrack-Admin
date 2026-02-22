'use server';

import type { Gym, GymRequest } from '@/types';
import nodemailer from 'nodemailer';
import { getBaseEmailHtml } from '@/lib/email-templates';
import { flux } from '@/lib/flux/client';

interface EmailResult {
    success: boolean;
    error?: string;
}

const APP_NAME = "GymTrack Admin";

const getSmtpConfig = async () => {
    // Fetch the first super admin's config. Assuming one set of credentials for the app.
    const query = `SELECT smtp_host, smtp_port, smtp_username, smtp_pass, smtp_from FROM super_admins LIMIT 1`;
    const { rows, error } = await flux.sql(query);
    const data = rows?.[0];

    if (error || !data) {
        console.error('SMTP configuration could not be fetched from database:', error?.message);
        return null;
    }

    const { smtp_host, smtp_port, smtp_username, smtp_pass, smtp_from } = data;

    if (!smtp_host || !smtp_port || !smtp_username || !smtp_pass || !smtp_from) {
        console.error('One or more SMTP configuration fields are missing in the database.');
        return null;
    }

    const port = parseInt(String(smtp_port), 10);
    if (isNaN(port)) {
        console.error('Invalid SMTP port number in database.');
        return null;
    }

    const transporter = nodemailer.createTransport({
        host: smtp_host,
        port: port,
        secure: port === 465, // true for 465, false for other ports like 587 which use STARTTLS
        auth: {
            user: smtp_username,
            pass: smtp_pass,
        },
    });

    return { transporter, fromEmail: smtp_from };
};

export async function sendWelcomeEmailAction(
    gymDetails: Pick<Gym, 'name' | 'ownerEmail' | 'formattedGymId'>
): Promise<EmailResult> {
    const { name, ownerEmail, formattedGymId } = gymDetails;

    const smtpConfig = await getSmtpConfig();
    if (!smtpConfig) {
        return { success: false, error: 'Server email configuration is incomplete or could not be loaded from the database.' };
    }
    const { transporter, fromEmail } = smtpConfig;

    const emailSubject = `Welcome to ${APP_NAME}, ${name}!`;
    const welcomeEmailContent = `
    <h2>Welcome to ${APP_NAME}!</h2>
    <p>Hello,</p>
    <p>Your new gym, "<strong>${name}</strong>", has been successfully registered with ${APP_NAME}!</p>
    <p>Your unique Gym ID is: <strong>${formattedGymId}</strong></p>
    <p>Keep this ID safe. You'll use it to manage your gym's portal (once available).</p>
    <p>Welcome aboard!</p>
    <br/>
    <p>The ${APP_NAME} Team</p>
  `;

    const htmlBody = getBaseEmailHtml({
        subject: emailSubject,
        appName: APP_NAME,
        content: welcomeEmailContent,
    });

    const mailOptions = {
        from: `"${APP_NAME}" <${fromEmail}>`,
        to: ownerEmail,
        subject: emailSubject,
        html: htmlBody,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Welcome email sent to:', ownerEmail);
        return { success: true };
    } catch (error) {
        console.error('Error sending welcome email:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Failed to send email: ${errorMessage}` };
    }
}

export async function sendRejectionEmailAction(
    requestDetails: Pick<GymRequest, 'gym_name' | 'email'>
): Promise<EmailResult> {
    const { gym_name, email } = requestDetails;

    const smtpConfig = await getSmtpConfig();
    if (!smtpConfig) {
        return { success: false, error: 'Server email configuration is incomplete or could not be loaded from the database.' };
    }
    const { transporter, fromEmail } = smtpConfig;

    const emailSubject = `Update on your GymTrack application for ${gym_name}`;
    const rejectionEmailContent = `
    <h2>Application Update</h2>
    <p>Hello,</p>
    <p>Thank you for your interest in GymTrack and for submitting an application for "<strong>${gym_name}</strong>".</p>
    <p>After careful review, we regret to inform you that we are unable to approve your request at this time.</p>
    <p>We appreciate you taking the time to apply and wish you the best in your endeavors.</p>
    <br/>
    <p>Sincerely,</p>
    <p>The ${APP_NAME} Team</p>
  `;

    const htmlBody = getBaseEmailHtml({
        subject: emailSubject,
        appName: APP_NAME,
        content: rejectionEmailContent,
    });

    const mailOptions = {
        from: `"${APP_NAME}" <${fromEmail}>`,
        to: email,
        subject: emailSubject,
        html: htmlBody,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Rejection email sent to:', email);
        return { success: true };
    } catch (error) {
        console.error('Error sending rejection email:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Failed to send email: ${errorMessage}` };
    }
}


export async function sendPromotionalEmailAction(
    gymDetails: Pick<Gym, 'name' | 'ownerEmail' | 'formattedGymId'>,
    emailSubject: string,
    emailContentForTemplate: string
): Promise<EmailResult> {
    const { ownerEmail } = gymDetails;

    const smtpConfig = await getSmtpConfig();
    if (!smtpConfig) {
        return { success: false, error: 'Server email configuration is incomplete or could not be loaded from the database.' };
    }
    const { transporter, fromEmail } = smtpConfig;

    const personalizedContent = emailContentForTemplate
        .replace(/{{gymName}}/g, gymDetails.name)
        .replace(/{{gymId}}/g, gymDetails.formattedGymId);

    const htmlBody = getBaseEmailHtml({
        subject: emailSubject,
        appName: APP_NAME,
        content: personalizedContent,
    });

    const mailOptions = {
        from: `"${APP_NAME}" <${fromEmail}>`,
        to: ownerEmail,
        subject: emailSubject,
        html: htmlBody,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Custom email ("${emailSubject}") sent to:`, ownerEmail);
        return { success: true };
    } catch (error) {
        console.error('Error sending custom email:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Failed to send email: ${errorMessage}` };
    }
}

export async function sendGymStatusChangeEmailAction(
    gymDetails: Pick<Gym, 'name' | 'ownerEmail' | 'formattedGymId'>,
    newStatus: 'active' | 'inactive' | 'inactive soon'
): Promise<EmailResult> {
    const { name, ownerEmail, formattedGymId } = gymDetails;

    const smtpConfig = await getSmtpConfig();
    if (!smtpConfig) {
        return { success: false, error: 'Server email configuration is incomplete or could not be loaded from the database.' };
    }
    const { transporter, fromEmail } = smtpConfig;

    let emailSubject = '';
    let statusChangeEmailContent = '';

    if (newStatus === 'inactive') {
        emailSubject = `Important: Status Update for Your Gym ${name}`;
        statusChangeEmailContent = `
      <h2>Gym Status Update</h2>
      <p>Hello,</p>
      <p>This is an important notification regarding your gym, "<strong>${name}</strong>" (ID: <strong>${formattedGymId}</strong>).</p>
      <p>Your gym's status has been changed to <strong>Inactive</strong> in the ${APP_NAME} system.</p>
      <p>If you believe this is an error or have any questions, please contact our support team.</p>
      <p>Thank you,</p>
      <p>The ${APP_NAME} Team</p>
    `;
    } else if (newStatus === 'inactive soon') {
        emailSubject = `Warning: Status Update for Your Gym ${name}`;
        statusChangeEmailContent = `
      <h2>Gym Status Update Warning</h2>
      <p>Hello,</p>
      <p>This is a notification regarding your gym, "<strong>${name}</strong>" (ID: <strong>${formattedGymId}</strong>).</p>
      <p>Your gym's status has been changed to <strong>Inactive Soon</strong> in the ${APP_NAME} system. This is a warning that your gym may become fully inactive if no action is taken.</p>
      <p>Please contact our support team to resolve any outstanding issues.</p>
      <p>Thank you,</p>
      <p>The ${APP_NAME} Team</p>
    `;
    } else {
        // Optionally, handle 'active' status notification if needed in the future
        // For now, we are only sending for 'inactive' or 'inactive soon'
        return { success: true };
    }

    const htmlBody = getBaseEmailHtml({
        subject: emailSubject,
        appName: APP_NAME,
        content: statusChangeEmailContent,
    });

    const mailOptions = {
        from: `"${APP_NAME}" <${fromEmail}>`,
        to: ownerEmail,
        subject: emailSubject,
        html: htmlBody,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Status change (to ${newStatus}) email sent to:`, ownerEmail);
        return { success: true };
    } catch (error) {
        console.error(`Error sending status change (to ${newStatus}) email:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, error: `Failed to send email: ${errorMessage}` };
    }
}

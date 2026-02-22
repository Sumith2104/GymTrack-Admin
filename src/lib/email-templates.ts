
// src/lib/email-templates.ts

/**
 * @fileOverview Provides a base HTML template for emails.
 */

interface BaseEmailHtmlParams {
  subject: string;
  appName: string;
  content: string;
}

export function getBaseEmailHtml({ subject, appName, content }: BaseEmailHtmlParams): string {
  const currentYear = new Date().getFullYear();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { font-family: 'Inter', Arial, sans-serif; margin: 0; padding: 0; background-color: #080808; color: #e0e0e0; }
    .container { max-width: 600px; margin: 20px auto; background-color: #1a1a1a; border: 1px solid #333; border-radius: 8px; overflow: hidden; }
    .header { background-color: #0D0D0D; padding: 20px; text-align: center; border-bottom: 1px solid #333;}
    .header h1 { color: #FFD700; margin: 0; font-size: 24px; }
    .content { padding: 20px; line-height: 1.6; color: #cccccc; }
    .content h2 { color: #FFD700; margin-top:0; }
    .content p { margin-bottom: 10px; }
    .content strong { color: #FFD700; }
    .content ul { padding-left: 20px; margin-top:0; }
    .content li { margin-bottom: 5px; }
    .footer { background-color: #0D0D0D; padding: 15px; text-align: center; font-size: 12px; color: #888; border-top: 1px solid #333; }
    .button { display: inline-block; padding: 10px 20px; margin-top: 15px; background-color: #FFD700; color: #080808 !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
    .qr-code { margin-top: 15px; text-align: center; }
    .qr-code img { max-width: 150px; border: 3px solid #FFD700; border-radius: 4px; }
    .announcement-content { padding: 10px; border-left: 3px solid #FFD700; margin: 10px 0; background-color: #222; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${appName}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${currentYear} ${appName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

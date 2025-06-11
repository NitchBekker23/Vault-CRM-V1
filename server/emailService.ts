import fetch from 'node-fetch';

if (!process.env.BREVO_API_KEY) {
  throw new Error("BREVO_API_KEY environment variable must be set");
}

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface EmailParams {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}

export async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    console.log(`Sending email to: ${params.to}`);
    console.log(`Subject: ${params.subject}`);
    console.log(`Using API key: ${process.env.BREVO_API_KEY?.substring(0, 10)}...`);
    
    const emailPayload = {
      sender: {
        name: "The Vault Inventory",
        email: "nitchbekker@gmail.com"
      },
      to: [{
        email: params.to,
        name: params.toName || params.to
      }],
      subject: params.subject,
      htmlContent: params.htmlContent,
      textContent: params.textContent || params.htmlContent.replace(/<[^>]*>/g, '')
    };
    
    console.log('Email payload:', JSON.stringify(emailPayload, null, 2));
    
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY!,
      },
      body: JSON.stringify(emailPayload)
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Brevo API error response:', error);
      console.error('Response status:', response.status);
      console.error('Response headers:', response.headers);
      return false;
    }

    const result = await response.json();
    console.log('Brevo success response:', result);
    return true;
  } catch (error) {
    console.error('Email service error:', error);
    return false;
  }
}

export async function sendAccountRequestNotification(
  adminEmail: string,
  requestData: {
    firstName: string;
    lastName: string;
    email: string;
    company: string;
    message?: string;
  },
  requestId: number
): Promise<boolean> {
  const htmlContent = `
    <h2>New Account Request</h2>
    <p>A new user has requested access to the inventory management system:</p>
    
    <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 15px 0;">
      <strong>Name:</strong> ${requestData.firstName} ${requestData.lastName}<br>
      <strong>Email:</strong> ${requestData.email}<br>
      <strong>Company:</strong> ${requestData.company}<br>
      ${requestData.message ? `<strong>Message:</strong> ${requestData.message}<br>` : ''}
    </div>
    
    <p>Please review this request and approve or deny access through the admin panel.</p>
    <p><strong>Request ID:</strong> ${requestId}</p>
  `;

  return sendEmail({
    to: adminEmail,
    subject: `New Account Request - ${requestData.firstName} ${requestData.lastName}`,
    htmlContent
  });
}

export async function sendAccountApprovalEmail(
  userEmail: string,
  userName: string,
  setupToken: string
): Promise<boolean> {
  const setupUrl = `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'http://localhost:5000'}/setup-account?token=${setupToken}`;
  
  const htmlContent = `
    <h2>Account Approved - Complete Your Setup</h2>
    <p>Hello ${userName},</p>
    
    <p>Great news! Your account request has been approved. To complete your account setup and access the inventory management system, please click the link below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${setupUrl}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Complete Account Setup</a>
    </div>
    
    <p>This link will allow you to:</p>
    <ul>
      <li>Set up your login credentials</li>
      <li>Configure security preferences</li>
      <li>Access the inventory management dashboard</li>
    </ul>
    
    <p><strong>Important:</strong> This setup link will expire in 24 hours for security reasons.</p>
    
    <p>If you have any questions, please contact your administrator.</p>
    
    <p>Welcome to the team!</p>
    
    <hr style="margin: 20px 0;">
    <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link: ${setupUrl}</p>
  `;

  return sendEmail({
    to: userEmail,
    toName: userName,
    subject: 'Account Approved - Complete Your Setup',
    htmlContent
  });
}

export async function sendAccountDenialEmail(
  userEmail: string,
  userName: string,
  reason?: string
): Promise<boolean> {
  const htmlContent = `
    <h2>Account Request Update</h2>
    <p>Hello ${userName},</p>
    
    <p>Thank you for your interest in our inventory management system. Unfortunately, we are unable to approve your account request at this time.</p>
    
    ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
    
    <p>If you believe this is an error or have questions, please contact your administrator.</p>
  `;

  return sendEmail({
    to: userEmail,
    toName: userName,
    subject: 'Account Request Update',
    htmlContent
  });
}

export async function sendTwoFactorCode(
  userEmail: string,
  userName: string,
  code: string
): Promise<boolean> {
  const htmlContent = `
    <h2>Your Authentication Code</h2>
    <p>Hello ${userName},</p>
    
    <p>Your two-factor authentication code is:</p>
    
    <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 5px; margin: 15px 0;">
      <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${code}</h1>
    </div>
    
    <p>This code will expire in 10 minutes. Do not share this code with anyone.</p>
    
    <p>If you didn't request this code, please contact your administrator immediately.</p>
  `;

  return sendEmail({
    to: userEmail,
    toName: userName,
    subject: 'Your Authentication Code',
    htmlContent
  });
}

export async function sendPasswordResetEmail(
  email: string,
  firstName: string,
  resetToken: string
): Promise<boolean> {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5000' 
    : (process.env.REPLIT_DOMAINS?.split(',')[0] ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000');
  
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
  
  const htmlContent = `
    <h2>Password Reset Request</h2>
    <p>Hi ${firstName},</p>
    <p>You requested to reset your password. Click the link below to set a new password:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: #007bff; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
    </div>
    <p>This link will expire in 1 hour for security reasons.</p>
    <p>If you didn't request this password reset, please ignore this email.</p>
    <p>For security, this link can only be used once.</p>
    <hr style="margin: 20px 0;">
    <p style="font-size: 12px; color: #666;">If the button doesn't work, copy and paste this link: ${resetUrl}</p>
  `;

  return sendEmail({
    to: email,
    toName: firstName,
    subject: 'Password Reset Request',
    htmlContent
  });
}
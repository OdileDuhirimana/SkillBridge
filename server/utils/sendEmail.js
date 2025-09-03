const nodemailer = require('nodemailer');

// Create transporter
const transporter = nodemailer.createTransporter({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email templates
const templates = {
  emailVerification: (data) => ({
    subject: 'Verify your SkillBridge account',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to SkillBridge!</h2>
        <p>Hi ${data.firstName},</p>
        <p>Thank you for signing up for SkillBridge. Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.verificationUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${data.verificationUrl}</p>
        <p>This link will expire in 24 hours.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't create an account with SkillBridge, you can safely ignore this email.
        </p>
      </div>
    `
  }),

  passwordReset: (data) => ({
    subject: 'Reset your SkillBridge password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Password Reset Request</h2>
        <p>Hi ${data.firstName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.resetUrl}" 
             style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #6b7280;">${data.resetUrl}</p>
        <p>This link will expire in 10 minutes.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          If you didn't request a password reset, you can safely ignore this email.
        </p>
      </div>
    `
  }),

  applicationReceived: (data) => ({
    subject: 'New application received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Application Received</h2>
        <p>Hi ${data.companyName},</p>
        <p>You have received a new application for the position: <strong>${data.jobTitle}</strong></p>
        <p>Applicant: ${data.applicantName}</p>
        <p>Please log in to your SkillBridge dashboard to review the application.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.dashboardUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Application
          </a>
        </div>
      </div>
    `
  }),

  applicationUpdate: (data) => ({
    subject: 'Application status update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Application Status Update</h2>
        <p>Hi ${data.applicantName},</p>
        <p>Your application for <strong>${data.jobTitle}</strong> at <strong>${data.companyName}</strong> has been updated.</p>
        <p>New Status: <strong style="color: #2563eb;">${data.status}</strong></p>
        ${data.message ? `<p>Message: ${data.message}</p>` : ''}
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.applicationUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Application
          </a>
        </div>
      </div>
    `
  }),

  interviewScheduled: (data) => ({
    subject: 'Interview scheduled',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Interview Scheduled</h2>
        <p>Hi ${data.applicantName},</p>
        <p>Great news! Your interview has been scheduled.</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Position:</strong> ${data.jobTitle}</p>
          <p><strong>Company:</strong> ${data.companyName}</p>
          <p><strong>Date:</strong> ${data.interviewDate}</p>
          <p><strong>Type:</strong> ${data.interviewType}</p>
          ${data.location ? `<p><strong>Location:</strong> ${data.location}</p>` : ''}
          ${data.meetingLink ? `<p><strong>Meeting Link:</strong> <a href="${data.meetingLink}">${data.meetingLink}</a></p>` : ''}
        </div>
        <p>Good luck with your interview!</p>
      </div>
    `
  }),

  jobMatch: (data) => ({
    subject: 'New job matches your profile',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">New Job Match!</h2>
        <p>Hi ${data.applicantName},</p>
        <p>We found a new job that matches your profile:</p>
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">${data.jobTitle}</h3>
          <p><strong>Company:</strong> ${data.companyName}</p>
          <p><strong>Location:</strong> ${data.location}</p>
          <p><strong>Type:</strong> ${data.jobType}</p>
          <p><strong>Match Score:</strong> ${data.matchScore}%</p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.jobUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            View Job
          </a>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async ({ email, subject, template, data }) => {
  try {
    const emailTemplate = templates[template];
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }

    const { subject: templateSubject, html } = emailTemplate(data);

    const mailOptions = {
      from: `"SkillBridge" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: subject || templateSubject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};

// Send bulk email function
const sendBulkEmail = async (emails, { subject, template, data }) => {
  try {
    const emailTemplate = templates[template];
    if (!emailTemplate) {
      throw new Error(`Email template '${template}' not found`);
    }

    const { subject: templateSubject, html } = emailTemplate(data);

    const mailOptions = {
      from: `"SkillBridge" <${process.env.EMAIL_USER}>`,
      to: emails.join(', '),
      subject: subject || templateSubject,
      html: html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Bulk email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Bulk email sending error:', error);
    throw error;
  }
};

// Verify email configuration
const verifyEmailConfig = async () => {
  try {
    await transporter.verify();
    console.log('✅ Email configuration verified');
    return true;
  } catch (error) {
    console.error('❌ Email configuration error:', error);
    return false;
  }
};

module.exports = { sendEmail, sendBulkEmail, verifyEmailConfig };

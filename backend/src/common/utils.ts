import crypto from 'crypto';

// Generate secure random token
export const generateToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Hash token for storage
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Send email (console log for MVP)
export const sendEmail = async (to: string, subject: string, body: string) => {
  console.log('📧 Email sent:');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  // In production, use nodemailer or SendGrid
};

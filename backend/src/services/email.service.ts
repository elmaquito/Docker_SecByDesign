export const sendEmail = async (to: string, subject: string, body: string) => {
  console.log('📧 Email sent:');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  // In production, use nodemailer or SendGrid
};

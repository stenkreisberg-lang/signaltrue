import dotenv from 'dotenv';
dotenv.config();
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('Sending test email via Resend...');

try {
  const result = await resend.emails.send({
    from: 'SignalTrue <brief@signaltrue.ai>',
    to: ['liana.saago@nobeldigital.ee'],
    subject: 'SignalTrue Test — Please Confirm Receipt',
    html: '<h2>Test Email</h2><p>This is a test from SignalTrue to verify email delivery works.</p><p>If you received this, please let Sten know.</p>',
  });

  console.log('Resend response:', JSON.stringify(result, null, 2));
} catch (err) {
  console.error('Resend error:', err.message);
  console.error('Full error:', JSON.stringify(err, null, 2));
}

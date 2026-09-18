/**
 * Minimal Resend email client.
 * No SDK dependency required - just fetch against the Resend REST API.
 * Docs: https://resend.com/docs/api-reference/emails/send-email
 */

const RESEND_URL = 'https://api.resend.com/emails';
const FROM_ADDRESS = process.env.RESEND_FROM_ADDRESS || 'MoodBooster <onboarding@resend.dev>';

async function sendEmail({ to, subject, html }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set. Add it to backend/.env');
  }

  const response = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Resend API error (${response.status}): ${errBody}`);
  }

  return response.json();
}

module.exports = { sendEmail };

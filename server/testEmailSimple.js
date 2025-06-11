const fetch = require('node-fetch');

async function testBrevoEmail() {
  const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
  
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: "Inventory Management System",
          email: "noreply@inventory.com"
        },
        to: [{
          email: "chris@thevault.co.za",
          name: "Chris"
        }],
        subject: "Test Email - Password Reset",
        htmlContent: `
          <h2>Password Reset Test</h2>
          <p>This is a test email to verify email delivery is working.</p>
          <p>If you receive this, the email service is configured correctly.</p>
        `,
        textContent: "This is a test email to verify email delivery is working."
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Brevo API Error:', error);
      console.error('Response status:', response.status);
      return false;
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return true;
  } catch (error) {
    console.error('Email test failed:', error.message);
    return false;
  }
}

testBrevoEmail();
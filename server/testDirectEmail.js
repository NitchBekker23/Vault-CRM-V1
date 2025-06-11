import fetch from 'node-fetch';

async function testDirectEmail() {
  const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
  
  console.log('Testing direct email send...');
  console.log('API Key:', process.env.BREVO_API_KEY?.substring(0, 10) + '...');
  
  const emailPayload = {
    sender: {
      name: "The Vault Inventory",
      email: "nitchbekker@gmail.com"
    },
    to: [{
      email: "chris@thevault.co.za",
      name: "Chris"
    }],
    subject: "Test Password Reset - Direct Send",
    htmlContent: `
      <h2>Password Reset Request (Direct Test)</h2>
      <p>Hi Chris,</p>
      <p>This is a direct test email to verify email delivery is working.</p>
      <p>If you receive this, the email service is working correctly.</p>
      <p>Test token: test-123-456</p>
    `,
    textContent: "This is a direct test email to verify email delivery is working."
  };
  
  console.log('Email payload:', JSON.stringify(emailPayload, null, 2));
  
  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify(emailPayload)
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('Success response:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('Request failed:', error);
    return false;
  }
}

testDirectEmail();
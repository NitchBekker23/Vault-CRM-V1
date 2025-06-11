const { sendAccountApprovalEmail } = require('./emailService');

async function testEmail() {
  try {
    console.log('Sending password setup email to chris@thevault.co.za...');
    
    const result = await sendAccountApprovalEmail(
      'chris@thevault.co.za',
      'Christopher Bekker',
      'd4b80f25f7cdc8c87bb873cfcb3aee34d4330b99627c5e5d3d013f95d9d5c973'
    );
    
    console.log('Email sent successfully:', result);
  } catch (error) {
    console.error('Email sending failed:', error.message);
  }
}

testEmail();
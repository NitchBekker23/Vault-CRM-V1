/**
 * Test script to create a client with today's birthday
 * Run this to test the birthday notification system
 */

import { db } from './server/db.js';
import { clients } from './shared/schema.js';

async function createTestBirthdayClient() {
  try {
    // Get today's date but set year to 1990 for birthday
    const today = new Date();
    const birthdayThisYear = new Date(1990, today.getMonth(), today.getDate());
    
    console.log(`Creating test client with birthday on ${birthdayThisYear.toDateString()}`);
    
    // Create test client with today's birthday
    const [testClient] = await db.insert(clients).values({
      fullName: "Test Birthday Client",
      email: "birthday.test@thevault.co.za",
      phoneNumber: "+27821234567",
      birthday: birthdayThisYear,
      customerNumber: "BIRTHDAY001",
      vipStatus: "regular",
      totalPurchases: 0,
      totalSpend: "0"
    }).returning();
    
    console.log('✅ Test birthday client created:', {
      id: testClient.id,
      name: testClient.fullName,
      birthday: testClient.birthday,
      email: testClient.email
    });
    
    console.log('\n🎂 Birthday notification system is ready to test!');
    console.log('1. Go to Dashboard to see the birthday notification component');
    console.log('2. Click "Notify All Users" to create notifications for all team members');
    console.log('3. Check notifications to see the birthday alerts');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test birthday client:', error);
    process.exit(1);
  }
}

createTestBirthdayClient();
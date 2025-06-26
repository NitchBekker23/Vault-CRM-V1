const { db } = require('./server/db.ts');
const { clients } = require('./shared/schema.ts');

async function createTestClients() {
  try {
    console.log('Creating test clients for sales workflow testing...');
    
    const testClients = [
      {
        customerNumber: 'CUST001',
        firstName: 'Michael',
        lastName: 'Thompson',
        email: 'michael.thompson@email.com',
        phoneNumber: '+27 82 123 4567',
        address: '123 Sandton Drive, Sandton, Johannesburg',
        vipStatus: 'regular',
        totalPurchases: 0,
        totalSpent: '0',
        averagePurchase: '0',
        lastPurchaseDate: null,
        notes: 'Interested in luxury watches, prefers Rolex and Tudor brands'
      },
      {
        customerNumber: 'CUST002', 
        firstName: 'Sarah',
        lastName: 'Williams',
        email: 'sarah.williams@email.com',
        phoneNumber: '+27 83 234 5678',
        address: '456 Melrose Arch, Melrose North, Johannesburg',
        vipStatus: 'vip',
        totalPurchases: 0,
        totalSpent: '0',
        averagePurchase: '0',
        lastPurchaseDate: null,
        notes: 'VIP client, collects vintage timepieces and luxury pens'
      },
      {
        customerNumber: 'CUST003',
        firstName: 'David',
        lastName: 'Johnson',
        email: 'david.johnson@email.com', 
        phoneNumber: '+27 84 345 6789',
        address: '789 Waterfront Drive, V&A Waterfront, Cape Town',
        vipStatus: 'premium',
        totalPurchases: 0,
        totalSpent: '0',
        averagePurchase: '0',
        lastPurchaseDate: null,
        notes: 'Premium client, high-value purchases, prefers Breitling aviation watches'
      },
      {
        customerNumber: 'CUST004',
        firstName: 'Jennifer',
        lastName: 'Davis',
        email: 'jennifer.davis@email.com',
        phoneNumber: '+27 85 456 7890',
        address: '321 Menlyn Park, Pretoria',
        vipStatus: 'regular',
        totalPurchases: 0,
        totalSpent: '0',
        averagePurchase: '0',
        lastPurchaseDate: null,
        notes: 'First-time luxury customer, interested in entry-level luxury items'
      },
      {
        customerNumber: 'CUST005',
        firstName: 'Robert',
        lastName: 'Miller',
        email: 'robert.miller@email.com',
        phoneNumber: '+27 86 567 8901',
        address: '654 Hyde Park Corner, Hyde Park, Johannesburg',
        vipStatus: 'vip',
        totalPurchases: 0,
        totalSpent: '0',
        averagePurchase: '0',
        lastPurchaseDate: null,
        notes: 'Corporate executive, buys gifts for business associates'
      }
    ];

    for (const client of testClients) {
      const result = await db.insert(clients).values(client).returning();
      console.log(`Created client: ${client.firstName} ${client.lastName} (${client.customerNumber})`);
    }

    console.log('\nTest clients created successfully!');
    console.log('You can now use these customer codes in your sales CSV:');
    testClients.forEach(client => {
      console.log(`- ${client.customerNumber}: ${client.firstName} ${client.lastName}`);
    });

  } catch (error) {
    console.error('Error creating test clients:', error);
  }
}

createTestClients();
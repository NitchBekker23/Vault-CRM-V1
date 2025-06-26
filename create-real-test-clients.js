// Create real test clients in the live system
const fs = require('fs');

// First, let's check what inventory items we have available for testing
const createTestData = () => {
  console.log('Creating test clients for real sales workflow testing...');
  
  const testClients = [
    {
      customerNumber: 'TEST001',
      firstName: 'Michael',
      lastName: 'Thompson', 
      email: 'test.michael@example.com',
      phoneNumber: '+27 82 123 4567',
      address: '123 Test Drive, Sandton, Johannesburg',
      vipStatus: 'regular',
      notes: 'TEST CLIENT - DELETE AFTER SALES TEST'
    },
    {
      customerNumber: 'TEST002',
      firstName: 'Sarah',
      lastName: 'Williams',
      email: 'test.sarah@example.com', 
      phoneNumber: '+27 83 234 5678',
      address: '456 Test Arch, Melrose North, Johannesburg',
      vipStatus: 'vip',
      notes: 'TEST CLIENT - DELETE AFTER SALES TEST'
    }
  ];

  // Create CSV for sales testing with actual inventory serial numbers
  const salesTestData = `customerCode,itemSerial,salePrice,saleDate,salesPerson,store
TEST001,20,45000,2025-06-26,AP,001
TEST002,18,95000,2025-06-26,BW,002`;

  fs.writeFileSync('real-sales-test.csv', salesTestData);
  
  console.log('\nTest client data created:');
  testClients.forEach(client => {
    console.log(`${client.customerNumber}: ${client.firstName} ${client.lastName} - ${client.notes}`);
  });
  
  console.log('\nSales test CSV created: real-sales-test.csv');
  console.log('This will test selling:');
  console.log('- Item serial 20 (Navitimer) to TEST001 for R45,000');
  console.log('- Item serial 18 (Air King) to TEST002 for R95,000');
  
  console.log('\nNext steps:');
  console.log('1. Add these clients manually through the Clients interface');
  console.log('2. Upload real-sales-test.csv through Sales Management');
  console.log('3. Verify inventory status changes to "sold"');
  console.log('4. Check client profiles show purchase history');
  console.log('5. Delete test clients and data when done');

  return { testClients, salesTestData };
};

module.exports = { createTestData };

// Run if called directly
if (require.main === module) {
  createTestData();
}
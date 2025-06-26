// Manual setup instructions for sales workflow testing

console.log(`
SALES WORKFLOW TESTING SETUP
============================

1. EXPORT CURRENT INVENTORY:
   - Go to Inventory page
   - Click "Export CSV" button (green download button)
   - This downloads your current stock: vault-inventory-${new Date().toISOString().split('T')[0]}.csv

2. CREATE TEST CLIENTS:
   - Go to Clients page  
   - Add these test clients manually:

   Client 1:
   - Customer Number: CUST001
   - Name: Michael Thompson
   - Email: michael.thompson@email.com
   - Phone: +27 82 123 4567
   - Address: 123 Sandton Drive, Sandton, Johannesburg
   - VIP Status: Regular
   - Notes: Interested in luxury watches, prefers Rolex and Tudor brands

   Client 2:
   - Customer Number: CUST002
   - Name: Sarah Williams  
   - Email: sarah.williams@email.com
   - Phone: +27 83 234 5678
   - Address: 456 Melrose Arch, Melrose North, Johannesburg
   - VIP Status: VIP
   - Notes: VIP client, collects vintage timepieces and luxury pens

   Client 3:
   - Customer Number: CUST003
   - Name: David Johnson
   - Email: david.johnson@email.com
   - Phone: +27 84 345 6789  
   - Address: 789 Waterfront Drive, V&A Waterfront, Cape Town
   - VIP Status: Premium
   - Notes: Premium client, high-value purchases, prefers Breitling aviation watches

3. CREATE SALES CSV:
   Use this template data (save as test-sales.csv):

customerCode,itemSerial,salePrice,saleDate,salesPerson,store
CUST001,20,45000,2025-06-26,AP,001
CUST002,18,95000,2025-06-26,BW,002
CUST003,12,8500,2025-06-26,LW,003

4. TEST SALES UPLOAD:
   - Go to Sales Management page
   - Upload the test-sales.csv file
   - System should:
     * Create sales transactions
     * Move items from inventory to "sold" status
     * Update client purchase history
     * Calculate client statistics

5. VERIFY INTEGRATION:
   - Check inventory: items should show as "sold"
   - Check clients: should show purchase history and updated stats
   - Check sales: transactions should be recorded with all details

This tests the complete workflow from inventory export to sales processing.
`);
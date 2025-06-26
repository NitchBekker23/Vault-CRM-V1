# Real Sales Workflow Test Plan

## Current System Status
- Authentication: Session-based (nitchbekker@gmail.com, owner role)
- Inventory Export: Green "Export CSV" button available in inventory interface
- Available inventory items for testing: Serial 20 (Navitimer), Serial 18 (Air King)

## Step 1: Create Test Clients (2 minutes)
Go to Clients page and add these two test clients:

**Client 1:**
- Customer Number: TEST001
- First Name: Michael
- Last Name: Thompson
- Email: test.michael@example.com
- Phone: +27 82 123 4567
- Address: 123 Test Drive, Sandton, Johannesburg
- VIP Status: Regular
- Notes: TEST CLIENT - DELETE AFTER SALES TEST

**Client 2:**
- Customer Number: TEST002
- First Name: Sarah
- Last Name: Williams
- Email: test.sarah@example.com
- Phone: +27 83 234 5678
- Address: 456 Test Arch, Melrose North, Johannesburg
- VIP Status: VIP
- Notes: TEST CLIENT - DELETE AFTER SALES TEST

## Step 2: Export Current Inventory (30 seconds)
- Go to Inventory page
- Click green "Export CSV" button
- Download shows your current stock with all fields

## Step 3: Create Sales Test CSV
Save this as `real-sales-test.csv`:

```
customerCode,itemSerial,salePrice,saleDate,salesPerson,store
TEST001,20,45000,2025-06-26,AP,001
TEST002,18,95000,2025-06-26,BW,002
```

## Step 4: Upload Sales Data (2 minutes)
- Go to Sales Management page
- Upload `real-sales-test.csv`
- System should process both sales transactions

## Step 5: Verify Complete Integration (3 minutes)

**Inventory Changes:**
- Serial 20 (Navitimer): Status should change from "in_stock" to "sold"
- Serial 18 (Air King): Status should change from "in_stock" to "sold"

**Client Profiles:**
- TEST001: Should show purchase of Navitimer for R45,000
- TEST002: Should show purchase of Air King for R95,000
- Both should have updated purchase statistics

**Sales Records:**
- Sales page should show both transactions
- Complete attribution to stores and sales persons

## Step 6: Cleanup (1 minute)
- Delete TEST001 and TEST002 clients
- Manually change inventory status back to "in_stock" if needed
- Delete sales transactions if required

## Expected Results
- Complete inventory-to-sales-to-client workflow
- Automatic status updates
- Client purchase history tracking
- Sales attribution and reporting
- Full audit trail of all changes

This tests your real production system with actual data that can be verified and cleaned up afterward.
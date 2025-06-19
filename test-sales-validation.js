// Test the sales validation system with authentic business data
import { db } from './server/db.js';
import { stores, salesPersons } from './shared/schema.js';

async function testSalesValidation() {
  console.log('Testing sales validation with authentic business data...\n');

  // Get all stores
  const allStores = await db.select().from(stores);
  console.log('Available Stores:');
  allStores.forEach(store => {
    console.log(`  Code: ${store.code} | Name: ${store.name}`);
  });

  // Get all sales persons
  const allSalesPersons = await db.select().from(salesPersons);
  console.log('\nAvailable Sales Persons:');
  allSalesPersons.forEach(person => {
    console.log(`  Employee ID: ${person.employeeId} | Name: ${person.firstName} ${person.lastName} | Store: ${person.currentStoreId}`);
  });

  console.log('\nCSV Template Examples:');
  console.log('Store Code 001 = Melrose');
  console.log('Store Code 002 = Breitling Sandton');
  console.log('Store Code 003 = Menlyn');
  console.log('Store Code 006 = Breitling V&A');
  console.log('Store Code 099 = HQ');
  
  console.log('\nEmployee ID Examples:');
  console.log('AP = ANANDI POSTHUMA (Melrose)');
  console.log('BW = Bianca Wolhuter (Breitling Sandton)');
  console.log('LW = Leslie West (Breitling V&A)');
  console.log('CR = Charné Riekert (Menlyn)');
  console.log('JR = Jurie Schoeman (HQ)');
}

testSalesValidation().catch(console.error);
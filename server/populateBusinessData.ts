import { db } from './db';
import { stores, salesPersons, salesPersonStoreHistory } from '../shared/schema';

async function populateBusinessData() {
  console.log('Populating business data...');

  try {
    // Clear existing data
    await db.delete(salesPersonStoreHistory);
    await db.delete(salesPersons); 
    await db.delete(stores);

    // Real store data from Excel
    const storeData = [
      {
        name: "HQ",
        code: "099",
        address: "Head Office",
        manager: "Management Team",
        isActive: true
      },
      {
        name: "Melrose",
        code: "001", 
        address: "Shop 11, Melrose Arch, The High St, Birnam, Johannesburg, 2076",
        manager: "Store Manager",
        isActive: true
      },
      {
        name: "Menlyn",
        code: "003",
        address: "Shop G71, Cnr. Atterbury and, Menlyn Park Shopping Centre, Lois Ave, Menlyn, Pretoria, 0181",
        manager: "Store Manager", 
        isActive: true
      },
      {
        name: "Breitling V&A",
        code: "006",
        address: "shop 107, v&a waterfront victoria wharf shopping centre, 8001 cape town, South Africa",
        manager: "Store Manager",
        isActive: true
      },
      {
        name: "Breitling Sandton", 
        code: "002",
        address: "Shop U76B, SANDTON CITY SHOPPING CENTRE, Sandhurst, Sandton, 2196",
        manager: "Store Manager",
        isActive: true
      }
    ];

    // Insert stores
    const insertedStores = await db.insert(stores).values(storeData).returning();
    console.log(`Inserted ${insertedStores.length} stores`);

    // Create store code to ID mapping
    const storeMap: { [key: string]: number } = {};
    insertedStores.forEach(store => {
      storeMap[store.code] = store.id;
    });

    // Real sales person data from Excel
    const salesPersonData = [
      { name: "Jurie Schoeman", code: "JR", storeCode: "099" },
      { name: "ANANDI POSTHUMA", code: "AP", storeCode: "001" },
      { name: "Pieter Jordaan", code: "PJ", storeCode: "001" },
      { name: "David Mayers", code: "DM", storeCode: "001" },
      { name: "Charné Riekert", code: "CR", storeCode: "003" },
      { name: "KEAGAN NEL", code: "KN", storeCode: "001" },
      { name: "ABBY GRAETZ", code: "AG", storeCode: "003" },
      { name: "Rudolph Kok", code: "RK", storeCode: "003" },
      { name: "Leslie West", code: "LW", storeCode: "006" },
      { name: "Justin Divaris", code: "JD", storeCode: "099" },
      { name: "Jessica Riekert", code: "JR2", storeCode: "003" }, // Modified to avoid duplicate code
      { name: "LUSINDA POSTHUMA", code: "LP", storeCode: "001" },
      { name: "Mari-Lize Schoeman", code: "MLS", storeCode: "003" },
      { name: "McQ Pretorius", code: "MCQ", storeCode: "002" },
      { name: "Bianca Wolhuter", code: "BW", storeCode: "002" },
      { name: "CHRIS VOSLOO", code: "CV", storeCode: "002" },
      { name: "TRACEY SAMUEL", code: "TS", storeCode: "002" },
      { name: "Magdeleen Posthuma", code: "MP", storeCode: "003" },
      { name: "Nicolene du Plessis", code: "NP", storeCode: "006" },
      { name: "Neil Macdonald", code: "NM", storeCode: "006" }
    ];

    // Parse names and insert sales persons
    const salesPersonInserts = salesPersonData.map(person => {
      const nameParts = person.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ');
      
      return {
        firstName,
        lastName, 
        employeeId: person.code,
        email: null,
        currentStoreId: storeMap[person.storeCode],
        isActive: true
      };
    });

    const insertedSalesPersons = await db.insert(salesPersons).values(salesPersonInserts).returning();
    console.log(`Inserted ${insertedSalesPersons.length} sales persons`);

    // Create assignment history for each sales person
    const historyInserts = insertedSalesPersons.map(person => ({
      salesPersonId: person.id,
      storeId: person.currentStoreId!,
      startDate: new Date('2024-01-01'), // Assume they started beginning of year
      endDate: null, // Currently active
      isActive: true
    }));

    await db.insert(salesPersonStoreHistory).values(historyInserts);
    console.log(`Created assignment history for ${historyInserts.length} sales persons`);

    console.log('Business data population complete!');
  } catch (error) {
    console.error('Error populating business data:', error);
  }
}

// Run if called directly
populateBusinessData();

export { populateBusinessData };
import fs from 'fs';
import { neon } from '@neondatabase/serverless';

async function restoreData() {
  const sql = neon(process.env.DATABASE_URL);
  
  try {
    console.log('Loading migration data...');
    const migrationData = JSON.parse(fs.readFileSync('migration-data.json', 'utf8'));
    
    console.log(`Found ${migrationData.users.length} users and ${migrationData.inventory_items.length} inventory items`);
    
    // Import users
    console.log('Importing users...');
    for (const user of migrationData.users) {
      await sql`
        INSERT INTO users (id, email, first_name, last_name, profile_image_url, role, status, created_at, updated_at)
        VALUES (${user.id}, ${user.email}, ${user.first_name}, ${user.last_name}, ${user.profile_image_url}, ${user.role}, ${user.status}, ${user.created_at}, ${user.updated_at})
        ON CONFLICT (id) DO UPDATE SET 
          email = EXCLUDED.email,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          profile_image_url = EXCLUDED.profile_image_url,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
      `;
      console.log(`✓ User: ${user.email} (${user.role})`);
    }
    
    // Import inventory items
    console.log('Importing inventory items...');
    for (const item of migrationData.inventory_items) {
      await sql`
        INSERT INTO inventory_items (id, name, brand, serial_number, sku, category, status, condition, price, cost_price, notes, location, date_received, created_by, created_at, updated_at)
        VALUES (
          ${item.id}, 
          ${item.name}, 
          ${item.brand}, 
          ${item.serial_number}, 
          ${item.sku || null}, 
          ${item.category}, 
          ${item.status}, 
          ${item.condition || 'Good'}, 
          ${item.price || null}, 
          ${item.cost || null}, 
          ${item.notes || null}, 
          ${item.location || null}, 
          ${item.date_received || item.created_at}, 
          ${item.created_by || 'system'}, 
          ${item.created_at}, 
          ${item.updated_at}
        )
        ON CONFLICT (id) DO UPDATE SET 
          name = EXCLUDED.name,
          brand = EXCLUDED.brand,
          serial_number = EXCLUDED.serial_number,
          sku = EXCLUDED.sku,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          condition = EXCLUDED.condition,
          price = EXCLUDED.price,
          cost_price = EXCLUDED.cost_price,
          notes = EXCLUDED.notes,
          location = EXCLUDED.location,
          date_received = EXCLUDED.date_received,
          updated_at = EXCLUDED.updated_at
      `;
      console.log(`✓ Item: ${item.name} (${item.brand}) - ${item.status}`);
    }
    
    // Import stores if they exist
    if (migrationData.stores && migrationData.stores.length > 0) {
      console.log('Importing stores...');
      for (const store of migrationData.stores) {
        await sql`
          INSERT INTO stores (id, name, code, location, manager, created_at, updated_at)
          VALUES (${store.id}, ${store.name}, ${store.code}, ${store.location}, ${store.manager}, ${store.created_at}, ${store.updated_at})
          ON CONFLICT (id) DO UPDATE SET 
            name = EXCLUDED.name,
            code = EXCLUDED.code,
            location = EXCLUDED.location,
            manager = EXCLUDED.manager,
            updated_at = EXCLUDED.updated_at
        `;
        console.log(`✓ Store: ${store.name} (${store.code})`);
      }
    }
    
    // Import sales persons if they exist
    if (migrationData.sales_persons && migrationData.sales_persons.length > 0) {
      console.log('Importing sales persons...');
      for (const person of migrationData.sales_persons) {
        await sql`
          INSERT INTO sales_persons (id, employee_id, first_name, last_name, email, phone, hire_date, status, created_at, updated_at)
          VALUES (${person.id}, ${person.employee_id}, ${person.first_name}, ${person.last_name}, ${person.email}, ${person.phone}, ${person.hire_date}, ${person.status}, ${person.created_at}, ${person.updated_at})
          ON CONFLICT (id) DO UPDATE SET 
            employee_id = EXCLUDED.employee_id,
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            email = EXCLUDED.email,
            phone = EXCLUDED.phone,
            hire_date = EXCLUDED.hire_date,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `;
        console.log(`✓ Sales Person: ${person.first_name} ${person.last_name} (${person.employee_id})`);
      }
    }
    
    // Verify the import
    const userCount = await sql`SELECT COUNT(*) as count FROM users`;
    const itemCount = await sql`SELECT COUNT(*) as count FROM inventory_items`;
    
    console.log('\n✅ Data restoration complete!');
    console.log(`Users imported: ${userCount[0].count}`);
    console.log(`Inventory items imported: ${itemCount[0].count}`);
    
    // Verify your owner account
    const ownerCheck = await sql`SELECT id, email, role, status FROM users WHERE email = 'nitchbekker@gmail.com'`;
    if (ownerCheck.length > 0) {
      console.log(`✅ Your account restored: ${ownerCheck[0].email} (${ownerCheck[0].role})`);
    }
    
  } catch (error) {
    console.error('Data restoration failed:', error);
  }
}

restoreData();
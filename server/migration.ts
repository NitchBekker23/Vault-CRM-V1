import { db } from "./db";
import { brands, skus, inventoryItems, clients, clientFiles, clientCategories } from "@shared/schema";
import { sql, eq } from "drizzle-orm";

interface LegacyInventoryItem {
  id: number;
  name: string;
  brand: string;
  serialNumber: string;
  sku?: string;
  category: string;
  price?: string;
  status: string;
  notes?: string;
  createdAt: Date;
  createdBy?: string;
}

interface LegacyClient {
  id: number;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  address?: string;
  createdAt: Date;
}

export class DatabaseMigration {
  async createNewTables() {
    console.log("Creating new normalized tables...");
    
    // Create brands table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create SKUs table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS skus (
        id SERIAL PRIMARY KEY,
        brand_id INTEGER REFERENCES brands(id),
        model VARCHAR NOT NULL,
        sku_code VARCHAR UNIQUE,
        retail_price NUMERIC(10,2),
        condition VARCHAR DEFAULT 'new',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create client files table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_files (
        id SERIAL PRIMARY KEY,
        client_id INTEGER REFERENCES clients(id),
        file_url VARCHAR NOT NULL,
        file_type VARCHAR NOT NULL,
        uploaded_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create client categories table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS client_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL UNIQUE
      )
    `);

    // Add new columns to existing tables
    try {
      await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS sku_id INTEGER REFERENCES skus(id)`);
      await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS location VARCHAR`);
      await db.execute(sql`ALTER TABLE inventory_items ADD COLUMN IF NOT EXISTS added_at TIMESTAMP DEFAULT NOW()`);
      
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS full_name VARCHAR`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS phone_number VARCHAR`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS location VARCHAR`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS client_category VARCHAR DEFAULT 'Regular'`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS total_spend NUMERIC(12,2) DEFAULT 0`);
      await db.execute(sql`ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT`);
    } catch (error) {
      console.log("Some columns already exist, continuing...");
    }

    console.log("New tables and columns created successfully");
  }

  async migrateInventoryData() {
    console.log("Migrating inventory data...");

    // Get all existing inventory items
    const existingItems = await db.execute(sql`
      SELECT id, name, brand, serial_number, sku, category, price, status, notes, created_at, created_by
      FROM inventory_items 
      WHERE sku_id IS NULL
    `);

    const brandMap = new Map<string, number>();
    const skuMap = new Map<string, number>();

    for (const item of existingItems.rows) {
      const brandName = item.brand as string;
      const modelName = item.name as string;
      const skuCode = item.sku as string || `${brandName}-${modelName}`.replace(/\s+/g, '-');

      // Create or get brand
      let brandId = brandMap.get(brandName);
      if (!brandId) {
        try {
          const [brand] = await db.insert(brands).values({
            name: brandName
          }).returning();
          brandId = brand.id;
          brandMap.set(brandName, brandId);
        } catch (error) {
          // Brand might already exist
          const existingBrand = await db.execute(sql`SELECT id FROM brands WHERE name = ${brandName}`);
          brandId = existingBrand.rows[0]?.id as number;
          brandMap.set(brandName, brandId);
        }
      }

      // Create or get SKU
      let skuId = skuMap.get(skuCode);
      if (!skuId) {
        try {
          const [sku] = await db.insert(skus).values({
            brandId,
            model: modelName,
            skuCode,
            retailPrice: item.price as string || "0",
          }).returning();
          skuId = sku.id;
          skuMap.set(skuCode, skuId);
        } catch (error) {
          // SKU might already exist
          const existingSku = await db.execute(sql`SELECT id FROM skus WHERE sku_code = ${skuCode}`);
          skuId = existingSku.rows[0]?.id as number;
          skuMap.set(skuCode, skuId);
        }
      }

      // Update inventory item with SKU reference
      await db.execute(sql`
        UPDATE inventory_items 
        SET sku_id = ${skuId}, added_at = created_at
        WHERE id = ${item.id}
      `);
    }

    console.log("Inventory data migration completed");
  }

  async migrateClientData() {
    console.log("Migrating client data...");

    // Insert default client categories
    const defaultCategories = ['Regular', 'VIP', 'Wholesale'];
    for (const category of defaultCategories) {
      try {
        await db.insert(clientCategories).values({ name: category });
      } catch (error) {
        // Category might already exist
      }
    }

    // Update existing clients with full_name and phone_number
    await db.execute(sql`
      UPDATE clients 
      SET 
        full_name = COALESCE(first_name || ' ' || last_name, first_name, last_name, email),
        phone_number = phone
      WHERE full_name IS NULL
    `);

    console.log("Client data migration completed");
  }

  async runFullMigration() {
    try {
      console.log("Starting database migration to normalized schema...");
      
      await this.createNewTables();
      await this.migrateInventoryData();
      await this.migrateClientData();
      
      console.log("Migration completed successfully!");
      return true;
    } catch (error) {
      console.error("Migration failed:", error);
      return false;
    }
  }
}

export const migration = new DatabaseMigration();
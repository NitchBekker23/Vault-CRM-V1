import { db } from "./db";
import { 
  users, inventoryItems, clients, sales, purchases, 
  activityLogs, wishlistItems, brands, skus, clientCategories,
  accountRequests, accountSetupTokens, passwordResetTokens,
  twoFactorCodes, imageStorage, itemImages
} from "@shared/schema";

export class SupabaseMigration {
  private sourceDb = db; // Current Neon database
  
  async exportAllData() {
    console.log("🔄 Starting data export from current database...");
    
    try {
      const exportData = {
        users: await this.sourceDb.select().from(users),
        brands: await this.sourceDb.select().from(brands),
        skus: await this.sourceDb.select().from(skus),
        clientCategories: await this.sourceDb.select().from(clientCategories),
        inventoryItems: await this.sourceDb.select().from(inventoryItems),
        clients: await this.sourceDb.select().from(clients),
        sales: await this.sourceDb.select().from(sales),
        purchases: await this.sourceDb.select().from(purchases),
        activityLogs: await this.sourceDb.select().from(activityLogs),
        wishlistItems: await this.sourceDb.select().from(wishlistItems),
        accountRequests: await this.sourceDb.select().from(accountRequests),
        accountSetupTokens: await this.sourceDb.select().from(accountSetupTokens),
        passwordResetTokens: await this.sourceDb.select().from(passwordResetTokens),
        twoFactorCodes: await this.sourceDb.select().from(twoFactorCodes),
        imageStorage: await this.sourceDb.select().from(imageStorage),
        itemImages: await this.sourceDb.select().from(itemImages)
      };

      // Count records for verification
      const counts = Object.entries(exportData).map(([table, data]) => ({
        table,
        count: data.length
      }));

      console.log("📊 Export Summary:");
      counts.forEach(({ table, count }) => {
        console.log(`  ${table}: ${count} records`);
      });

      return exportData;
    } catch (error) {
      console.error("❌ Export failed:", error);
      throw error;
    }
  }

  async testConnection() {
    try {
      // Test basic connection
      const result = await this.sourceDb.execute("SELECT current_database(), version()");
      console.log("✅ Database connection successful");
      console.log("📍 Connected to:", result[0]);
      return true;
    } catch (error) {
      console.error("❌ Connection test failed:", error);
      return false;
    }
  }

  async validateSchema() {
    try {
      // Check if all required tables exist
      const tables = [
        'users', 'brands', 'skus', 'inventory_items', 'clients', 
        'sales', 'purchases', 'activity_logs', 'wishlist_items'
      ];

      for (const table of tables) {
        const result = await this.sourceDb.execute(
          `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = '${table}')`
        );
        console.log(`📋 Table ${table}: ${result[0].exists ? '✅' : '❌'}`);
      }
      
      return true;
    } catch (error) {
      console.error("❌ Schema validation failed:", error);
      return false;
    }
  }

  async performMigration() {
    console.log("🚀 Starting Supabase migration...");
    
    // Step 1: Test current connection
    const connectionOk = await this.testConnection();
    if (!connectionOk) {
      throw new Error("Current database connection failed");
    }

    // Step 2: Export data
    const exportedData = await this.exportAllData();
    
    console.log("✅ Migration preparation complete!");
    console.log("📝 Next steps:");
    console.log("1. Update DATABASE_URL in Replit Secrets to your Supabase connection string");
    console.log("2. Run: npm run db:push");
    console.log("3. Run: node -e \"require('./server/supabaseMigration.ts').importData()\"");
    
    return exportedData;
  }
}

export const supabaseMigration = new SupabaseMigration();
import {
  users,
  inventoryItems,
  wishlistItems,
  clients,
  purchases,
  sales,
  saleItems,
  activityLog,
  type User,
  type UpsertUser,
  type InventoryItem,
  type InsertInventoryItem,
  type WishlistItem,
  type InsertWishlistItem,
  type Client,
  type InsertClient,
  type Purchase,
  type InsertPurchase,
  type Sale,
  type InsertSale,
  type SaleItem,
  type InsertSaleItem,
  type ActivityLog,
  type InsertActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, ilike, or } from "drizzle-orm";
import { inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Inventory operations
  getInventoryItems(
    page?: number,
    limit?: number,
    search?: string,
    category?: string,
    status?: string
  ): Promise<{ items: InventoryItem[]; total: number }>;
  getInventoryItem(id: number): Promise<InventoryItem | undefined>;
  getInventoryItemBySerialNumber(serialNumber: string): Promise<InventoryItem | undefined>;
  createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem>;
  updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem>;
  deleteInventoryItem(id: number): Promise<void>;
  bulkDeleteInventoryItems(ids: number[]): Promise<void>;

  // Wishlist operations
  getWishlistItems(
    page?: number,
    limit?: number,
    userId?: string
  ): Promise<{ items: WishlistItem[]; total: number }>;
  createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem>;
  updateWishlistItem(id: number, item: Partial<InsertWishlistItem>): Promise<WishlistItem>;
  deleteWishlistItem(id: number): Promise<void>;

  // Client operations
  getClients(page?: number, limit?: number): Promise<{ clients: Client[]; total: number }>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;

  // Purchase operations
  getPurchases(clientId?: number): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;

  // Sales operations
  getSales(search?: string): Promise<{ sales: Sale[]; total: number }>;
  createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<Sale>;
  getSalesByClient(clientId: number): Promise<Sale[]>;

  // Activity log operations
  getRecentActivities(limit?: number): Promise<ActivityLog[]>;
  createActivity(activity: InsertActivityLog): Promise<ActivityLog>;

  // Dashboard metrics
  getDashboardMetrics(): Promise<{
    totalInventory: number;
    inStock: number;
    wishlistRequests: number;
    salesThisMonth: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getInventoryItems(
    page = 1,
    limit = 10,
    search?: string,
    category?: string,
    status?: string
  ): Promise<{ items: InventoryItem[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(inventoryItems.name, `%${search}%`),
          ilike(inventoryItems.brand, `%${search}%`),
          ilike(inventoryItems.serialNumber, `%${search}%`)
        )
      );
    }
    
    if (category) {
      whereConditions.push(eq(inventoryItems.category, category));
    }
    
    if (status) {
      whereConditions.push(eq(inventoryItems.status, status));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(inventoryItems)
        .where(whereClause)
        .orderBy(desc(inventoryItems.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(inventoryItems)
        .where(whereClause),
    ]);

    return {
      items,
      total: Number(totalResult[0].count),
    };
  }

  async getInventoryItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.id, id));
    return item;
  }

  async getInventoryItemBySerialNumber(serialNumber: string): Promise<InventoryItem | undefined> {
    const [item] = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.serialNumber, serialNumber));
    return item;
  }

  async createInventoryItem(item: InsertInventoryItem): Promise<InventoryItem> {
    const [newItem] = await db
      .insert(inventoryItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateInventoryItem(id: number, item: Partial<InsertInventoryItem>): Promise<InventoryItem> {
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteInventoryItem(id: number): Promise<void> {
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  async bulkDeleteInventoryItems(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(inventoryItems).where(inArray(inventoryItems.id, ids));
  }

  async getWishlistItems(
    page = 1,
    limit = 10,
    userId?: string
  ): Promise<{ items: WishlistItem[]; total: number }> {
    const offset = (page - 1) * limit;
    
    const whereClause = userId ? eq(wishlistItems.userId, userId) : undefined;

    const [items, totalResult] = await Promise.all([
      db
        .select()
        .from(wishlistItems)
        .where(whereClause)
        .orderBy(desc(wishlistItems.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(wishlistItems)
        .where(whereClause),
    ]);

    return {
      items,
      total: Number(totalResult[0].count),
    };
  }

  async createWishlistItem(item: InsertWishlistItem): Promise<WishlistItem> {
    const [newItem] = await db
      .insert(wishlistItems)
      .values(item)
      .returning();
    return newItem;
  }

  async updateWishlistItem(id: number, item: Partial<InsertWishlistItem>): Promise<WishlistItem> {
    const [updatedItem] = await db
      .update(wishlistItems)
      .set({ ...item, updatedAt: new Date() })
      .where(eq(wishlistItems.id, id))
      .returning();
    return updatedItem;
  }

  async deleteWishlistItem(id: number): Promise<void> {
    await db.delete(wishlistItems).where(eq(wishlistItems.id, id));
  }

  async getClients(page = 1, limit = 10): Promise<{ clients: Client[]; total: number }> {
    const offset = (page - 1) * limit;

    const [clientsList, totalResult] = await Promise.all([
      db
        .select()
        .from(clients)
        .orderBy(desc(clients.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(clients),
    ]);

    return {
      clients: clientsList,
      total: Number(totalResult[0].count),
    };
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db
      .select()
      .from(clients)
      .where(eq(clients.id, id));
    return client;
  }

  async createClient(client: InsertClient): Promise<Client> {
    const [newClient] = await db
      .insert(clients)
      .values(client)
      .returning();
    return newClient;
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client> {
    const [updatedClient] = await db
      .update(clients)
      .set({ ...client, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return updatedClient;
  }

  async getPurchases(clientId?: number): Promise<Purchase[]> {
    const whereClause = clientId ? eq(purchases.clientId, clientId) : undefined;
    
    return db
      .select()
      .from(purchases)
      .where(whereClause)
      .orderBy(desc(purchases.purchaseDate));
  }

  async createPurchase(purchase: InsertPurchase): Promise<Purchase> {
    const [newPurchase] = await db
      .insert(purchases)
      .values(purchase)
      .returning();
    return newPurchase;
  }

  async getRecentActivities(limit = 10): Promise<ActivityLog[]> {
    return db
      .select()
      .from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  async createActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const [newActivity] = await db
      .insert(activityLog)
      .values(activity)
      .returning();
    return newActivity;
  }

  async getDashboardMetrics(): Promise<{
    totalInventory: number;
    inStock: number;
    wishlistRequests: number;
    salesThisMonth: number;
  }> {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [totalInventoryResult, inStockResult, wishlistResult, salesResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(inventoryItems),
      db
        .select({ count: sql<number>`count(*)` })
        .from(inventoryItems)
        .where(eq(inventoryItems.status, "in_stock")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(wishlistItems)
        .where(eq(wishlistItems.status, "active")),
      db
        .select({ total: sql<number>`sum(purchase_price)` })
        .from(purchases)
        .where(sql`purchase_date >= ${currentMonth}`),
    ]);

    return {
      totalInventory: Number(totalInventoryResult[0].count),
      inStock: Number(inStockResult[0].count),
      wishlistRequests: Number(wishlistResult[0].count),
      salesThisMonth: Number(salesResult[0].total || 0),
    };
  }
}

export const storage = new DatabaseStorage();

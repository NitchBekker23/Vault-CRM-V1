import {
  users,
  inventoryItems,
  wishlistItems,
  clients,
  purchases,
  sales,
  saleItems,
  activityLog,
  accountRequests,
  twoFactorCodes,
  accountSetupTokens,
  passwordResetTokens,
  notifications,
  salesTransactions,
  transactionStatusLog,
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
  type AccountRequest,
  type InsertAccountRequest,
  type TwoFactorCode,
  type InsertTwoFactorCode,
  type AccountSetupToken,
  type InsertAccountSetupToken,
  type PasswordResetToken,
  type InsertPasswordResetToken,
  type Notification,
  type InsertNotification,
  type SalesTransaction,
  type InsertSalesTransaction,
  type TransactionStatusLog,
  type InsertTransactionStatusLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql, and, ilike, or, gte, lt, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Account request operations
  createAccountRequest(request: InsertAccountRequest): Promise<AccountRequest>;
  getAccountRequests(status?: string): Promise<AccountRequest[]>;
  getAccountRequest(id: number): Promise<AccountRequest | undefined>;
  reviewAccountRequest(id: number, reviewerId: string, approved: boolean, denialReason?: string): Promise<AccountRequest>;
  
  // User management operations
  getAllUsers(): Promise<User[]>;
  updateUser(id: string, userData: Partial<User>): Promise<User>;
  updateUserStatus(id: string, status: string): Promise<User>;
  updateUserRole(id: string, role: string): Promise<User>;
  deleteUser(id: string): Promise<void>;
  
  // Two-factor authentication operations
  createTwoFactorCode(code: InsertTwoFactorCode): Promise<TwoFactorCode>;
  getTwoFactorCode(userId: string, code: string): Promise<TwoFactorCode | undefined>;
  markTwoFactorCodeUsed(id: number): Promise<void>;
  cleanupExpiredCodes(): Promise<void>;
  
  // Account setup token operations
  createAccountSetupToken(token: InsertAccountSetupToken): Promise<AccountSetupToken>;
  getAccountSetupToken(token: string): Promise<AccountSetupToken | undefined>;
  markAccountSetupTokenUsed(id: number): Promise<void>;

  // Password reset operations
  createPasswordResetToken(token: InsertPasswordResetToken): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<void>;
  updateUserPassword(email: string, hashedPassword: string): Promise<User>;

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
  getInventoryItemsBySku(sku: string): Promise<InventoryItem[]>;
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
    reserved: number;
    wishlistRequests: number;
    salesThisMonth: number;
  }>;

  // Notification operations
  getNotifications(userId: string, unreadOnly?: boolean, limit?: number): Promise<Notification[]>;
  getNotificationCount(userId: string, unreadOnly?: boolean): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number, userId: string): Promise<void>;
  markAllNotificationsRead(userId: string): Promise<void>;
  deleteNotification(id: number, userId: string): Promise<void>;

  // Sales Transaction operations
  getSalesTransactions(
    page?: number,
    limit?: number,
    search?: string,
    transactionType?: string,
    dateRange?: string
  ): Promise<{ transactions: SalesTransaction[]; total: number }>;
  getSalesTransaction(id: number): Promise<SalesTransaction | undefined>;
  createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction>;
  findDuplicateTransaction(clientId: number, inventoryItemId: number, saleDate: Date): Promise<SalesTransaction | undefined>;
  processSalesCSVImport(csvBuffer: Buffer, userId: string, batchId: string): Promise<{
    successful: number;
    errors: Array<{ row: number; error: string; data: any }>;
    duplicates: Array<{ row: number; existing: SalesTransaction; data: any }>;
  }>;
  previewSalesCSVImport(csvBuffer: Buffer): Promise<{
    valid: Array<any>;
    duplicates: Array<{ row: number; existing: SalesTransaction; data: any }>;
    errors: Array<{ row: number; error: string; data: any }>;
  }>;
  updateClientPurchaseStats(clientId: number): Promise<void>;
  logTransactionStatusChange(
    transactionId: number,
    statusFrom: string,
    statusTo: string,
    reason: string,
    changedBy: string,
    notes?: string
  ): Promise<TransactionStatusLog>;
  getClientPurchaseHistory(
    clientId: number,
    page?: number,
    limit?: number
  ): Promise<{ transactions: SalesTransaction[]; total: number }>;
  getSalesAnalytics(dateRange?: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    topClients: Array<{ client: Client; totalSpent: number; transactionCount: number }>;
    recentTransactions: SalesTransaction[];
  }>;
}

export class DatabaseStorage implements IStorage {
  async testConnection(): Promise<void> {
    try {
      await db.execute(sql`SELECT 1`);
      console.log('Database connection test successful');
    } catch (error) {
      console.error('Database connection test failed:', error);
      throw new Error('Database connection failed');
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw error;
    }
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
    status?: string,
    dateRange?: string
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

    if (dateRange) {
      const now = new Date();
      let dateCondition;
      
      switch (dateRange) {
        case 'last-7-days':
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateCondition = gte(inventoryItems.dateReceived, sevenDaysAgo);
          break;
        case 'last-30-days':
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          dateCondition = gte(inventoryItems.dateReceived, thirtyDaysAgo);
          break;
        case 'last-90-days':
          const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          dateCondition = gte(inventoryItems.dateReceived, ninetyDaysAgo);
          break;
        case 'over-90-days':
          const ninetyDaysAgoForOlder = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          dateCondition = lt(inventoryItems.dateReceived, ninetyDaysAgoForOlder);
          break;
      }
      
      if (dateCondition) {
        whereConditions.push(dateCondition);
      }
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

  async getInventoryItemsBySku(sku: string): Promise<InventoryItem[]> {
    if (!sku) return [];
    const items = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.sku, sku));
    return items;
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

  async getSales(search?: string): Promise<{ sales: Sale[]; total: number }> {
    // Build the base query
    const baseQuery = db
      .select()
      .from(sales)
      .leftJoin(clients, eq(sales.clientId, clients.id));

    // Apply search filter if provided
    const whereConditions = [];
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(
        or(
          ilike(clients.firstName, searchTerm),
          ilike(clients.lastName, searchTerm),
          ilike(clients.email, searchTerm)
        )
      );
    }

    // Execute query with optional where clause
    const salesResults = whereConditions.length > 0 
      ? await baseQuery.where(and(...whereConditions)).orderBy(desc(sales.createdAt))
      : await baseQuery.orderBy(desc(sales.createdAt));
    
    // Transform results and get sale items
    const salesWithItems = await Promise.all(
      salesResults.map(async (result) => {
        const sale = result.sales;
        const client = result.clients;
        
        const items = await db
          .select({
            id: saleItems.id,
            salePrice: saleItems.salePrice,
            inventoryItem: {
              name: inventoryItems.name,
              brand: inventoryItems.brand,
              serialNumber: inventoryItems.serialNumber,
            },
          })
          .from(saleItems)
          .leftJoin(inventoryItems, eq(saleItems.inventoryItemId, inventoryItems.id))
          .where(eq(saleItems.saleId, sale.id));

        return {
          id: sale.id,
          clientId: sale.clientId,
          saleDate: sale.saleDate,
          totalAmount: sale.totalAmount,
          notes: sale.notes,
          createdBy: sale.createdBy,
          createdAt: sale.createdAt,
          client: client ? {
            firstName: client.firstName,
            lastName: client.lastName,
            email: client.email,
          } : null,
          saleItems: items,
        };
      })
    );

    return {
      sales: salesWithItems as Sale[],
      total: salesWithItems.length,
    };
  }

  async createSale(sale: InsertSale, items: InsertSaleItem[]): Promise<Sale> {
    return await db.transaction(async (tx) => {
      // Create the sale
      const [newSale] = await tx.insert(sales).values(sale).returning();

      // Create sale items
      const saleItemsWithSaleId = items.map(item => ({
        ...item,
        saleId: newSale.id,
      }));
      
      await tx.insert(saleItems).values(saleItemsWithSaleId);

      // Update inventory status to sold
      for (const item of items) {
        await tx
          .update(inventoryItems)
          .set({ status: "sold" })
          .where(eq(inventoryItems.id, item.inventoryItemId));
      }

      return newSale;
    });
  }

  async getSalesByClient(clientId: number): Promise<Sale[]> {
    const salesResults = await db
      .select()
      .from(sales)
      .where(eq(sales.clientId, clientId))
      .orderBy(desc(sales.createdAt));

    return salesResults;
  }

  // Account request operations
  async createAccountRequest(request: InsertAccountRequest): Promise<AccountRequest> {
    const [newRequest] = await db
      .insert(accountRequests)
      .values(request)
      .returning();
    return newRequest;
  }

  async getAccountRequests(status?: string): Promise<AccountRequest[]> {
    const query = db.select().from(accountRequests);
    
    if (status) {
      return query
        .where(sql`${accountRequests.status} = ${status}`)
        .orderBy(desc(accountRequests.requestedAt));
    }
    
    return query.orderBy(desc(accountRequests.requestedAt));
  }

  async getAccountRequest(id: number): Promise<AccountRequest | undefined> {
    const [request] = await db
      .select()
      .from(accountRequests)
      .where(eq(accountRequests.id, id));
    return request;
  }

  async reviewAccountRequest(id: number, reviewerId: string, approved: boolean, denialReason?: string): Promise<AccountRequest> {
    const [updatedRequest] = await db
      .update(accountRequests)
      .set({
        status: approved ? "approved" : "denied",
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        denialReason: approved ? null : denialReason,
      })
      .where(eq(accountRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // User management operations
  async getAllUsers(): Promise<User[]> {
    return db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async updateUserStatus(id: string, status: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        status: sql`${status}`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        role: sql`${role}`,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUser(id: string, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        ...userData,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Two-factor authentication operations
  async createTwoFactorCode(code: InsertTwoFactorCode): Promise<TwoFactorCode> {
    const [newCode] = await db
      .insert(twoFactorCodes)
      .values(code)
      .returning();
    return newCode;
  }

  async getTwoFactorCode(userId: string, code: string): Promise<TwoFactorCode | undefined> {
    const [result] = await db
      .select()
      .from(twoFactorCodes)
      .where(
        and(
          eq(twoFactorCodes.userId, userId),
          eq(twoFactorCodes.code, code),
          sql`${twoFactorCodes.expiresAt} > NOW()`,
          sql`${twoFactorCodes.usedAt} IS NULL`
        )
      );
    return result;
  }

  async markTwoFactorCodeUsed(id: number): Promise<void> {
    await db
      .update(twoFactorCodes)
      .set({ usedAt: new Date() })
      .where(eq(twoFactorCodes.id, id));
  }

  async cleanupExpiredCodes(): Promise<void> {
    await db
      .delete(twoFactorCodes)
      .where(sql`${twoFactorCodes.expiresAt} < NOW()`);
  }

  // Account setup token operations
  async createAccountSetupToken(token: InsertAccountSetupToken): Promise<AccountSetupToken> {
    const [newToken] = await db
      .insert(accountSetupTokens)
      .values(token)
      .returning();
    return newToken;
  }

  async getAccountSetupToken(token: string): Promise<AccountSetupToken | undefined> {
    const [result] = await db
      .select()
      .from(accountSetupTokens)
      .where(
        and(
          eq(accountSetupTokens.token, token),
          sql`${accountSetupTokens.expiresAt} > NOW()`,
          sql`${accountSetupTokens.usedAt} IS NULL`
        )
      );
    return result;
  }

  async markAccountSetupTokenUsed(id: number): Promise<void> {
    await db
      .update(accountSetupTokens)
      .set({ usedAt: new Date() })
      .where(eq(accountSetupTokens.id, id));
  }

  async createPasswordResetToken(tokenData: InsertPasswordResetToken): Promise<PasswordResetToken> {
    const [token] = await db
      .insert(passwordResetTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(and(
        eq(passwordResetTokens.token, token),
        eq(passwordResetTokens.used, false),
        sql`${passwordResetTokens.expiresAt} > NOW()`
      ));
    return resetToken;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ 
        used: true,
        usedAt: new Date() 
      })
      .where(eq(passwordResetTokens.id, id));
  }

  async updateUserPassword(email: string, hashedPassword: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.email, email))
      .returning();
    return user;
  }

  async getDashboardMetrics(): Promise<{
    totalInventory: number;
    inStock: number;
    reserved: number;
    sold: number;
    wishlistRequests: number;
    salesThisMonth: number;
  }> {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const [totalInventoryResult, inStockResult, reservedResult, soldResult, wishlistResult, salesResult] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(inventoryItems),
      db
        .select({ count: sql<number>`count(*)` })
        .from(inventoryItems)
        .where(eq(inventoryItems.status, "in_stock")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(inventoryItems)
        .where(eq(inventoryItems.status, "reserved")),
      db
        .select({ count: sql<number>`count(*)` })
        .from(inventoryItems)
        .where(eq(inventoryItems.status, "sold")),
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
      reserved: Number(reservedResult[0].count),
      sold: Number(soldResult[0].count),
      wishlistRequests: Number(wishlistResult[0].count),
      salesThisMonth: Number(salesResult[0].total || 0),
    };
  }

  // Notification operations
  async getNotifications(userId: string, unreadOnly = false, limit = 50): Promise<Notification[]> {
    const query = db
      .select()
      .from(notifications)
      .where(
        unreadOnly 
          ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
          : eq(notifications.userId, userId)
      )
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return await query;
  }

  async getNotificationCount(userId: string, unreadOnly = false): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        unreadOnly 
          ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
          : eq(notifications.userId, userId)
      );

    return result.count;
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db
      .insert(notifications)
      .values(notification)
      .returning();
    return created;
  }

  async markNotificationRead(id: number, userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        isRead: true, 
        readAt: new Date() 
      })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      );
  }

  async markAllNotificationsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ 
        isRead: true, 
        readAt: new Date() 
      })
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );
  }

  async deleteNotification(id: number, userId: string): Promise<void> {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      );
  }

  // Sales Transaction Methods

  async getSalesTransactions(
    page: number = 1,
    limit: number = 10,
    search?: string,
    transactionType?: string,
    dateRange?: string
  ): Promise<{ transactions: SalesTransaction[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          ilike(clients.fullName, `%${search}%`),
          ilike(inventoryItems.name, `%${search}%`),
          ilike(inventoryItems.serialNumber, `%${search}%`)
        )
      );
    }

    if (transactionType && transactionType !== 'all') {
      whereConditions.push(sql`${salesTransactions.transactionType} = ${transactionType}`);
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      whereConditions.push(gte(salesTransactions.saleDate, startDate));
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    const [transactions, totalResult] = await Promise.all([
      db
        .select({
          id: salesTransactions.id,
          clientId: salesTransactions.clientId,
          inventoryItemId: salesTransactions.inventoryItemId,
          transactionType: salesTransactions.transactionType,
          saleDate: salesTransactions.saleDate,
          retailPrice: salesTransactions.retailPrice,
          sellingPrice: salesTransactions.sellingPrice,
          profitMargin: salesTransactions.profitMargin,
          originalTransactionId: salesTransactions.originalTransactionId,
          csvBatchId: salesTransactions.csvBatchId,
          source: salesTransactions.source,
          notes: salesTransactions.notes,
          processedBy: salesTransactions.processedBy,
          createdAt: salesTransactions.createdAt,
          updatedAt: salesTransactions.updatedAt,
          clientName: clients.fullName,
          itemName: inventoryItems.name,
          itemSerialNumber: inventoryItems.serialNumber,
        })
        .from(salesTransactions)
        .leftJoin(clients, eq(salesTransactions.clientId, clients.id))
        .leftJoin(inventoryItems, eq(salesTransactions.inventoryItemId, inventoryItems.id))
        .where(whereClause)
        .orderBy(desc(salesTransactions.saleDate))
        .limit(limit)
        .offset(offset),
      
      db
        .select({ count: sql<number>`count(*)` })
        .from(salesTransactions)
        .leftJoin(clients, eq(salesTransactions.clientId, clients.id))
        .leftJoin(inventoryItems, eq(salesTransactions.inventoryItemId, inventoryItems.id))
        .where(whereClause)
    ]);

    return {
      transactions: transactions as SalesTransaction[],
      total: totalResult[0]?.count || 0,
    };
  }

  async getSalesTransaction(id: number): Promise<SalesTransaction | undefined> {
    const [transaction] = await db
      .select()
      .from(salesTransactions)
      .where(eq(salesTransactions.id, id));
    
    return transaction;
  }

  async createSalesTransaction(transaction: InsertSalesTransaction): Promise<SalesTransaction> {
    const [newTransaction] = await db
      .insert(salesTransactions)
      .values(transaction)
      .returning();
    
    return newTransaction;
  }

  async findDuplicateTransaction(
    clientId: number,
    inventoryItemId: number,
    saleDate: Date
  ): Promise<SalesTransaction | undefined> {
    const sameDayStart = new Date(saleDate);
    sameDayStart.setHours(0, 0, 0, 0);
    const sameDayEnd = new Date(saleDate);
    sameDayEnd.setHours(23, 59, 59, 999);

    const [existing] = await db
      .select()
      .from(salesTransactions)
      .where(
        and(
          eq(salesTransactions.clientId, clientId),
          eq(salesTransactions.inventoryItemId, inventoryItemId),
          gte(salesTransactions.saleDate, sameDayStart),
          lt(salesTransactions.saleDate, sameDayEnd)
        )
      );
    
    return existing;
  }

  async processSalesCSVImport(csvBuffer: Buffer, userId: string, batchId: string): Promise<{
    successful: number;
    errors: Array<{ row: number; error: string; data: any }>;
    duplicates: Array<{ row: number; existing: SalesTransaction; data: any }>;
  }> {
    const csv = require('csv-parser');
    const { Readable } = require('stream');
    
    const results: any[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];
    const duplicates: Array<{ row: number; existing: SalesTransaction; data: any }> = [];
    let successful = 0;

    return new Promise((resolve, reject) => {
      const stream = Readable.from(csvBuffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (data: any) => {
          results.push(data);
        })
        .on('end', async () => {
          try {
            for (let i = 0; i < results.length; i++) {
              const row = results[i];
              const rowNumber = i + 2; // +2 because CSV header is row 1, data starts at row 2

              try {
                // Validate required fields
                if (!row.clientEmail || !row.itemSerialNumber || !row.saleDate || !row.sellingPrice) {
                  errors.push({
                    row: rowNumber,
                    error: "Missing required fields: clientEmail, itemSerialNumber, saleDate, sellingPrice",
                    data: row
                  });
                  continue;
                }

                // Find client by email
                const [client] = await db
                  .select()
                  .from(clients)
                  .where(eq(clients.email, row.clientEmail));

                if (!client) {
                  errors.push({
                    row: rowNumber,
                    error: `Client not found with email: ${row.clientEmail}`,
                    data: row
                  });
                  continue;
                }

                // Find inventory item by serial number
                const [inventoryItem] = await db
                  .select()
                  .from(inventoryItems)
                  .where(eq(inventoryItems.serialNumber, row.itemSerialNumber));

                if (!inventoryItem) {
                  errors.push({
                    row: rowNumber,
                    error: `Inventory item not found with serial number: ${row.itemSerialNumber}`,
                    data: row
                  });
                  continue;
                }

                const saleDate = new Date(row.saleDate);
                if (isNaN(saleDate.getTime())) {
                  errors.push({
                    row: rowNumber,
                    error: `Invalid sale date format: ${row.saleDate}`,
                    data: row
                  });
                  continue;
                }

                // Check for duplicates
                const existing = await this.findDuplicateTransaction(
                  client.id,
                  inventoryItem.id,
                  saleDate
                );

                if (existing) {
                  duplicates.push({
                    row: rowNumber,
                    existing,
                    data: row
                  });
                  continue;
                }

                // Create transaction
                const transactionData: InsertSalesTransaction = {
                  clientId: client.id,
                  inventoryItemId: inventoryItem.id,
                  transactionType: (row.transactionType as any) || 'sale',
                  saleDate,
                  retailPrice: row.retailPrice ? parseFloat(row.retailPrice).toString() : null,
                  sellingPrice: parseFloat(row.sellingPrice).toString(),
                  profitMargin: row.profitMargin ? parseFloat(row.profitMargin).toString() : null,
                  csvBatchId: batchId,
                  source: 'csv_import',
                  notes: row.notes || null,
                  processedBy: userId,
                };

                await this.createSalesTransaction(transactionData);

                // Update inventory item status
                await this.updateInventoryItem(inventoryItem.id, {
                  status: 'sold'
                });

                // Update client statistics
                await this.updateClientPurchaseStats(client.id);

                successful++;

              } catch (error) {
                errors.push({
                  row: rowNumber,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  data: row
                });
              }
            }

            resolve({ successful, errors, duplicates });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  async previewSalesCSVImport(csvBuffer: Buffer): Promise<{
    valid: Array<any>;
    duplicates: Array<{ row: number; existing: SalesTransaction; data: any }>;
    errors: Array<{ row: number; error: string; data: any }>;
  }> {
    const csv = require('csv-parser');
    const { Readable } = require('stream');
    
    const results: any[] = [];
    const valid: any[] = [];
    const errors: Array<{ row: number; error: string; data: any }> = [];
    const duplicates: Array<{ row: number; existing: SalesTransaction; data: any }> = [];

    return new Promise((resolve, reject) => {
      const stream = Readable.from(csvBuffer.toString());
      
      stream
        .pipe(csv())
        .on('data', (data: any) => {
          results.push(data);
        })
        .on('end', async () => {
          try {
            for (let i = 0; i < results.length; i++) {
              const row = results[i];
              const rowNumber = i + 2;

              try {
                // Validate required fields
                if (!row.clientEmail || !row.itemSerialNumber || !row.saleDate || !row.sellingPrice) {
                  errors.push({
                    row: rowNumber,
                    error: "Missing required fields",
                    data: row
                  });
                  continue;
                }

                // Find client and inventory item
                const [client] = await db
                  .select()
                  .from(clients)
                  .where(eq(clients.email, row.clientEmail));

                const [inventoryItem] = await db
                  .select()
                  .from(inventoryItems)
                  .where(eq(inventoryItems.serialNumber, row.itemSerialNumber));

                if (!client || !inventoryItem) {
                  errors.push({
                    row: rowNumber,
                    error: !client ? "Client not found" : "Inventory item not found",
                    data: row
                  });
                  continue;
                }

                const saleDate = new Date(row.saleDate);
                if (isNaN(saleDate.getTime())) {
                  errors.push({
                    row: rowNumber,
                    error: "Invalid date format",
                    data: row
                  });
                  continue;
                }

                // Check for duplicates
                const existing = await this.findDuplicateTransaction(
                  client.id,
                  inventoryItem.id,
                  saleDate
                );

                if (existing) {
                  duplicates.push({
                    row: rowNumber,
                    existing,
                    data: row
                  });
                } else {
                  valid.push({
                    ...row,
                    clientName: client.fullName,
                    itemName: inventoryItem.name
                  });
                }

              } catch (error) {
                errors.push({
                  row: rowNumber,
                  error: error instanceof Error ? error.message : 'Unknown error',
                  data: row
                });
              }
            }

            resolve({ valid, duplicates, errors });
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  async updateClientPurchaseStats(clientId: number): Promise<void> {
    const stats = await db
      .select({
        totalSpend: sql<number>`COALESCE(SUM(CASE WHEN ${salesTransactions.transactionType} = 'sale' THEN ${salesTransactions.sellingPrice} WHEN ${salesTransactions.transactionType} = 'credit' THEN -${salesTransactions.sellingPrice} ELSE 0 END), 0)`,
        totalPurchases: sql<number>`COUNT(CASE WHEN ${salesTransactions.transactionType} = 'sale' THEN 1 END)`,
        lastPurchaseDate: sql<Date>`MAX(CASE WHEN ${salesTransactions.transactionType} = 'sale' THEN ${salesTransactions.saleDate} END)`
      })
      .from(salesTransactions)
      .where(eq(salesTransactions.clientId, clientId));

    const { totalSpend, totalPurchases, lastPurchaseDate } = stats[0];

    // Determine VIP status based on spending
    let vipStatus: 'regular' | 'vip' | 'premium' = 'regular';
    if (totalSpend >= 10000) {
      vipStatus = 'premium';
    } else if (totalSpend >= 5000) {
      vipStatus = 'vip';
    }

    await db
      .update(clients)
      .set({
        totalSpend: totalSpend.toString(),
        totalPurchases,
        lastPurchaseDate,
        vipStatus,
        updatedAt: new Date()
      })
      .where(eq(clients.id, clientId));
  }

  async logTransactionStatusChange(
    transactionId: number,
    statusFrom: string,
    statusTo: string,
    reason: string,
    changedBy: string,
    notes?: string
  ): Promise<TransactionStatusLog> {
    const [log] = await db
      .insert(transactionStatusLog)
      .values({
        transactionId,
        statusFrom,
        statusTo,
        changeReason: reason,
        changedBy,
        notes
      })
      .returning();

    return log;
  }

  async getClientPurchaseHistory(
    clientId: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ transactions: SalesTransaction[]; total: number }> {
    const offset = (page - 1) * limit;

    const [transactions, totalResult] = await Promise.all([
      db
        .select({
          id: salesTransactions.id,
          clientId: salesTransactions.clientId,
          inventoryItemId: salesTransactions.inventoryItemId,
          transactionType: salesTransactions.transactionType,
          saleDate: salesTransactions.saleDate,
          retailPrice: salesTransactions.retailPrice,
          sellingPrice: salesTransactions.sellingPrice,
          profitMargin: salesTransactions.profitMargin,
          originalTransactionId: salesTransactions.originalTransactionId,
          csvBatchId: salesTransactions.csvBatchId,
          source: salesTransactions.source,
          notes: salesTransactions.notes,
          processedBy: salesTransactions.processedBy,
          createdAt: salesTransactions.createdAt,
          updatedAt: salesTransactions.updatedAt,
          itemName: inventoryItems.name,
          itemSerialNumber: inventoryItems.serialNumber,
        })
        .from(salesTransactions)
        .leftJoin(inventoryItems, eq(salesTransactions.inventoryItemId, inventoryItems.id))
        .where(eq(salesTransactions.clientId, clientId))
        .orderBy(desc(salesTransactions.saleDate))
        .limit(limit)
        .offset(offset),

      db
        .select({ count: sql<number>`count(*)` })
        .from(salesTransactions)
        .where(eq(salesTransactions.clientId, clientId))
    ]);

    return {
      transactions: transactions as SalesTransaction[],
      total: totalResult[0]?.count || 0,
    };
  }

  async getSalesAnalytics(dateRange?: string): Promise<{
    totalSales: number;
    totalRevenue: number;
    totalProfit: number;
    topClients: Array<{ client: Client; totalSpent: number; transactionCount: number }>;
    recentTransactions: SalesTransaction[];
  }> {
    let dateCondition = undefined;
    
    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      switch (dateRange) {
        case '7days':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(0);
      }
      dateCondition = gte(salesTransactions.saleDate, startDate);
    }

    // Get overall stats
    const [stats] = await db
      .select({
        totalSales: sql<number>`COUNT(CASE WHEN ${salesTransactions.transactionType} = 'sale' THEN 1 END)`,
        totalRevenue: sql<number>`COALESCE(SUM(CASE WHEN ${salesTransactions.transactionType} = 'sale' THEN ${salesTransactions.sellingPrice} WHEN ${salesTransactions.transactionType} = 'credit' THEN -${salesTransactions.sellingPrice} ELSE 0 END), 0)`,
        totalProfit: sql<number>`COALESCE(SUM(CASE WHEN ${salesTransactions.transactionType} = 'sale' THEN ${salesTransactions.profitMargin} WHEN ${salesTransactions.transactionType} = 'credit' THEN -${salesTransactions.profitMargin} ELSE 0 END), 0)`
      })
      .from(salesTransactions)
      .where(dateCondition);

    // Get top clients with a simpler query
    const topClientsQuery = `
      SELECT 
        c.*,
        COALESCE(SUM(CASE WHEN st.transaction_type = 'sale' THEN st.selling_price WHEN st.transaction_type = 'credit' THEN -st.selling_price ELSE 0 END), 0) as total_spent,
        COUNT(CASE WHEN st.transaction_type = 'sale' THEN 1 END) as transaction_count
      FROM sales_transactions st
      INNER JOIN clients c ON st.client_id = c.id
      ${dateCondition ? 'WHERE st.sale_date >= $1' : ''}
      GROUP BY c.id
      ORDER BY total_spent DESC
      LIMIT 5
    `;

    const topClientsData = dateCondition 
      ? await db.execute(sql.raw(topClientsQuery, [dateCondition]))
      : await db.execute(sql.raw(topClientsQuery.replace('WHERE st.sale_date >= $1', '')));

    // Get recent transactions
    const recentTransactions = await db
      .select()
      .from(salesTransactions)
      .where(dateCondition)
      .orderBy(desc(salesTransactions.createdAt))
      .limit(10);

    return {
      totalSales: stats.totalSales || 0,
      totalRevenue: stats.totalRevenue || 0,
      totalProfit: stats.totalProfit || 0,
      topClients: topClientsData.map(item => ({
        client: item.client,
        totalSpent: item.totalSpent,
        transactionCount: item.transactionCount
      })),
      recentTransactions: recentTransactions as SalesTransaction[],
    };
  }
}

export const storage = new DatabaseStorage();

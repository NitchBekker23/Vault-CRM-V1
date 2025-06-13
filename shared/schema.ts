import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  numeric,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  company: varchar("company"),
  phoneNumber: varchar("phone_number"),
  password: varchar("password"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["owner", "admin", "user"] }).default("user").notNull(),
  status: varchar("status", { enum: ["pending", "approved", "denied", "suspended"] }).default("pending").notNull(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  twoFactorMethod: varchar("two_factor_method", { enum: ["email", "sms"] }).default("email"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Account requests table
export const accountRequests = pgTable("account_requests", {
  id: serial("id").primaryKey(),
  email: varchar("email").notNull(),
  firstName: varchar("first_name").notNull(),
  lastName: varchar("last_name").notNull(),
  company: varchar("company").notNull(),
  phoneNumber: varchar("phone_number"),
  message: text("message"),
  status: varchar("status", { enum: ["pending", "approved", "denied"] }).default("pending").notNull(),
  requestedAt: timestamp("requested_at").defaultNow(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  denialReason: text("denial_reason"),
});

// Two-factor authentication codes
export const twoFactorCodes = pgTable("two_factor_codes", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  code: varchar("code", { length: 6 }).notNull(),
  method: varchar("method", { enum: ["email", "sms"] }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Account setup tokens for approved users
export const accountSetupTokens = pgTable("account_setup_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: varchar("email").notNull(),
  accountRequestId: integer("account_request_id").notNull().references(() => accountRequests.id),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  email: varchar("email").notNull(),
  used: boolean("used").default(false).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Images table for efficient storage and referencing
export const images = pgTable("images", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(), // base64 data or external URL
  filename: varchar("filename"),
  mimeType: varchar("mime_type"),
  size: integer("size"), // in bytes
  uploadedBy: varchar("uploaded_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

// New normalized brand management
export const brands = pgTable("brands", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const skus = pgTable("skus", {
  id: serial("id").primaryKey(),
  brandId: integer("brand_id").references(() => brands.id),
  model: varchar("model").notNull(),
  skuCode: varchar("sku_code").unique(),
  retailPrice: numeric("retail_price", { precision: 10, scale: 2 }),
  condition: varchar("condition").default("new"), // new, used, cpo
  createdAt: timestamp("created_at").defaultNow(),
});

// Inventory items table
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  brand: varchar("brand").notNull(),
  serialNumber: varchar("serial_number").unique().notNull(),
  sku: varchar("sku"),
  category: varchar("category").notNull(), // 'watches' or 'leather-goods'
  price: decimal("price", { precision: 10, scale: 2 }),
  status: varchar("status").default("in_stock").notNull(), // 'in_stock', 'reserved'
  imageUrls: text("image_urls").array(), // Keep for backward compatibility
  imageIds: integer("image_ids").array(), // New: reference to images table
  notes: text("notes"), // Internal notes for the item
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
  // New normalized fields (optional during transition)
  skuId: integer("sku_id").references(() => skus.id),
  location: varchar("location"), // e.g. Sandton, Cape Town
  condition: varchar("condition").default("new"), // new, used, cpo
});

// Junction table for many-to-many relationship between items and images
export const inventoryItemImages = pgTable("inventory_item_images", {
  id: serial("id").primaryKey(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  imageId: integer("image_id").references(() => images.id).notNull(),
  displayOrder: integer("display_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Wishlist/demand tracking table
export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  itemName: varchar("item_name").notNull(),
  brand: varchar("brand").notNull(),
  description: text("description"),
  category: varchar("category").notNull(),
  maxPrice: decimal("max_price", { precision: 10, scale: 2 }),
  status: varchar("status").default("active").notNull(), // 'active', 'fulfilled', 'cancelled'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Enhanced client profiles table
export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  fullName: varchar("full_name").notNull(),
  email: varchar("email").unique(),
  phoneNumber: varchar("phone_number"),
  location: varchar("location"),
  clientCategory: varchar("client_category").default("Regular"),
  totalSpend: numeric("total_spend", { precision: 12, scale: 2 }).default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  // Keep legacy fields for backward compatibility
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  phone: varchar("phone"),
  address: text("address"),
});

export const clientFiles = pgTable("client_files", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id),
  fileUrl: varchar("file_url").notNull(),
  fileType: varchar("file_type").notNull(), // ID, Proof of Address, Bank Statement, etc.
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});

export const clientCategories = pgTable("client_categories", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull().unique(),
});

// Sales tables
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  saleDate: timestamp("sale_date").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const saleItems = pgTable("sale_items", {
  id: serial("id").primaryKey(),
  saleId: integer("sale_id").references(() => sales.id).notNull(),
  inventoryItemId: integer("inventory_item_id").references(() => inventoryItems.id).notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Purchase history table
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").references(() => clients.id).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }).notNull(),
  purchaseDate: timestamp("purchase_date").defaultNow(),
  notes: text("notes"),
});

// Activity log table
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(), // 'added_item', 'sold_item', 'wishlist_request', etc.
  entityType: varchar("entity_type").notNull(), // 'inventory_item', 'wishlist_item', etc.
  entityId: integer("entity_id").notNull(),
  description: varchar("description").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  inventoryItems: many(inventoryItems),
  wishlistItems: many(wishlistItems),
  activities: many(activityLog),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ one, many }) => ({
  creator: one(users, {
    fields: [inventoryItems.createdBy],
    references: [users.id],
  }),
  purchases: many(purchases),
  images: many(inventoryItemImages),
}));

export const imagesRelations = relations(images, ({ one, many }) => ({
  uploader: one(users, {
    fields: [images.uploadedBy],
    references: [users.id],
  }),
  inventoryItems: many(inventoryItemImages),
}));

export const inventoryItemImagesRelations = relations(inventoryItemImages, ({ one }) => ({
  inventoryItem: one(inventoryItems, {
    fields: [inventoryItemImages.inventoryItemId],
    references: [inventoryItems.id],
  }),
  image: one(images, {
    fields: [inventoryItemImages.imageId],
    references: [images.id],
  }),
}));

export const wishlistItemsRelations = relations(wishlistItems, ({ one }) => ({
  user: one(users, {
    fields: [wishlistItems.userId],
    references: [users.id],
  }),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
  purchases: many(purchases),
}));

export const purchasesRelations = relations(purchases, ({ one }) => ({
  client: one(clients, {
    fields: [purchases.clientId],
    references: [clients.id],
  }),
  item: one(inventoryItems, {
    fields: [purchases.itemId],
    references: [inventoryItems.id],
  }),
}));

export const salesRelations = relations(sales, ({ one, many }) => ({
  client: one(clients, {
    fields: [sales.clientId],
    references: [clients.id],
  }),
  creator: one(users, {
    fields: [sales.createdBy],
    references: [users.id],
  }),
  saleItems: many(saleItems),
}));

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
  sale: one(sales, {
    fields: [saleItems.saleId],
    references: [sales.id],
  }),
  inventoryItem: one(inventoryItems, {
    fields: [saleItems.inventoryItemId],
    references: [inventoryItems.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

export const accountRequestsRelations = relations(accountRequests, ({ one }) => ({
  reviewer: one(users, {
    fields: [accountRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const twoFactorCodesRelations = relations(twoFactorCodes, ({ one }) => ({
  user: one(users, {
    fields: [twoFactorCodes.userId],
    references: [users.id],
  }),
}));

export const accountSetupTokensRelations = relations(accountSetupTokens, ({ one }) => ({
  accountRequest: one(accountRequests, {
    fields: [accountSetupTokens.accountRequestId],
    references: [accountRequests.id],
  }),
}));

// Schema types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export const insertInventoryItemSchema = createInsertSchema(inventoryItems, {
  skuId: z.number().optional(),
  location: z.string().optional(),
  condition: z.string().optional(),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  sku: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  price: z.string().optional(),
  imageUrls: z.array(z.string()).optional(),
});
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export const insertWishlistItemSchema = createInsertSchema(wishlistItems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  description: z.string().optional(),
  maxPrice: z.string().optional(),
});
export type InsertWishlistItem = z.infer<typeof insertWishlistItemSchema>;
export type WishlistItem = typeof wishlistItems.$inferSelect;

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const insertPurchaseSchema = createInsertSchema(purchases).omit({
  id: true,
  purchaseDate: true,
});
export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

export const insertSaleSchema = createInsertSchema(sales).omit({
  id: true,
  createdAt: true,
});
export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

export const insertSaleItemSchema = createInsertSchema(saleItems).omit({
  id: true,
  createdAt: true,
});
export type InsertSaleItem = z.infer<typeof insertSaleItemSchema>;
export type SaleItem = typeof saleItems.$inferSelect;

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

export const insertAccountRequestSchema = createInsertSchema(accountRequests).omit({
  id: true,
  status: true,
  requestedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  denialReason: true,
});
export type InsertAccountRequest = z.infer<typeof insertAccountRequestSchema>;
export type AccountRequest = typeof accountRequests.$inferSelect;

export const insertTwoFactorCodeSchema = createInsertSchema(twoFactorCodes).omit({
  id: true,
  createdAt: true,
});
export type InsertTwoFactorCode = z.infer<typeof insertTwoFactorCodeSchema>;
export type TwoFactorCode = typeof twoFactorCodes.$inferSelect;

export const insertAccountSetupTokenSchema = createInsertSchema(accountSetupTokens).omit({
  id: true,
  createdAt: true,
});
export type InsertAccountSetupToken = z.infer<typeof insertAccountSetupTokenSchema>;
export type AccountSetupToken = typeof accountSetupTokens.$inferSelect;

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

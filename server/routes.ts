import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import {
  insertInventoryItemSchema,
  insertWishlistItemSchema,
  insertClientSchema,
  insertPurchaseSchema,
} from "@shared/schema";
import { z } from "zod";

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Dashboard metrics
  app.get("/api/dashboard/metrics", isAuthenticated, async (req, res) => {
    try {
      const metrics = await storage.getDashboardMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching dashboard metrics:", error);
      res.status(500).json({ message: "Failed to fetch dashboard metrics" });
    }
  });

  // Recent activities
  app.get("/api/activities/recent", isAuthenticated, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const activities = await storage.getRecentActivities(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
      res.status(500).json({ message: "Failed to fetch recent activities" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", isAuthenticated, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const search = req.query.search as string;
      const category = req.query.category as string;
      const status = req.query.status as string;

      const result = await storage.getInventoryItems(page, limit, search, category, status);
      res.json(result);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInventoryItem(id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      console.error("Error fetching inventory item:", error);
      res.status(500).json({ message: "Failed to fetch inventory item" });
    }
  });

  app.post("/api/inventory", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertInventoryItemSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
      });

      const item = await storage.createInventoryItem(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.claims.sub,
        action: "added_item",
        entityType: "inventory_item",
        entityId: item.id,
        description: `Added ${item.name}`,
      });

      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating inventory item:", error);
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  app.put("/api/inventory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertInventoryItemSchema.partial().parse(req.body);

      const item = await storage.updateInventoryItem(id, validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.claims.sub,
        action: "updated_item",
        entityType: "inventory_item",
        entityId: item.id,
        description: `Updated ${item.name}`,
      });

      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating inventory item:", error);
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  app.delete("/api/inventory/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const item = await storage.getInventoryItem(id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      await storage.deleteInventoryItem(id);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.claims.sub,
        action: "deleted_item",
        entityType: "inventory_item",
        entityId: id,
        description: `Deleted ${item.name}`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting inventory item:", error);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // Bulk delete route
  app.post("/api/inventory/bulk-delete", isAuthenticated, async (req: any, res) => {
    try {
      const { ids } = req.body;
      
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid or empty IDs array" });
      }

      // Validate all IDs are numbers
      const validIds = ids.filter(id => Number.isInteger(id) && id > 0);
      if (validIds.length !== ids.length) {
        return res.status(400).json({ message: "All IDs must be positive integers" });
      }

      await storage.bulkDeleteInventoryItems(validIds);

      // Log activity for bulk delete
      await storage.createActivity({
        userId: req.user.claims.sub,
        action: "bulk_delete",
        entityType: "inventory_item",
        entityId: validIds[0], // Use first deleted item ID as reference
        description: `Bulk deleted ${validIds.length} inventory items`,
      });

      res.status(204).send();
    } catch (error) {
      console.error("Error bulk deleting inventory items:", error);
      res.status(500).json({ message: "Failed to delete items" });
    }
  });

  // Bulk import route
  app.post("/api/inventory/bulk-import", isAuthenticated, upload.single('file'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvData: any[] = [];
      const errors: Array<{
        row: number;
        field: string;
        message: string;
        value: any;
      }> = [];
      
      let processed = 0;
      let imported = 0;

      // Parse CSV data
      const stream = Readable.from(req.file.buffer);
      
      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => csvData.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      // Track serial numbers in this batch to prevent duplicates within the CSV
      const batchSerialNumbers = new Set<string>();

      // Validate and process each row
      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];
        const rowNumber = i + 2; // +2 because CSV row 1 is headers, and we want 1-based indexing
        processed++;

        try {
          // Validate required fields
          const requiredFields = ['name', 'brand', 'serialNumber', 'category', 'status', 'price'];
          for (const field of requiredFields) {
            if (!row[field] || row[field].trim() === '') {
              errors.push({
                row: rowNumber,
                field,
                message: `${field} is required`,
                value: row[field]
              });
            }
          }

          // Validate category
          const validCategories = ['watches', 'leather-goods', 'accessories'];
          if (row.category && !validCategories.includes(row.category)) {
            errors.push({
              row: rowNumber,
              field: 'category',
              message: `Category must be one of: ${validCategories.join(', ')}`,
              value: row.category
            });
          }

          // Validate status
          const validStatuses = ['in_stock', 'sold', 'out_of_stock'];
          if (row.status && !validStatuses.includes(row.status)) {
            errors.push({
              row: rowNumber,
              field: 'status',
              message: `Status must be one of: ${validStatuses.join(', ')}`,
              value: row.status
            });
          }

          // Validate price
          const price = parseFloat(row.price);
          if (isNaN(price) || price < 0) {
            errors.push({
              row: rowNumber,
              field: 'price',
              message: 'Price must be a valid positive number',
              value: row.price
            });
          }

          // Skip this row if there are validation errors
          const rowErrors = errors.filter(e => e.row === rowNumber);
          if (rowErrors.length > 0) {
            continue;
          }

          // Prepare data for insertion
          const itemData = {
            name: row.name.trim(),
            brand: row.brand.trim(),
            serialNumber: row.serialNumber.trim(),
            category: row.category,
            status: row.status,
            price: price.toString(),
            description: row.description?.trim() || null,
            imageUrls: row.imageUrls ? row.imageUrls.split(',').map((url: string) => url.trim()).filter(Boolean) : [],
            createdBy: req.user.claims.sub,
          };

          // Validate with Zod schema
          const validatedData = insertInventoryItemSchema.parse(itemData);

          // Check for duplicate serial number within this batch
          if (batchSerialNumbers.has(validatedData.serialNumber)) {
            errors.push({
              row: rowNumber,
              field: 'serialNumber',
              message: 'Serial number appears multiple times in this import',
              value: validatedData.serialNumber
            });
            continue;
          }

          // Check for duplicate serial number in database
          const existingItem = await storage.getInventoryItemBySerialNumber(validatedData.serialNumber);
          
          if (existingItem) {
            errors.push({
              row: rowNumber,
              field: 'serialNumber',
              message: 'Serial number already exists in database',
              value: validatedData.serialNumber
            });
            continue;
          }

          // Add to batch tracking
          batchSerialNumbers.add(validatedData.serialNumber);

          // Create the item
          await storage.createInventoryItem(validatedData);
          imported++;

        } catch (error: any) {
          if (error.issues) {
            // Zod validation errors
            for (const issue of error.issues) {
              errors.push({
                row: rowNumber,
                field: issue.path.join('.'),
                message: issue.message,
                value: issue.received
              });
            }
          } else {
            errors.push({
              row: rowNumber,
              field: 'general',
              message: error.message || 'Unknown error occurred',
              value: null
            });
          }
        }
      }

      // Log bulk import activity
      await storage.createActivity({
        userId: req.user.claims.sub,
        action: "bulk_import",
        entityType: "inventory_item",
        entityId: 0,
        description: `Bulk imported ${imported} items (${errors.length} errors)`,
      });

      const result = {
        success: errors.length === 0,
        processed,
        imported,
        errors
      };

      res.json(result);

    } catch (error) {
      console.error("Error processing bulk import:", error);
      res.status(500).json({ 
        message: "Failed to process bulk import",
        success: false,
        processed: 0,
        imported: 0,
        errors: [{
          row: 0,
          field: 'file',
          message: 'Failed to process CSV file. Please check file format.',
          value: null
        }]
      });
    }
  });

  // Wishlist routes
  app.get("/api/wishlist", isAuthenticated, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const userId = req.query.userId as string;

      const result = await storage.getWishlistItems(page, limit, userId);
      res.json(result);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  app.post("/api/wishlist", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertWishlistItemSchema.parse({
        ...req.body,
        userId: req.user.claims.sub,
      });

      const item = await storage.createWishlistItem(validatedData);
      
      // Log activity
      await storage.createActivity({
        userId: req.user.claims.sub,
        action: "wishlist_request",
        entityType: "wishlist_item",
        entityId: item.id,
        description: `New wishlist request for ${item.itemName}`,
      });

      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating wishlist item:", error);
      res.status(500).json({ message: "Failed to create wishlist item" });
    }
  });

  app.put("/api/wishlist/:id", isAuthenticated, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertWishlistItemSchema.partial().parse(req.body);

      const item = await storage.updateWishlistItem(id, validatedData);
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating wishlist item:", error);
      res.status(500).json({ message: "Failed to update wishlist item" });
    }
  });

  app.delete("/api/wishlist/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteWishlistItem(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting wishlist item:", error);
      res.status(500).json({ message: "Failed to delete wishlist item" });
    }
  });

  // Client routes
  app.get("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const result = await storage.getClients(page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      res.json(client);
    } catch (error) {
      console.error("Error fetching client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  app.put("/api/clients/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.partial().parse(req.body);

      const client = await storage.updateClient(id, validatedData);
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // Purchase routes
  app.get("/api/purchases", isAuthenticated, async (req, res) => {
    try {
      const clientId = req.query.clientId ? parseInt(req.query.clientId as string) : undefined;
      const purchases = await storage.getPurchases(clientId);
      res.json(purchases);
    } catch (error) {
      console.error("Error fetching purchases:", error);
      res.status(500).json({ message: "Failed to fetch purchases" });
    }
  });

  app.post("/api/purchases", isAuthenticated, async (req: any, res) => {
    try {
      const validatedData = insertPurchaseSchema.parse(req.body);
      const purchase = await storage.createPurchase(validatedData);
      
      // Update item status to sold
      await storage.updateInventoryItem(purchase.itemId, { status: "sold" });
      
      // Log activity
      const item = await storage.getInventoryItem(purchase.itemId);
      if (item) {
        await storage.createActivity({
          userId: req.user.claims.sub,
          action: "sold_item",
          entityType: "inventory_item",
          entityId: item.id,
          description: `Sold ${item.name}`,
        });
      }

      res.status(201).json(purchase);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Error creating purchase:", error);
      res.status(500).json({ message: "Failed to create purchase" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

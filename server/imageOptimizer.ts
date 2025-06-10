import crypto from 'crypto';
import { db } from './db';
import { images, inventoryItemImages, inventoryItems } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface ImageData {
  url: string;
  filename?: string;
  mimeType?: string;
  size?: number;
}

export class ImageOptimizer {
  
  // Generate hash for image deduplication
  private generateImageHash(imageData: string): string {
    return crypto.createHash('sha256').update(imageData).digest('hex');
  }

  // Store image with deduplication
  async storeImage(imageData: ImageData, uploadedBy: string): Promise<number> {
    const hash = this.generateImageHash(imageData.url);
    
    // Check if image already exists
    const existingImage = await db
      .select()
      .from(images)
      .where(eq(images.url, imageData.url))
      .limit(1);

    if (existingImage.length > 0) {
      console.log(`Image already exists, reusing ID: ${existingImage[0].id}`);
      return existingImage[0].id;
    }

    // Store new image
    const [newImage] = await db
      .insert(images)
      .values({
        url: imageData.url,
        filename: imageData.filename,
        mimeType: imageData.mimeType,
        size: imageData.size,
        uploadedBy,
      })
      .returning();

    console.log(`Stored new image with ID: ${newImage.id}`);
    return newImage.id;
  }

  // Link images to inventory item
  async linkImagesToItem(itemId: number, imageIds: number[]): Promise<void> {
    const links = imageIds.map((imageId, index) => ({
      inventoryItemId: itemId,
      imageId,
      displayOrder: index,
    }));

    await db.insert(inventoryItemImages).values(links);
  }

  // Get images for an item with backward compatibility
  async getItemImages(itemId: number): Promise<string[]> {
    // First check new system
    const imageLinks = await db
      .select({
        url: images.url,
        displayOrder: inventoryItemImages.displayOrder,
      })
      .from(inventoryItemImages)
      .innerJoin(images, eq(inventoryItemImages.imageId, images.id))
      .where(eq(inventoryItemImages.inventoryItemId, itemId))
      .orderBy(inventoryItemImages.displayOrder);

    if (imageLinks.length > 0) {
      return imageLinks.map(link => link.url);
    }

    // Fallback to legacy imageUrls field
    const [item] = await db
      .select({ imageUrls: inventoryItems.imageUrls })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId));

    return item?.imageUrls || [];
  }

  // Migrate existing items to new system
  async migrateExistingImages(itemId: number, userId: string): Promise<void> {
    const [item] = await db
      .select({ imageUrls: inventoryItems.imageUrls })
      .from(inventoryItems)
      .where(eq(inventoryItems.id, itemId));

    if (!item?.imageUrls || item.imageUrls.length === 0) {
      return;
    }

    const imageIds: number[] = [];
    
    for (const imageUrl of item.imageUrls) {
      const imageId = await this.storeImage({ url: imageUrl }, userId);
      imageIds.push(imageId);
    }

    await this.linkImagesToItem(itemId, imageIds);
    
    // Clear legacy field after migration
    await db
      .update(inventoryItems)
      .set({ imageIds })
      .where(eq(inventoryItems.id, itemId));

    console.log(`Migrated ${imageIds.length} images for item ${itemId}`);
  }

  // Inherit images from SKU efficiently
  async inheritSkuImages(newItemId: number, sku: string, userId: string): Promise<boolean> {
    // Find existing items with the same SKU that have images
    const existingItems = await db
      .select({
        id: inventoryItems.id,
        imageUrls: inventoryItems.imageUrls,
        imageIds: inventoryItems.imageIds,
      })
      .from(inventoryItems)
      .where(and(
        eq(inventoryItems.sku, sku),
        // Exclude the current item
        // Add condition for items with images
      ));

    for (const existingItem of existingItems) {
      if (existingItem.id === newItemId) continue;

      // Check new system first
      if (existingItem.imageIds && existingItem.imageIds.length > 0) {
        await this.linkImagesToItem(newItemId, existingItem.imageIds);
        console.log(`Inherited ${existingItem.imageIds.length} image references from item ${existingItem.id} (zero duplication)`);
        return true;
      }

      // Fallback to legacy system
      if (existingItem.imageUrls && existingItem.imageUrls.length > 0) {
        const imageIds: number[] = [];
        
        for (const imageUrl of existingItem.imageUrls) {
          const imageId = await this.storeImage({ url: imageUrl }, userId);
          imageIds.push(imageId);
        }

        await this.linkImagesToItem(newItemId, imageIds);
        
        // Update new item with image IDs
        await db
          .update(inventoryItems)
          .set({ imageIds })
          .where(eq(inventoryItems.id, newItemId));

        console.log(`Inherited and deduplicated ${imageIds.length} images from item ${existingItem.id}`);
        return true;
      }
    }

    return false;
  }

  // Calculate storage savings
  async getStorageStats(): Promise<{
    totalImages: number;
    uniqueImages: number;
    duplicatesSaved: number;
    storageEfficiency: number;
  }> {
    const [totalCount] = await db
      .select({ count: images.id })
      .from(inventoryItemImages);
    
    const [uniqueCount] = await db
      .select({ count: images.id })
      .from(images);

    const duplicatesSaved = (totalCount?.count || 0) - (uniqueCount?.count || 0);
    const efficiency = uniqueCount?.count ? 
      ((duplicatesSaved / (totalCount?.count || 1)) * 100) : 0;

    return {
      totalImages: totalCount?.count || 0,
      uniqueImages: uniqueCount?.count || 0,
      duplicatesSaved,
      storageEfficiency: efficiency,
    };
  }
}

export const imageOptimizer = new ImageOptimizer();
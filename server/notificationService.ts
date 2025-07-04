import { storage } from "./storage";
import { type InsertNotification } from "@shared/schema";

export class NotificationService {
  async createInventoryNotification(
    userId: string,
    itemName: string,
    itemId: number,
    action: 'added' | 'updated' | 'sold' | 'reserved' | 'deleted'
  ) {
    const notifications: Record<string, Partial<InsertNotification>> = {
      added: {
        type: 'inventory',
        title: 'New Item Added',
        message: `${itemName} has been added to inventory`,
        actionUrl: `/inventory`,
        actionLabel: 'View Inventory',
        priority: 'normal',
        entityType: 'inventory_item',
        entityId: itemId.toString(),
      },
      updated: {
        type: 'inventory',
        title: 'Item Updated',
        message: `${itemName} details have been updated`,
        actionUrl: `/inventory`,
        actionLabel: 'View Item',
        priority: 'low',
        entityType: 'inventory_item',
        entityId: itemId.toString(),
      },
      sold: {
        type: 'inventory',
        title: 'Item Sold',
        message: `${itemName} has been marked as sold`,
        actionUrl: `/inventory`,
        actionLabel: 'View Sales',
        priority: 'high',
        entityType: 'inventory_item',
        entityId: itemId.toString(),
      },
      reserved: {
        type: 'inventory',
        title: 'Item Reserved',
        message: `${itemName} has been reserved for a customer`,
        actionUrl: `/inventory`,
        actionLabel: 'View Item',
        priority: 'normal',
        entityType: 'inventory_item',
        entityId: itemId.toString(),
      },
      deleted: {
        type: 'inventory',
        title: 'Item Removed',
        message: `${itemName} has been removed from inventory`,
        actionUrl: `/inventory`,
        actionLabel: 'View Inventory',
        priority: 'normal',
        entityType: 'inventory_item',
        entityId: itemId.toString(),
      },
    };

    const notification = notifications[action];
    if (notification && notification.type) {
      await storage.createNotification({
        userId,
        ...notification,
      } as InsertNotification);
    }
  }

  async createBulkImportNotification(
    userId: string,
    importedCount: number,
    batchId?: string
  ) {
    await storage.createNotification({
      userId,
      type: 'system',
      title: 'Bulk Import Complete',
      message: `${importedCount} items were successfully imported to inventory`,
      actionUrl: '/inventory',
      actionLabel: 'View Inventory',
      priority: 'high',
      entityType: 'bulk_import',
      entityId: batchId || Date.now().toString(),
    });
  }

  async createWishlistNotification(
    userId: string,
    itemName: string,
    customerName?: string,
    wishlistId?: number
  ) {
    await storage.createNotification({
      userId,
      type: 'wishlist',
      title: 'New Wishlist Request',
      message: `${customerName ? customerName + ' has requested' : 'New request for'} ${itemName}`,
      actionUrl: '/wishlist',
      actionLabel: 'Review Request',
      priority: 'normal',
      entityType: 'wishlist_item',
      entityId: wishlistId?.toString(),
    });
  }

  async createUserApprovalNotification(
    adminUserId: string,
    requestorName: string,
    requestId: number
  ) {
    await storage.createNotification({
      userId: adminUserId,
      type: 'approval',
      title: 'Account Request Pending',
      message: `${requestorName} has requested access to the system`,
      actionUrl: '/admin/users',
      actionLabel: 'Review Request',
      priority: 'high',
      entityType: 'account_request',
      entityId: requestId.toString(),
    });
  }

  async createSystemNotification(
    userId: string,
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    actionUrl?: string,
    actionLabel?: string
  ) {
    await storage.createNotification({
      userId,
      type: 'system',
      title,
      message,
      actionUrl,
      actionLabel,
      priority,
      entityType: 'system',
      entityId: Date.now().toString(),
    });
  }

  async notifyAllAdmins(
    title: string,
    message: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    actionUrl?: string,
    actionLabel?: string
  ) {
    try {
      // Get all admin users
      const users = await storage.getAllUsers();
      const adminUsers = users.filter(user => 
        user.role === 'admin' || user.role === 'owner' || user.email === 'nitchbekker@gmail.com'
      );

      // Send notification to each admin
      for (const admin of adminUsers) {
        await this.createSystemNotification(
          admin.id,
          title,
          message,
          priority,
          actionUrl,
          actionLabel
        );
      }
    } catch (error) {
      console.error('Error notifying admins:', error);
    }
  }
}

export const notificationService = new NotificationService();
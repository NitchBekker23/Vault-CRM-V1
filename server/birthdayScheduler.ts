
import { storage } from "./storage";
import { notificationService } from "./notificationService";

export class BirthdayScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private lastChecked: string | null = null;

  start() {
    console.log('🎂 Birthday notification scheduler started');
    
    // Check immediately on startup
    this.checkBirthdays();
    
    // Then check every hour
    this.intervalId = setInterval(() => {
      this.checkBirthdays();
    }, 60 * 60 * 1000); // 1 hour
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🎂 Birthday notification scheduler stopped');
    }
  }

  private async checkBirthdays() {
    try {
      const today = new Date().toDateString();
      
      // Only check once per day
      if (this.lastChecked === today) {
        return;
      }

      console.log('🎂 Checking for client birthdays today...');
      
      const clientsWithBirthdays = await storage.getClientsWithBirthdayToday();
      
      if (clientsWithBirthdays.length > 0) {
        console.log(`🎉 Found ${clientsWithBirthdays.length} client(s) with birthdays today!`);
        
        for (const client of clientsWithBirthdays) {
          if (client.birthday) {
            await notificationService.createBirthdayNotification(
              client.fullName,
              client.id,
              new Date(client.birthday)
            );
          }
        }
      } else {
        console.log('📅 No client birthdays today');
      }
      
      this.lastChecked = today;
    } catch (error) {
      console.error('Error checking birthdays:', error);
    }
  }

  // Manual trigger for testing
  async triggerBirthdayCheck() {
    this.lastChecked = null; // Reset to force check
    await this.checkBirthdays();
  }
}

export const birthdayScheduler = new BirthdayScheduler();

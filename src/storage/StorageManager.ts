import {
  ActivityEvent,
  BrowsingHistory,
  SiteClassification,
  StreakData,
  UserSettings,
  TimeRange
} from '../types';

/**
 * Storage keys used in Chrome local storage
 */
const STORAGE_KEYS = {
  ACTIVITIES: 'dar_activities',
  HISTORY: 'dar_history',
  CLASSIFICATIONS: 'dar_classifications',
  SETTINGS: 'dar_settings',
  STREAK: 'dar_streak',
  USER_PROGRESS: 'dar_user_progress',
  ACHIEVEMENTS: 'dar_achievements'
} as const;

/**
 * Maximum number of days to keep browsing history
 */
const MAX_HISTORY_DAYS = 90;

/**
 * Time range for querying historical data
 */
export interface TimeRangeQuery {
  start: number;
  end: number;
}

/**
 * Exported data structure
 */
export interface ExportedData {
  version: string;
  exportDate: number;
  activities: ActivityEvent[];
  history: BrowsingHistory[];
  classifications: Record<string, SiteClassification>;
  settings: UserSettings;
  streak: StreakData;
}

/**
 * Default user settings
 */
const DEFAULT_SETTINGS: UserSettings = {
  interventionFrequency: 'moderate',
  quietHours: [],
  whitelistedSites: [],
  preferredChallenges: ['reflection', 'intention', 'quick-task', 'breathing'],
  learningMode: true,
  notificationsEnabled: true,
  streakGoal: 30
};

/**
 * Default streak data
 */
const DEFAULT_STREAK: StreakData = {
  current: 0,
  longest: 0,
  lastUpdate: Date.now(),
  multiplier: 1.0
};

/**
 * Storage Manager handles all data persistence using Chrome's local storage API
 */
export class StorageManager {
  /**
   * Save browsing activity event
   */
  async saveActivity(activity: ActivityEvent): Promise<void> {
    try {
      const activities = await this.getActivities();
      activities.push(activity);
      
      // Keep only recent activities (last 7 days)
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const recentActivities = activities.filter(a => a.timestamp >= sevenDaysAgo);
      
      await this.setStorageData(STORAGE_KEYS.ACTIVITIES, recentActivities);
    } catch (error) {
      console.error('Failed to save activity:', error);
      throw new Error('Storage operation failed');
    }
  }

  /**
   * Get all recent activities
   */
  async getActivities(): Promise<ActivityEvent[]> {
    try {
      const data = await this.getStorageData<ActivityEvent[]>(STORAGE_KEYS.ACTIVITIES);
      return data || [];
    } catch (error) {
      console.error('Failed to get activities:', error);
      return [];
    }
  }

  /**
   * Save browsing history entry
   */
  async saveHistory(entry: BrowsingHistory): Promise<void> {
    try {
      const history = await this.getHistory({ 
        start: 0, 
        end: Date.now() 
      });
      
      history.push(entry);
      
      // Prune old history
      const cutoffDate = Date.now() - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      const recentHistory = history.filter(h => h.startTime >= cutoffDate);
      
      await this.setStorageData(STORAGE_KEYS.HISTORY, recentHistory);
    } catch (error) {
      console.error('Failed to save history:', error);
      throw new Error('Storage operation failed');
    }
  }

  /**
   * Retrieve browsing history for a time range
   */
  async getHistory(timeRange: TimeRangeQuery): Promise<BrowsingHistory[]> {
    try {
      const allHistory = await this.getStorageData<BrowsingHistory[]>(STORAGE_KEYS.HISTORY);
      
      if (!allHistory) {
        return [];
      }
      
      return allHistory.filter(
        h => h.startTime >= timeRange.start && h.startTime <= timeRange.end
      );
    } catch (error) {
      console.error('Failed to get history:', error);
      return [];
    }
  }

  /**
   * Save site classification
   */
  async saveSiteClassification(url: string, classification: SiteClassification): Promise<void> {
    try {
      const classifications = await this.getAllClassifications();
      classifications[url] = classification;
      
      await this.setStorageData(STORAGE_KEYS.CLASSIFICATIONS, classifications);
    } catch (error) {
      console.error('Failed to save classification:', error);
      throw new Error('Storage operation failed');
    }
  }

  /**
   * Get site classification
   */
  async getSiteClassification(url: string): Promise<SiteClassification | null> {
    try {
      const classifications = await this.getAllClassifications();
      return classifications[url] || null;
    } catch (error) {
      console.error('Failed to get classification:', error);
      return null;
    }
  }

  /**
   * Get all site classifications
   */
  async getAllClassifications(): Promise<Record<string, SiteClassification>> {
    try {
      const data = await this.getStorageData<Record<string, SiteClassification>>(
        STORAGE_KEYS.CLASSIFICATIONS
      );
      return data || {};
    } catch (error) {
      console.error('Failed to get classifications:', error);
      return {};
    }
  }

  /**
   * Save user settings
   */
  async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await this.setStorageData(STORAGE_KEYS.SETTINGS, settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw new Error('Storage operation failed');
    }
  }

  /**
   * Get user settings
   */
  async getSettings(): Promise<UserSettings> {
    try {
      const settings = await this.getStorageData<UserSettings>(STORAGE_KEYS.SETTINGS);
      return settings || DEFAULT_SETTINGS;
    } catch (error) {
      console.error('Failed to get settings:', error);
      return DEFAULT_SETTINGS;
    }
  }

  /**
   * Save streak data
   */
  async saveStreak(streak: StreakData): Promise<void> {
    try {
      await this.setStorageData(STORAGE_KEYS.STREAK, streak);
    } catch (error) {
      console.error('Failed to save streak:', error);
      throw new Error('Storage operation failed');
    }
  }

  /**
   * Get current streak data
   */
  async getCurrentStreak(): Promise<StreakData> {
    try {
      const streak = await this.getStorageData<StreakData>(STORAGE_KEYS.STREAK);
      return streak || DEFAULT_STREAK;
    } catch (error) {
      console.error('Failed to get streak:', error);
      return DEFAULT_STREAK;
    }
  }

  /**
   * Export all user data
   */
  async exportData(): Promise<ExportedData> {
    try {
      const [activities, history, classifications, settings, streak] = await Promise.all([
        this.getActivities(),
        this.getHistory({ start: 0, end: Date.now() }),
        this.getAllClassifications(),
        this.getSettings(),
        this.getCurrentStreak()
      ]);

      return {
        version: '1.0.0',
        exportDate: Date.now(),
        activities,
        history,
        classifications,
        settings,
        streak
      };
    } catch (error) {
      console.error('Failed to export data:', error);
      throw new Error('Export failed');
    }
  }

  /**
   * Delete all stored data
   */
  async deleteAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      console.error('Failed to delete data:', error);
      throw new Error('Delete operation failed');
    }
  }

  /**
   * Check storage usage and available space
   */
  async getStorageInfo(): Promise<{ bytesInUse: number; quota: number }> {
    try {
      const bytesInUse = await chrome.storage.local.getBytesInUse();
      // Chrome local storage quota is typically 10MB
      const quota = 10 * 1024 * 1024;
      
      return { bytesInUse, quota };
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return { bytesInUse: 0, quota: 10 * 1024 * 1024 };
    }
  }

  /**
   * Prune old data to free up space
   */
  async pruneOldData(): Promise<void> {
    try {
      const cutoffDate = Date.now() - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);
      
      // Prune history
      const history = await this.getHistory({ start: 0, end: Date.now() });
      const recentHistory = history.filter(h => h.startTime >= cutoffDate);
      await this.setStorageData(STORAGE_KEYS.HISTORY, recentHistory);
      
      // Prune activities
      const activities = await this.getActivities();
      const recentActivities = activities.filter(a => a.timestamp >= cutoffDate);
      await this.setStorageData(STORAGE_KEYS.ACTIVITIES, recentActivities);
    } catch (error) {
      console.error('Failed to prune data:', error);
      throw new Error('Prune operation failed');
    }
  }

  /**
   * Generic method to get data from Chrome storage
   */
  private async getStorageData<T>(key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(result[key] || null);
        }
      });
    });
  }

  /**
   * Generic method to set data in Chrome storage
   */
  private async setStorageData<T>(key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}

// Export singleton instance
export const storageManager = new StorageManager();

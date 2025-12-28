import { StorageManager } from './StorageManager';
import {
  ActivityEvent,
  BrowsingHistory,
  SiteClassification,
  UserSettings,
  StreakData
} from '../types';

describe('StorageManager', () => {
  let storageManager: StorageManager;
  let mockStorage: { [key: string]: any };

  beforeEach(() => {
    storageManager = new StorageManager();
    mockStorage = {};

    // Mock Chrome storage API
    (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
      const result: { [key: string]: any } = {};
      if (Array.isArray(keys)) {
        keys.forEach(key => {
          if (mockStorage[key] !== undefined) {
            result[key] = mockStorage[key];
          }
        });
      }
      callback(result);
    });

    (chrome.storage.local.set as jest.Mock).mockImplementation((items, callback) => {
      Object.assign(mockStorage, items);
      if (callback) callback();
    });

    (chrome.storage.local.clear as jest.Mock).mockImplementation((callback) => {
      mockStorage = {};
      if (callback) callback();
    });

    (chrome.storage.local.getBytesInUse as jest.Mock).mockResolvedValue(1024);
  });

  describe('Activity Management', () => {
    it('should save and retrieve activities', async () => {
      const activity: ActivityEvent = {
        url: 'https://example.com',
        timestamp: Date.now(),
        eventType: 'navigation',
        context: {
          url: 'https://example.com',
          title: 'Example',
          timestamp: Date.now(),
          timeOfDay: 14,
          dayOfWeek: 3,
          recentHistory: [],
          sessionDuration: 0,
          lastProductiveActivity: 0
        }
      };

      await storageManager.saveActivity(activity);
      const activities = await storageManager.getActivities();

      expect(activities).toHaveLength(1);
      expect(activities[0].url).toBe('https://example.com');
    });

    it('should prune activities older than 7 days', async () => {
      const oldActivity: ActivityEvent = {
        url: 'https://old.com',
        timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000), // 8 days ago
        eventType: 'navigation',
        context: {
          url: 'https://old.com',
          title: 'Old',
          timestamp: Date.now() - (8 * 24 * 60 * 60 * 1000),
          timeOfDay: 10,
          dayOfWeek: 1,
          recentHistory: [],
          sessionDuration: 0,
          lastProductiveActivity: 0
        }
      };

      const recentActivity: ActivityEvent = {
        url: 'https://recent.com',
        timestamp: Date.now(),
        eventType: 'navigation',
        context: {
          url: 'https://recent.com',
          title: 'Recent',
          timestamp: Date.now(),
          timeOfDay: 14,
          dayOfWeek: 3,
          recentHistory: [],
          sessionDuration: 0,
          lastProductiveActivity: 0
        }
      };

      await storageManager.saveActivity(oldActivity);
      await storageManager.saveActivity(recentActivity);

      const activities = await storageManager.getActivities();
      expect(activities).toHaveLength(1);
      expect(activities[0].url).toBe('https://recent.com');
    });
  });

  describe('History Management', () => {
    it('should save and retrieve browsing history', async () => {
      const historyEntry: BrowsingHistory = {
        id: '1',
        url: 'https://example.com',
        title: 'Example',
        startTime: Date.now(),
        endTime: Date.now() + 60000,
        duration: 60,
        classification: {
          url: 'https://example.com',
          category: 'productive',
          confidence: 0.9,
          source: 'user',
          lastUpdated: Date.now()
        },
        wasProductive: true,
        interventionTriggered: false,
        interventionCompleted: false
      };

      await storageManager.saveHistory(historyEntry);
      const history = await storageManager.getHistory({
        start: 0,
        end: Date.now() + 100000
      });

      expect(history).toHaveLength(1);
      expect(history[0].url).toBe('https://example.com');
    });

    it('should prune history older than 90 days', async () => {
      const oldEntry: BrowsingHistory = {
        id: '1',
        url: 'https://old.com',
        title: 'Old',
        startTime: Date.now() - (91 * 24 * 60 * 60 * 1000),
        endTime: Date.now() - (91 * 24 * 60 * 60 * 1000) + 60000,
        duration: 60,
        classification: {
          url: 'https://old.com',
          category: 'neutral',
          confidence: 0.5,
          source: 'ai',
          lastUpdated: Date.now()
        },
        wasProductive: false,
        interventionTriggered: false,
        interventionCompleted: false
      };

      const recentEntry: BrowsingHistory = {
        id: '2',
        url: 'https://recent.com',
        title: 'Recent',
        startTime: Date.now(),
        endTime: Date.now() + 60000,
        duration: 60,
        classification: {
          url: 'https://recent.com',
          category: 'productive',
          confidence: 0.9,
          source: 'user',
          lastUpdated: Date.now()
        },
        wasProductive: true,
        interventionTriggered: false,
        interventionCompleted: false
      };

      await storageManager.saveHistory(oldEntry);
      await storageManager.saveHistory(recentEntry);

      const history = await storageManager.getHistory({
        start: 0,
        end: Date.now() + 100000
      });

      expect(history).toHaveLength(1);
      expect(history[0].url).toBe('https://recent.com');
    });

    it('should filter history by time range', async () => {
      const now = Date.now();
      const yesterday = now - (24 * 60 * 60 * 1000);
      const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000);

      const entries: BrowsingHistory[] = [
        {
          id: '1',
          url: 'https://two-days-ago.com',
          title: 'Two Days Ago',
          startTime: twoDaysAgo,
          endTime: twoDaysAgo + 60000,
          duration: 60,
          classification: {
            url: 'https://two-days-ago.com',
            category: 'neutral',
            confidence: 0.5,
            source: 'ai',
            lastUpdated: now
          },
          wasProductive: false,
          interventionTriggered: false,
          interventionCompleted: false
        },
        {
          id: '2',
          url: 'https://yesterday.com',
          title: 'Yesterday',
          startTime: yesterday,
          endTime: yesterday + 60000,
          duration: 60,
          classification: {
            url: 'https://yesterday.com',
            category: 'productive',
            confidence: 0.9,
            source: 'user',
            lastUpdated: now
          },
          wasProductive: true,
          interventionTriggered: false,
          interventionCompleted: false
        }
      ];

      for (const entry of entries) {
        await storageManager.saveHistory(entry);
      }

      const recentHistory = await storageManager.getHistory({
        start: yesterday - 1000,
        end: now
      });

      expect(recentHistory).toHaveLength(1);
      expect(recentHistory[0].url).toBe('https://yesterday.com');
    });
  });

  describe('Site Classification', () => {
    it('should save and retrieve site classifications', async () => {
      const classification: SiteClassification = {
        url: 'https://example.com',
        category: 'productive',
        confidence: 0.95,
        source: 'user',
        lastUpdated: Date.now()
      };

      await storageManager.saveSiteClassification('https://example.com', classification);
      const retrieved = await storageManager.getSiteClassification('https://example.com');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.category).toBe('productive');
      expect(retrieved?.source).toBe('user');
    });

    it('should return null for unclassified sites', async () => {
      const classification = await storageManager.getSiteClassification('https://unknown.com');
      expect(classification).toBeNull();
    });

    it('should handle custom categories', async () => {
      const classification: SiteClassification = {
        url: 'https://custom.com',
        category: 'custom',
        confidence: 1.0,
        source: 'user',
        customLabel: 'Research',
        lastUpdated: Date.now()
      };

      await storageManager.saveSiteClassification('https://custom.com', classification);
      const retrieved = await storageManager.getSiteClassification('https://custom.com');

      expect(retrieved?.category).toBe('custom');
      expect(retrieved?.customLabel).toBe('Research');
    });
  });

  describe('Settings Management', () => {
    it('should save and retrieve user settings', async () => {
      const settings: UserSettings = {
        interventionFrequency: 'aggressive',
        quietHours: [{ start: 22, end: 8 }],
        whitelistedSites: ['https://work.com'],
        preferredChallenges: ['reflection', 'breathing'],
        learningMode: false,
        notificationsEnabled: true,
        streakGoal: 50
      };

      await storageManager.saveSettings(settings);
      const retrieved = await storageManager.getSettings();

      expect(retrieved.interventionFrequency).toBe('aggressive');
      expect(retrieved.quietHours).toHaveLength(1);
      expect(retrieved.streakGoal).toBe(50);
    });

    it('should return default settings when none exist', async () => {
      const settings = await storageManager.getSettings();

      expect(settings.interventionFrequency).toBe('moderate');
      expect(settings.learningMode).toBe(true);
      expect(settings.streakGoal).toBe(30);
    });
  });

  describe('Streak Management', () => {
    it('should save and retrieve streak data', async () => {
      const streak: StreakData = {
        current: 15,
        longest: 25,
        lastUpdate: Date.now(),
        multiplier: 1.5
      };

      await storageManager.saveStreak(streak);
      const retrieved = await storageManager.getCurrentStreak();

      expect(retrieved.current).toBe(15);
      expect(retrieved.longest).toBe(25);
      expect(retrieved.multiplier).toBe(1.5);
    });

    it('should return default streak when none exists', async () => {
      const streak = await storageManager.getCurrentStreak();

      expect(streak.current).toBe(0);
      expect(streak.longest).toBe(0);
      expect(streak.multiplier).toBe(1.0);
    });
  });

  describe('Data Export and Import', () => {
    it('should export all user data', async () => {
      // Set up some data
      const activity: ActivityEvent = {
        url: 'https://example.com',
        timestamp: Date.now(),
        eventType: 'navigation',
        context: {
          url: 'https://example.com',
          title: 'Example',
          timestamp: Date.now(),
          timeOfDay: 14,
          dayOfWeek: 3,
          recentHistory: [],
          sessionDuration: 0,
          lastProductiveActivity: 0
        }
      };

      await storageManager.saveActivity(activity);

      const exported = await storageManager.exportData();

      expect(exported.version).toBe('1.0.0');
      expect(exported.activities).toHaveLength(1);
      expect(exported.exportDate).toBeLessThanOrEqual(Date.now());
    });
  });

  describe('Data Deletion', () => {
    it('should delete all stored data', async () => {
      // Add some data
      const activity: ActivityEvent = {
        url: 'https://example.com',
        timestamp: Date.now(),
        eventType: 'navigation',
        context: {
          url: 'https://example.com',
          title: 'Example',
          timestamp: Date.now(),
          timeOfDay: 14,
          dayOfWeek: 3,
          recentHistory: [],
          sessionDuration: 0,
          lastProductiveActivity: 0
        }
      };

      await storageManager.saveActivity(activity);

      // Delete all data
      await storageManager.deleteAllData();

      // Verify data is gone
      expect(chrome.storage.local.clear).toHaveBeenCalled();
    });
  });

  describe('Storage Quota Management', () => {
    it('should get storage info', async () => {
      const info = await storageManager.getStorageInfo();

      expect(info.bytesInUse).toBeGreaterThanOrEqual(0);
      expect(info.quota).toBe(10 * 1024 * 1024); // 10MB
    });

    it('should prune old data when requested', async () => {
      const oldActivity: ActivityEvent = {
        url: 'https://old.com',
        timestamp: Date.now() - (100 * 24 * 60 * 60 * 1000), // 100 days ago
        eventType: 'navigation',
        context: {
          url: 'https://old.com',
          title: 'Old',
          timestamp: Date.now() - (100 * 24 * 60 * 60 * 1000),
          timeOfDay: 10,
          dayOfWeek: 1,
          recentHistory: [],
          sessionDuration: 0,
          lastProductiveActivity: 0
        }
      };

      await storageManager.saveActivity(oldActivity);
      await storageManager.pruneOldData();

      const activities = await storageManager.getActivities();
      expect(activities).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      (chrome.storage.local.get as jest.Mock).mockImplementation((keys, callback) => {
        chrome.runtime.lastError = { message: 'Storage error' };
        callback({});
      });

      const activities = await storageManager.getActivities();
      expect(activities).toEqual([]);

      delete chrome.runtime.lastError;
    });

    it('should throw error when save fails', async () => {
      (chrome.storage.local.set as jest.Mock).mockImplementation((items, callback) => {
        chrome.runtime.lastError = { message: 'Storage quota exceeded' };
        callback();
      });

      const activity: ActivityEvent = {
        url: 'https://example.com',
        timestamp: Date.now(),
        eventType: 'navigation',
        context: {
          url: 'https://example.com',
          title: 'Example',
          timestamp: Date.now(),
          timeOfDay: 14,
          dayOfWeek: 3,
          recentHistory: [],
          sessionDuration: 0,
          lastProductiveActivity: 0
        }
      };

      await expect(storageManager.saveActivity(activity)).rejects.toThrow('Storage operation failed');

      delete chrome.runtime.lastError;
    });
  });
});

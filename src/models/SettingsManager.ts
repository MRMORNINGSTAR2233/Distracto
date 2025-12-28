import { UserSettings, TimeRange, ChallengeType } from '../types';
import { storageManager } from '../storage/StorageManager';

/**
 * Settings Manager provides high-level settings management
 */
export class SettingsManager {
  private settings: UserSettings | null = null;
  private listeners: Array<(settings: UserSettings) => void> = [];

  constructor() {
    this.initialize();
  }

  /**
   * Initialize settings manager
   */
  private async initialize(): Promise<void> {
    this.settings = await storageManager.getSettings();
  }

  /**
   * Get current settings
   */
  public async getSettings(): Promise<UserSettings> {
    if (!this.settings) {
      await this.initialize();
    }
    return { ...this.settings! };
  }

  /**
   * Update settings
   */
  public async updateSettings(updates: Partial<UserSettings>): Promise<UserSettings> {
    if (!this.settings) {
      await this.initialize();
    }

    // Merge updates with current settings
    this.settings = {
      ...this.settings!,
      ...updates
    };

    // Save to storage
    await storageManager.saveSettings(this.settings);

    // Notify listeners
    this.notifyListeners();

    console.log('Settings updated:', updates);
    return { ...this.settings };
  }

  /**
   * Set intervention frequency
   */
  public async setInterventionFrequency(frequency: 'aggressive' | 'moderate' | 'minimal'): Promise<void> {
    await this.updateSettings({ interventionFrequency: frequency });
  }

  /**
   * Add quiet hours
   */
  public async addQuietHours(timeRange: TimeRange): Promise<void> {
    const settings = await this.getSettings();
    
    // Validate time range
    if (timeRange.start < 0 || timeRange.start > 23 || timeRange.end < 0 || timeRange.end > 23) {
      throw new Error('Invalid time range: hours must be between 0 and 23');
    }

    // Check for overlaps
    const hasOverlap = settings.quietHours.some(existing => 
      this.timeRangesOverlap(existing, timeRange)
    );

    if (hasOverlap) {
      throw new Error('Quiet hours overlap with existing range');
    }

    const quietHours = [...settings.quietHours, timeRange];
    await this.updateSettings({ quietHours });
  }

  /**
   * Remove quiet hours
   */
  public async removeQuietHours(index: number): Promise<void> {
    const settings = await this.getSettings();
    
    if (index < 0 || index >= settings.quietHours.length) {
      throw new Error('Invalid quiet hours index');
    }

    const quietHours = settings.quietHours.filter((_, i) => i !== index);
    await this.updateSettings({ quietHours });
  }

  /**
   * Clear all quiet hours
   */
  public async clearQuietHours(): Promise<void> {
    await this.updateSettings({ quietHours: [] });
  }

  /**
   * Add site to whitelist
   */
  public async addToWhitelist(url: string): Promise<void> {
    const settings = await this.getSettings();
    
    // Normalize URL (extract domain)
    const domain = this.extractDomain(url);
    
    if (!domain) {
      throw new Error('Invalid URL');
    }

    // Check if already whitelisted
    if (settings.whitelistedSites.includes(domain)) {
      console.log(`${domain} is already whitelisted`);
      return;
    }

    const whitelistedSites = [...settings.whitelistedSites, domain];
    await this.updateSettings({ whitelistedSites });
    console.log(`Added ${domain} to whitelist`);
  }

  /**
   * Remove site from whitelist
   */
  public async removeFromWhitelist(domain: string): Promise<void> {
    const settings = await this.getSettings();
    const whitelistedSites = settings.whitelistedSites.filter(site => site !== domain);
    await this.updateSettings({ whitelistedSites });
    console.log(`Removed ${domain} from whitelist`);
  }

  /**
   * Clear whitelist
   */
  public async clearWhitelist(): Promise<void> {
    await this.updateSettings({ whitelistedSites: [] });
  }

  /**
   * Check if URL is whitelisted
   */
  public async isWhitelisted(url: string): Promise<boolean> {
    const settings = await this.getSettings();
    const domain = this.extractDomain(url);
    
    if (!domain) return false;

    return settings.whitelistedSites.some(whitelisted => 
      domain.includes(whitelisted) || whitelisted.includes(domain)
    );
  }

  /**
   * Set preferred challenges
   */
  public async setPreferredChallenges(challenges: ChallengeType[]): Promise<void> {
    if (challenges.length === 0) {
      throw new Error('At least one challenge type must be preferred');
    }

    await this.updateSettings({ preferredChallenges: challenges });
  }

  /**
   * Add preferred challenge
   */
  public async addPreferredChallenge(challenge: ChallengeType): Promise<void> {
    const settings = await this.getSettings();
    
    if (settings.preferredChallenges.includes(challenge)) {
      return;
    }

    const preferredChallenges = [...settings.preferredChallenges, challenge];
    await this.updateSettings({ preferredChallenges });
  }

  /**
   * Remove preferred challenge
   */
  public async removePreferredChallenge(challenge: ChallengeType): Promise<void> {
    const settings = await this.getSettings();
    
    // Must have at least one preferred challenge
    if (settings.preferredChallenges.length <= 1) {
      throw new Error('Cannot remove last preferred challenge type');
    }

    const preferredChallenges = settings.preferredChallenges.filter(c => c !== challenge);
    await this.updateSettings({ preferredChallenges });
  }

  /**
   * Set learning mode
   */
  public async setLearningMode(enabled: boolean): Promise<void> {
    await this.updateSettings({ learningMode: enabled });
  }

  /**
   * Set notifications enabled
   */
  public async setNotificationsEnabled(enabled: boolean): Promise<void> {
    await this.updateSettings({ notificationsEnabled: enabled });
  }

  /**
   * Set streak goal
   */
  public async setStreakGoal(goal: number): Promise<void> {
    if (goal < 0) {
      throw new Error('Streak goal must be positive');
    }

    await this.updateSettings({ streakGoal: goal });
  }

  /**
   * Check if currently in quiet hours
   */
  public async isInQuietHours(): Promise<boolean> {
    const settings = await this.getSettings();
    const now = new Date();
    const currentHour = now.getHours();

    return settings.quietHours.some(range => 
      this.isHourInRange(currentHour, range)
    );
  }

  /**
   * Add settings change listener
   */
  public addListener(listener: (settings: UserSettings) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove settings change listener
   */
  public removeListener(listener: (settings: UserSettings) => void): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * Notify all listeners of settings change
   */
  private notifyListeners(): void {
    if (!this.settings) return;

    for (const listener of this.listeners) {
      try {
        listener({ ...this.settings });
      } catch (error) {
        console.error('Error in settings listener:', error);
      }
    }
  }

  /**
   * Check if two time ranges overlap
   */
  private timeRangesOverlap(range1: TimeRange, range2: TimeRange): boolean {
    // Handle ranges that cross midnight
    const normalize = (range: TimeRange) => {
      if (range.end < range.start) {
        // Range crosses midnight
        return [
          { start: range.start, end: 23 },
          { start: 0, end: range.end }
        ];
      }
      return [range];
    };

    const ranges1 = normalize(range1);
    const ranges2 = normalize(range2);

    for (const r1 of ranges1) {
      for (const r2 of ranges2) {
        if (r1.start <= r2.end && r2.start <= r1.end) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Check if hour is in time range
   */
  private isHourInRange(hour: number, range: TimeRange): boolean {
    if (range.end >= range.start) {
      // Normal range (e.g., 9-17)
      return hour >= range.start && hour <= range.end;
    } else {
      // Range crosses midnight (e.g., 22-6)
      return hour >= range.start || hour <= range.end;
    }
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string | null {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname;
    } catch {
      return null;
    }
  }

  /**
   * Reset to default settings
   */
  public async resetToDefaults(): Promise<UserSettings> {
    const defaultSettings: UserSettings = {
      interventionFrequency: 'moderate',
      quietHours: [],
      whitelistedSites: [],
      preferredChallenges: ['reflection', 'intention', 'quick-task', 'breathing'],
      learningMode: true,
      notificationsEnabled: true,
      streakGoal: 25
    };

    this.settings = defaultSettings;
    await storageManager.saveSettings(defaultSettings);
    this.notifyListeners();

    console.log('Settings reset to defaults');
    return { ...defaultSettings };
  }
}

// Export singleton instance
export const settingsManager = new SettingsManager();

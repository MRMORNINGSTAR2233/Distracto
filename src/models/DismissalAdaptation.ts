import { BrowsingContext, UserSettings } from '../types';
import { settingsManager } from './SettingsManager';
import { distractionPredictor } from './DistractionPredictor';
import { challengeGenerator } from './ChallengeGenerator';

/**
 * Dismissal record for tracking user behavior
 */
interface DismissalRecord {
  url: string;
  timestamp: number;
  consecutiveCount: number;
  context: BrowsingContext;
}

/**
 * Adaptation strategy based on dismissal patterns
 */
interface AdaptationStrategy {
  interventionFrequency: 'aggressive' | 'moderate' | 'minimal';
  cooldownMultiplier: number;
  challengeDifficultyAdjustment: number;
  shouldSuggestSettings: boolean;
}

/**
 * Dismissal Adaptation manages how the system responds to repeated dismissals
 */
export class DismissalAdaptation {
  private dismissalHistory: DismissalRecord[] = [];
  private maxHistorySize: number = 50;
  private adaptationThresholds = {
    low: 3,      // 3 dismissals = minor adaptation
    medium: 5,   // 5 dismissals = moderate adaptation
    high: 10     // 10 dismissals = major adaptation
  };

  /**
   * Record a dismissal event
   */
  public recordDismissal(url: string, context: BrowsingContext): void {
    const now = Date.now();
    
    // Find existing record for this URL
    const existingIndex = this.dismissalHistory.findIndex(r => r.url === url);
    
    if (existingIndex >= 0) {
      // Update existing record
      const existing = this.dismissalHistory[existingIndex];
      existing.consecutiveCount++;
      existing.timestamp = now;
      existing.context = context;
    } else {
      // Create new record
      this.dismissalHistory.push({
        url,
        timestamp: now,
        consecutiveCount: 1,
        context
      });
    }

    // Trim history if needed
    if (this.dismissalHistory.length > this.maxHistorySize) {
      this.dismissalHistory.shift();
    }

    // Apply adaptation
    this.applyAdaptation(url);
  }

  /**
   * Record a completion event (resets dismissal count)
   */
  public recordCompletion(url: string): void {
    const index = this.dismissalHistory.findIndex(r => r.url === url);
    if (index >= 0) {
      this.dismissalHistory.splice(index, 1);
    }
  }

  /**
   * Apply adaptation based on dismissal patterns
   */
  private async applyAdaptation(url: string): Promise<void> {
    const record = this.dismissalHistory.find(r => r.url === url);
    if (!record) return;

    const count = record.consecutiveCount;
    const strategy = this.determineStrategy(count);

    // Apply strategy
    await this.executeStrategy(strategy, url);

    console.log(`Adaptation applied for ${url}: ${count} dismissals, strategy:`, strategy);
  }

  /**
   * Determine adaptation strategy based on dismissal count
   */
  private determineStrategy(dismissalCount: number): AdaptationStrategy {
    if (dismissalCount >= this.adaptationThresholds.high) {
      // High dismissals: back off significantly
      return {
        interventionFrequency: 'minimal',
        cooldownMultiplier: 3.0,
        challengeDifficultyAdjustment: -2,
        shouldSuggestSettings: true
      };
    } else if (dismissalCount >= this.adaptationThresholds.medium) {
      // Medium dismissals: moderate adaptation
      return {
        interventionFrequency: 'moderate',
        cooldownMultiplier: 2.0,
        challengeDifficultyAdjustment: -1,
        shouldSuggestSettings: true
      };
    } else if (dismissalCount >= this.adaptationThresholds.low) {
      // Low dismissals: minor adaptation
      return {
        interventionFrequency: 'moderate',
        cooldownMultiplier: 1.5,
        challengeDifficultyAdjustment: 0,
        shouldSuggestSettings: false
      };
    }

    // No adaptation needed
    return {
      interventionFrequency: 'moderate',
      cooldownMultiplier: 1.0,
      challengeDifficultyAdjustment: 0,
      shouldSuggestSettings: false
    };
  }

  /**
   * Execute adaptation strategy
   */
  private async executeStrategy(strategy: AdaptationStrategy, url: string): Promise<void> {
    // Adjust challenge difficulty
    if (strategy.challengeDifficultyAdjustment !== 0) {
      for (let i = 0; i < Math.abs(strategy.challengeDifficultyAdjustment); i++) {
        challengeGenerator.adjustDifficulty(strategy.challengeDifficultyAdjustment > 0);
      }
    }

    // Update settings if needed
    if (strategy.shouldSuggestSettings) {
      const settings = await settingsManager.getSettings();
      
      // Only update if current frequency is more aggressive
      const frequencyOrder = { aggressive: 3, moderate: 2, minimal: 1 };
      if (frequencyOrder[settings.interventionFrequency] > frequencyOrder[strategy.interventionFrequency]) {
        await settingsManager.setInterventionFrequency(strategy.interventionFrequency);
        console.log(`Updated intervention frequency to ${strategy.interventionFrequency}`);
      }
    }
  }

  /**
   * Get dismissal count for a URL
   */
  public getDismissalCount(url: string): number {
    const record = this.dismissalHistory.find(r => r.url === url);
    return record ? record.consecutiveCount : 0;
  }

  /**
   * Get total dismissals in time period
   */
  public getTotalDismissals(timeRangeMs: number = 24 * 60 * 60 * 1000): number {
    const cutoff = Date.now() - timeRangeMs;
    return this.dismissalHistory.filter(r => r.timestamp >= cutoff).length;
  }

  /**
   * Get dismissal rate (dismissals per hour)
   */
  public getDismissalRate(timeRangeMs: number = 24 * 60 * 60 * 1000): number {
    const dismissals = this.getTotalDismissals(timeRangeMs);
    const hours = timeRangeMs / (60 * 60 * 1000);
    return dismissals / hours;
  }

  /**
   * Check if user is dismissing too frequently
   */
  public isHighDismissalRate(): boolean {
    const rate = this.getDismissalRate(60 * 60 * 1000); // Last hour
    return rate > 3; // More than 3 dismissals per hour
  }

  /**
   * Get most dismissed URLs
   */
  public getMostDismissedUrls(limit: number = 5): Array<{ url: string; count: number }> {
    return this.dismissalHistory
      .sort((a, b) => b.consecutiveCount - a.consecutiveCount)
      .slice(0, limit)
      .map(r => ({ url: r.url, count: r.consecutiveCount }));
  }

  /**
   * Suggest whitelist additions based on dismissal patterns
   */
  public async suggestWhitelistAdditions(): Promise<string[]> {
    const suggestions: string[] = [];
    const settings = await settingsManager.getSettings();

    // Find URLs with high dismissal counts that aren't whitelisted
    for (const record of this.dismissalHistory) {
      if (record.consecutiveCount >= this.adaptationThresholds.medium) {
        const isWhitelisted = settings.whitelistedSites.some(pattern => 
          record.url.includes(pattern)
        );

        if (!isWhitelisted && !suggestions.includes(record.url)) {
          suggestions.push(record.url);
        }
      }
    }

    return suggestions.slice(0, 5); // Top 5 suggestions
  }

  /**
   * Get adaptation statistics
   */
  public getStatistics(): {
    totalDismissals: number;
    uniqueUrls: number;
    averageDismissalsPerUrl: number;
    highDismissalUrls: number;
    dismissalRate: number;
  } {
    const uniqueUrls = new Set(this.dismissalHistory.map(r => r.url)).size;
    const totalDismissals = this.dismissalHistory.reduce((sum, r) => sum + r.consecutiveCount, 0);
    const highDismissalUrls = this.dismissalHistory.filter(
      r => r.consecutiveCount >= this.adaptationThresholds.medium
    ).length;

    return {
      totalDismissals,
      uniqueUrls,
      averageDismissalsPerUrl: uniqueUrls > 0 ? totalDismissals / uniqueUrls : 0,
      highDismissalUrls,
      dismissalRate: this.getDismissalRate()
    };
  }

  /**
   * Clear dismissal history
   */
  public clear(): void {
    this.dismissalHistory = [];
  }

  /**
   * Clear dismissals for specific URL
   */
  public clearUrl(url: string): void {
    const index = this.dismissalHistory.findIndex(r => r.url === url);
    if (index >= 0) {
      this.dismissalHistory.splice(index, 1);
    }
  }

  /**
   * Export dismissal history
   */
  public exportHistory(): DismissalRecord[] {
    return [...this.dismissalHistory];
  }

  /**
   * Import dismissal history
   */
  public importHistory(history: DismissalRecord[]): void {
    this.dismissalHistory = history.slice(0, this.maxHistorySize);
  }
}

// Export singleton instance
export const dismissalAdaptation = new DismissalAdaptation();

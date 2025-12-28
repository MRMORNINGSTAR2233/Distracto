import { BrowsingContext, BrowsingHistory } from '../types';
import { storageManager } from '../storage/StorageManager';
import { 
  extractDomain, 
  categorizeUrl, 
  analyzeNavigationPattern,
  extractTimeOfDay,
  extractDayOfWeek 
} from '../utils/contextExtractor';

/**
 * Pattern similarity score
 */
export interface SimilarityScore {
  overall: number;
  temporal: number;
  categorical: number;
  navigational: number;
  matchingPatterns: string[];
}

/**
 * Historical pattern
 */
interface HistoricalPattern {
  timeOfDay: number;
  dayOfWeek: number;
  category: string;
  navigationPattern: string;
  wasDistraction: boolean;
  frequency: number;
}

/**
 * Pattern Matcher detects similarity between current and historical browsing patterns
 */
export class PatternMatcher {
  private historicalPatterns: HistoricalPattern[] = [];
  private lastUpdate: number = 0;
  private updateInterval: number = 60 * 60 * 1000; // Update every hour

  /**
   * Calculate similarity between current context and historical distraction patterns
   */
  public async calculateSimilarity(context: BrowsingContext): Promise<SimilarityScore> {
    // Update patterns if needed
    await this.updatePatternsIfNeeded();

    // Get distraction patterns
    const distractionPatterns = this.historicalPatterns.filter(p => p.wasDistraction);

    if (distractionPatterns.length === 0) {
      return {
        overall: 0,
        temporal: 0,
        categorical: 0,
        navigational: 0,
        matchingPatterns: []
      };
    }

    // Calculate similarity scores
    const currentCategory = categorizeUrl(context.url);
    const currentNavPattern = analyzeNavigationPattern(context.recentHistory);

    let temporalScore = 0;
    let categoricalScore = 0;
    let navigationalScore = 0;
    const matchingPatterns: string[] = [];

    for (const pattern of distractionPatterns) {
      // Temporal similarity (time of day and day of week)
      const timeSimilarity = this.calculateTemporalSimilarity(
        context.timeOfDay,
        context.dayOfWeek,
        pattern.timeOfDay,
        pattern.dayOfWeek
      );

      // Categorical similarity
      const categorySimilarity = pattern.category === currentCategory ? 1.0 : 0.0;

      // Navigational similarity
      const navSimilarity = pattern.navigationPattern === currentNavPattern ? 1.0 : 0.0;

      // Weight by frequency
      const weight = Math.min(pattern.frequency / 10, 1.0);

      temporalScore += timeSimilarity * weight;
      categoricalScore += categorySimilarity * weight;
      navigationalScore += navSimilarity * weight;

      // Track matching patterns
      if (timeSimilarity > 0.7 && categorySimilarity > 0.5) {
        matchingPatterns.push(
          `${pattern.category} at ${pattern.timeOfDay}:00 on ${this.getDayName(pattern.dayOfWeek)}`
        );
      }
    }

    // Normalize scores
    const count = distractionPatterns.length;
    temporalScore /= count;
    categoricalScore /= count;
    navigationalScore /= count;

    // Calculate overall similarity (weighted average)
    const overall = (
      temporalScore * 0.4 +
      categoricalScore * 0.4 +
      navigationalScore * 0.2
    );

    return {
      overall,
      temporal: temporalScore,
      categorical: categoricalScore,
      navigational: navigationalScore,
      matchingPatterns: matchingPatterns.slice(0, 3) // Top 3 matches
    };
  }

  /**
   * Calculate temporal similarity (time of day and day of week)
   */
  private calculateTemporalSimilarity(
    currentHour: number,
    currentDay: number,
    patternHour: number,
    patternDay: number
  ): number {
    // Day of week similarity (exact match or adjacent days)
    let daySimilarity = 0;
    if (currentDay === patternDay) {
      daySimilarity = 1.0;
    } else if (Math.abs(currentDay - patternDay) === 1) {
      daySimilarity = 0.5;
    }

    // Time of day similarity (within 2 hours)
    const hourDiff = Math.abs(currentHour - patternHour);
    let timeSimilarity = 0;
    if (hourDiff === 0) {
      timeSimilarity = 1.0;
    } else if (hourDiff === 1) {
      timeSimilarity = 0.7;
    } else if (hourDiff === 2) {
      timeSimilarity = 0.4;
    }

    // Combined temporal similarity
    return (daySimilarity * 0.4 + timeSimilarity * 0.6);
  }

  /**
   * Update historical patterns from browsing history
   */
  private async updatePatternsIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Check if update is needed
    if (now - this.lastUpdate < this.updateInterval) {
      return;
    }

    console.log('Updating historical patterns...');

    // Get last 30 days of history
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const history = await storageManager.getHistory({
      start: thirtyDaysAgo,
      end: now
    });

    // Build pattern map
    const patternMap = new Map<string, HistoricalPattern>();

    for (const entry of history) {
      const timeOfDay = extractTimeOfDay(entry.startTime);
      const dayOfWeek = extractDayOfWeek(entry.startTime);
      const category = categorizeUrl(entry.url);
      
      // Create pattern key
      const key = `${timeOfDay}-${dayOfWeek}-${category}`;

      if (patternMap.has(key)) {
        const pattern = patternMap.get(key)!;
        pattern.frequency++;
      } else {
        patternMap.set(key, {
          timeOfDay,
          dayOfWeek,
          category,
          navigationPattern: 'unknown',
          wasDistraction: !entry.wasProductive,
          frequency: 1
        });
      }
    }

    // Convert to array and filter low-frequency patterns
    this.historicalPatterns = Array.from(patternMap.values())
      .filter(p => p.frequency >= 2); // At least 2 occurrences

    this.lastUpdate = now;
    console.log(`Updated ${this.historicalPatterns.length} historical patterns`);
  }

  /**
   * Check if current context matches known distraction patterns
   */
  public async matchesDistractionPattern(context: BrowsingContext): Promise<boolean> {
    const similarity = await this.calculateSimilarity(context);
    return similarity.overall > 0.6; // 60% similarity threshold
  }

  /**
   * Get most common distraction patterns
   */
  public getTopDistractionPatterns(limit: number = 5): HistoricalPattern[] {
    return this.historicalPatterns
      .filter(p => p.wasDistraction)
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, limit);
  }

  /**
   * Get day name from day number
   */
  private getDayName(day: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[day] || 'Unknown';
  }

  /**
   * Force pattern update
   */
  public async forceUpdate(): Promise<void> {
    this.lastUpdate = 0;
    await this.updatePatternsIfNeeded();
  }

  /**
   * Get pattern statistics
   */
  public getStatistics(): {
    totalPatterns: number;
    distractionPatterns: number;
    productivePatterns: number;
    lastUpdate: number;
  } {
    return {
      totalPatterns: this.historicalPatterns.length,
      distractionPatterns: this.historicalPatterns.filter(p => p.wasDistraction).length,
      productivePatterns: this.historicalPatterns.filter(p => !p.wasDistraction).length,
      lastUpdate: this.lastUpdate
    };
  }

  /**
   * Clear all patterns
   */
  public clear(): void {
    this.historicalPatterns = [];
    this.lastUpdate = 0;
  }
}

// Export singleton instance
export const patternMatcher = new PatternMatcher();

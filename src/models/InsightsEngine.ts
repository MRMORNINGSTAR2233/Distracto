import { BrowsingHistory } from '../types';
import { storageManager } from '../storage/StorageManager';
import { analyticsEngine, TimePeriod, HourlyBreakdown, DailyBreakdown } from './AnalyticsEngine';

/**
 * Insight type
 */
export type InsightType = 
  | 'peak-productivity'
  | 'distraction-trigger'
  | 'trend-improving'
  | 'trend-declining'
  | 'streak-opportunity'
  | 'whitelist-suggestion'
  | 'schedule-optimization';

/**
 * Insight
 */
export interface Insight {
  type: InsightType;
  title: string;
  description: string;
  actionable: boolean;
  action?: string;
  data?: any;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Productivity trend
 */
export interface ProductivityTrend {
  direction: 'improving' | 'stable' | 'declining';
  changePercent: number;
  currentRate: number;
  previousRate: number;
  confidence: number;
}

/**
 * Peak hours
 */
export interface PeakHours {
  mostProductive: number[];
  leastProductive: number[];
  averageProductivity: number;
}

/**
 * Distraction pattern
 */
export interface DistractionPattern {
  trigger: string;
  frequency: number;
  averageDuration: number;
  timeOfDay: number[];
  dayOfWeek: number[];
}

/**
 * Insights Engine analyzes patterns and generates actionable insights
 */
export class InsightsEngine {
  /**
   * Generate all insights for a period
   */
  public async generateInsights(period: TimePeriod = 'week'): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Get peak productivity hours
    const peakHours = await this.identifyPeakHours(period);
    if (peakHours) {
      insights.push(peakHours);
    }

    // Get distraction triggers
    const triggers = await this.identifyDistractionTriggers(period);
    insights.push(...triggers);

    // Get productivity trend
    const trend = await this.analyzeTrend(period);
    if (trend) {
      insights.push(trend);
    }

    // Get streak opportunities
    const streakOpp = await this.identifyStreakOpportunities(period);
    if (streakOpp) {
      insights.push(streakOpp);
    }

    // Get whitelist suggestions
    const whitelist = await this.suggestWhitelistAdditions(period);
    if (whitelist) {
      insights.push(whitelist);
    }

    // Get schedule optimization
    const schedule = await this.suggestScheduleOptimization(period);
    if (schedule) {
      insights.push(schedule);
    }

    // Sort by priority
    return insights.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Identify peak productivity hours
   */
  public async identifyPeakHours(period: TimePeriod = 'week'): Promise<Insight | null> {
    const hourly = await analyticsEngine.getHourlyBreakdown(period);

    // Filter hours with significant activity (>10 minutes)
    const activeHours = hourly.filter(h => h.totalMinutes > 10);
    
    if (activeHours.length === 0) {
      return null;
    }

    // Sort by productivity rate
    const sorted = [...activeHours].sort((a, b) => b.productivityRate - a.productivityRate);

    const mostProductive = sorted.slice(0, 3).map(h => h.hour);
    const leastProductive = sorted.slice(-3).map(h => h.hour);

    const formatHour = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}${period}`;
    };

    const peakHoursStr = mostProductive.map(formatHour).join(', ');

    return {
      type: 'peak-productivity',
      title: 'Peak Productivity Hours',
      description: `You're most productive during ${peakHoursStr}. Consider scheduling important work during these times.`,
      actionable: true,
      action: 'Schedule deep work during peak hours',
      data: { mostProductive, leastProductive },
      priority: 'high'
    };
  }

  /**
   * Identify common distraction triggers
   */
  public async identifyDistractionTriggers(period: TimePeriod = 'week'): Promise<Insight[]> {
    const { startDate, endDate } = this.getDateRange(period);
    const history = await storageManager.getHistory({
      start: startDate.getTime(),
      end: endDate.getTime()
    });

    // Find distraction patterns
    const distractions = history.filter(h => !h.wasProductive && h.interventionTriggered);

    if (distractions.length < 3) {
      return [];
    }

    // Group by URL
    const urlMap = new Map<string, BrowsingHistory[]>();
    distractions.forEach(d => {
      if (!urlMap.has(d.url)) {
        urlMap.set(d.url, []);
      }
      urlMap.get(d.url)!.push(d);
    });

    // Find top triggers
    const triggers = Array.from(urlMap.entries())
      .map(([url, entries]) => ({
        url,
        count: entries.length,
        totalMinutes: entries.reduce((sum, e) => sum + e.duration, 0)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    return triggers.map(trigger => ({
      type: 'distraction-trigger' as InsightType,
      title: 'Common Distraction',
      description: `${this.extractDomain(trigger.url)} triggered ${trigger.count} distractions (${Math.round(trigger.totalMinutes)} min total). Consider adding to whitelist or setting quiet hours.`,
      actionable: true,
      action: `Add ${this.extractDomain(trigger.url)} to whitelist`,
      data: trigger,
      priority: trigger.count > 5 ? 'high' : 'medium'
    }));
  }

  /**
   * Analyze productivity trend
   */
  public async analyzeTrend(period: TimePeriod = 'week'): Promise<Insight | null> {
    if (period === 'today') {
      return null; // Need at least a week for trends
    }

    const daily = await analyticsEngine.getDailyBreakdown(period);

    if (daily.length < 7) {
      return null;
    }

    // Split into two halves
    const midpoint = Math.floor(daily.length / 2);
    const firstHalf = daily.slice(0, midpoint);
    const secondHalf = daily.slice(midpoint);

    const avgFirst = firstHalf.reduce((sum, d) => sum + d.productivityRate, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, d) => sum + d.productivityRate, 0) / secondHalf.length;

    const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;

    let direction: 'improving' | 'stable' | 'declining';
    let title: string;
    let description: string;
    let priority: 'high' | 'medium' | 'low';

    if (Math.abs(changePercent) < 5) {
      direction = 'stable';
      title = 'Stable Productivity';
      description = `Your productivity has remained consistent at ${Math.round(avgSecond * 100)}%. Keep up the good work!`;
      priority = 'low';
    } else if (changePercent > 0) {
      direction = 'improving';
      title = 'Productivity Improving';
      description = `Great news! Your productivity increased by ${Math.round(changePercent)}% over the past ${period}. You're building positive habits!`;
      priority = 'medium';
    } else {
      direction = 'declining';
      title = 'Productivity Declining';
      description = `Your productivity decreased by ${Math.round(Math.abs(changePercent))}% recently. Consider reviewing your whitelist and quiet hours settings.`;
      priority = 'high';
    }

    return {
      type: direction === 'improving' ? 'trend-improving' : 'trend-declining',
      title,
      description,
      actionable: direction === 'declining',
      action: direction === 'declining' ? 'Review and adjust settings' : undefined,
      data: {
        direction,
        changePercent,
        currentRate: avgSecond,
        previousRate: avgFirst
      },
      priority
    };
  }

  /**
   * Identify streak opportunities
   */
  public async identifyStreakOpportunities(period: TimePeriod = 'week'): Promise<Insight | null> {
    const hourly = await analyticsEngine.getHourlyBreakdown(period);
    const streak = await storageManager.getCurrentStreak();

    // Find hours with high productivity but low activity
    const opportunities = hourly
      .filter(h => h.productivityRate > 0.7 && h.totalMinutes < 30)
      .sort((a, b) => b.productivityRate - a.productivityRate)
      .slice(0, 2);

    if (opportunities.length === 0) {
      return null;
    }

    const formatHour = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}${period}`;
    };

    const hoursStr = opportunities.map(h => formatHour(h.hour)).join(' and ');

    return {
      type: 'streak-opportunity',
      title: 'Streak Building Opportunity',
      description: `You're highly productive at ${hoursStr} but don't spend much time working then. Try extending your focus sessions during these hours to build longer streaks.`,
      actionable: true,
      action: 'Schedule longer sessions during productive hours',
      data: { opportunities, currentStreak: streak.current },
      priority: 'medium'
    };
  }

  /**
   * Suggest whitelist additions
   */
  public async suggestWhitelistAdditions(period: TimePeriod = 'week'): Promise<Insight | null> {
    const { startDate, endDate } = this.getDateRange(period);
    const history = await storageManager.getHistory({
      start: startDate.getTime(),
      end: endDate.getTime()
    });

    // Find productive sites with interventions
    const candidates = history.filter(h => 
      h.wasProductive && h.interventionTriggered && !h.interventionCompleted
    );

    if (candidates.length < 3) {
      return null;
    }

    // Group by URL
    const urlMap = new Map<string, number>();
    candidates.forEach(c => {
      urlMap.set(c.url, (urlMap.get(c.url) || 0) + 1);
    });

    // Find top candidates
    const topCandidate = Array.from(urlMap.entries())
      .sort((a, b) => b[1] - a[1])[0];

    if (!topCandidate || topCandidate[1] < 3) {
      return null;
    }

    const domain = this.extractDomain(topCandidate[0]);

    return {
      type: 'whitelist-suggestion',
      title: 'Whitelist Suggestion',
      description: `${domain} is productive but triggers interventions. Consider adding it to your whitelist to reduce interruptions.`,
      actionable: true,
      action: `Add ${domain} to whitelist`,
      data: { url: topCandidate[0], count: topCandidate[1] },
      priority: 'medium'
    };
  }

  /**
   * Suggest schedule optimization
   */
  public async suggestScheduleOptimization(period: TimePeriod = 'week'): Promise<Insight | null> {
    const hourly = await analyticsEngine.getHourlyBreakdown(period);

    // Find hours with low productivity but high activity
    const inefficientHours = hourly
      .filter(h => h.totalMinutes > 20 && h.productivityRate < 0.4)
      .sort((a, b) => b.totalMinutes - a.totalMinutes);

    if (inefficientHours.length === 0) {
      return null;
    }

    const worstHour = inefficientHours[0];
    const formatHour = (hour: number) => {
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour % 12 || 12;
      return `${displayHour}${period}`;
    };

    return {
      type: 'schedule-optimization',
      title: 'Schedule Optimization',
      description: `You spend ${Math.round(worstHour.totalMinutes)} minutes around ${formatHour(worstHour.hour)} with only ${Math.round(worstHour.productivityRate * 100)}% productivity. Consider setting this as quiet hours or taking a break instead.`,
      actionable: true,
      action: `Add ${formatHour(worstHour.hour)}-${formatHour((worstHour.hour + 1) % 24)} to quiet hours`,
      data: { hour: worstHour.hour, productivityRate: worstHour.productivityRate },
      priority: 'medium'
    };
  }

  /**
   * Get productivity trend data
   */
  public async getProductivityTrend(period: TimePeriod = 'month'): Promise<ProductivityTrend> {
    const daily = await analyticsEngine.getDailyBreakdown(period);

    if (daily.length < 7) {
      return {
        direction: 'stable',
        changePercent: 0,
        currentRate: 0,
        previousRate: 0,
        confidence: 0
      };
    }

    // Split into two halves
    const midpoint = Math.floor(daily.length / 2);
    const firstHalf = daily.slice(0, midpoint);
    const secondHalf = daily.slice(midpoint);

    const avgFirst = firstHalf.reduce((sum, d) => sum + d.productivityRate, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, d) => sum + d.productivityRate, 0) / secondHalf.length;

    const changePercent = ((avgSecond - avgFirst) / avgFirst) * 100;

    let direction: 'improving' | 'stable' | 'declining';
    if (Math.abs(changePercent) < 5) {
      direction = 'stable';
    } else if (changePercent > 0) {
      direction = 'improving';
    } else {
      direction = 'declining';
    }

    // Calculate confidence based on data points and consistency
    const confidence = Math.min(daily.length / 30, 1); // More data = higher confidence

    return {
      direction,
      changePercent,
      currentRate: avgSecond,
      previousRate: avgFirst,
      confidence
    };
  }

  /**
   * Get peak productivity hours
   */
  public async getPeakHours(period: TimePeriod = 'week'): Promise<PeakHours> {
    const hourly = await analyticsEngine.getHourlyBreakdown(period);

    // Filter hours with significant activity
    const activeHours = hourly.filter(h => h.totalMinutes > 10);

    if (activeHours.length === 0) {
      return {
        mostProductive: [],
        leastProductive: [],
        averageProductivity: 0
      };
    }

    // Sort by productivity rate
    const sorted = [...activeHours].sort((a, b) => b.productivityRate - a.productivityRate);

    const mostProductive = sorted.slice(0, 3).map(h => h.hour);
    const leastProductive = sorted.slice(-3).map(h => h.hour);
    const averageProductivity = activeHours.reduce((sum, h) => sum + h.productivityRate, 0) / activeHours.length;

    return {
      mostProductive,
      leastProductive,
      averageProductivity
    };
  }

  /**
   * Get distraction patterns
   */
  public async getDistractionPatterns(period: TimePeriod = 'week'): Promise<DistractionPattern[]> {
    const { startDate, endDate } = this.getDateRange(period);
    const history = await storageManager.getHistory({
      start: startDate.getTime(),
      end: endDate.getTime()
    });

    // Find distractions
    const distractions = history.filter(h => !h.wasProductive);

    // Group by URL
    const urlMap = new Map<string, BrowsingHistory[]>();
    distractions.forEach(d => {
      if (!urlMap.has(d.url)) {
        urlMap.set(d.url, []);
      }
      urlMap.get(d.url)!.push(d);
    });

    // Analyze patterns
    const patterns: DistractionPattern[] = [];

    urlMap.forEach((entries, url) => {
      if (entries.length < 2) return;

      const avgDuration = entries.reduce((sum, e) => sum + e.duration, 0) / entries.length;
      
      // Get time of day distribution
      const hourCounts = new Map<number, number>();
      entries.forEach(e => {
        const hour = new Date(e.startTime).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });

      const timeOfDay = Array.from(hourCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([hour]) => hour);

      // Get day of week distribution
      const dayCounts = new Map<number, number>();
      entries.forEach(e => {
        const day = new Date(e.startTime).getDay();
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
      });

      const dayOfWeek = Array.from(dayCounts.entries())
        .filter(([_, count]) => count >= 2)
        .map(([day]) => day);

      patterns.push({
        trigger: this.extractDomain(url),
        frequency: entries.length,
        averageDuration: avgDuration,
        timeOfDay,
        dayOfWeek
      });
    });

    return patterns.sort((a, b) => b.frequency - a.frequency).slice(0, 5);
  }

  /**
   * Extract domain from URL
   */
  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  /**
   * Get date range for period
   */
  private getDateRange(period: TimePeriod): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'month':
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        break;

      case 'all':
        startDate.setFullYear(2020, 0, 1);
        break;
    }

    return { startDate, endDate };
  }
}

// Export singleton instance
export const insightsEngine = new InsightsEngine();

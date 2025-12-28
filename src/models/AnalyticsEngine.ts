import { BrowsingHistory, DailyStatistics } from '../types';
import { storageManager } from '../storage/StorageManager';

/**
 * Time period for statistics
 */
export type TimePeriod = 'today' | 'week' | 'month' | 'all';

/**
 * Statistics summary
 */
export interface StatisticsSummary {
  period: TimePeriod;
  startDate: Date;
  endDate: Date;
  totalMinutes: number;
  productiveMinutes: number;
  distractedMinutes: number;
  neutralMinutes: number;
  productivityRate: number;
  interventionsTriggered: number;
  interventionsCompleted: number;
  completionRate: number;
  longestStreak: number;
  averageSessionDuration: number;
  sitesVisited: number;
  topProductiveSites: Array<{ url: string; minutes: number }>;
  topDistractionSites: Array<{ url: string; minutes: number }>;
}

/**
 * Hourly breakdown
 */
export interface HourlyBreakdown {
  hour: number;
  productiveMinutes: number;
  distractedMinutes: number;
  totalMinutes: number;
  productivityRate: number;
}

/**
 * Daily breakdown
 */
export interface DailyBreakdown {
  date: string;
  productiveMinutes: number;
  distractedMinutes: number;
  totalMinutes: number;
  productivityRate: number;
  longestStreak: number;
  interventionsCompleted: number;
}

/**
 * Analytics Engine calculates statistics and insights
 */
export class AnalyticsEngine {
  /**
   * Get statistics for a time period
   */
  public async getStatistics(period: TimePeriod = 'today'): Promise<StatisticsSummary> {
    const { startDate, endDate } = this.getDateRange(period);
    const history = await storageManager.getHistory({
      start: startDate.getTime(),
      end: endDate.getTime()
    });

    return this.calculateStatistics(history, period, startDate, endDate);
  }

  /**
   * Get daily statistics
   */
  public async getDailyStatistics(date: Date = new Date()): Promise<DailyStatistics> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const history = await storageManager.getHistory({
      start: startOfDay.getTime(),
      end: endOfDay.getTime()
    });

    const productiveMinutes = history
      .filter(h => h.wasProductive)
      .reduce((sum, h) => sum + h.duration, 0);

    const distractedMinutes = history
      .filter(h => !h.wasProductive)
      .reduce((sum, h) => sum + h.duration, 0);

    const interventionsTriggered = history.filter(h => h.interventionTriggered).length;
    const interventionsCompleted = history.filter(h => h.interventionCompleted).length;

    // Get longest streak for the day
    const streak = await storageManager.getCurrentStreak();
    const longestStreak = streak.longest;

    // Get top sites
    const siteMinutes = new Map<string, number>();
    history.forEach(h => {
      const current = siteMinutes.get(h.url) || 0;
      siteMinutes.set(h.url, current + h.duration);
    });

    const sortedSites = Array.from(siteMinutes.entries())
      .sort((a, b) => b[1] - a[1]);

    const productiveSites = history
      .filter(h => h.wasProductive)
      .map(h => h.url);
    const distractionSites = history
      .filter(h => !h.wasProductive)
      .map(h => h.url);

    const topProductiveSites = sortedSites
      .filter(([url]) => productiveSites.includes(url))
      .slice(0, 5)
      .map(([url]) => url);

    const topDistractionSites = sortedSites
      .filter(([url]) => distractionSites.includes(url))
      .slice(0, 5)
      .map(([url]) => url);

    return {
      date,
      productiveMinutes,
      distractedMinutes,
      interventionsTriggered,
      interventionsCompleted,
      longestStreak,
      sitesVisited: new Set(history.map(h => h.url)).size,
      topProductiveSites,
      topDistractionSites
    };
  }

  /**
   * Get hourly breakdown
   */
  public async getHourlyBreakdown(period: TimePeriod = 'today'): Promise<HourlyBreakdown[]> {
    const { startDate, endDate } = this.getDateRange(period);
    const history = await storageManager.getHistory({
      start: startDate.getTime(),
      end: endDate.getTime()
    });

    // Initialize 24-hour breakdown
    const hourlyData: HourlyBreakdown[] = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      productiveMinutes: 0,
      distractedMinutes: 0,
      totalMinutes: 0,
      productivityRate: 0
    }));

    // Aggregate by hour
    history.forEach(entry => {
      const hour = new Date(entry.startTime).getHours();
      hourlyData[hour].totalMinutes += entry.duration;
      
      if (entry.wasProductive) {
        hourlyData[hour].productiveMinutes += entry.duration;
      } else {
        hourlyData[hour].distractedMinutes += entry.duration;
      }
    });

    // Calculate productivity rates
    hourlyData.forEach(data => {
      if (data.totalMinutes > 0) {
        data.productivityRate = data.productiveMinutes / data.totalMinutes;
      }
    });

    return hourlyData;
  }

  /**
   * Get daily breakdown for a period
   */
  public async getDailyBreakdown(period: TimePeriod = 'week'): Promise<DailyBreakdown[]> {
    const { startDate, endDate } = this.getDateRange(period);
    const history = await storageManager.getHistory({
      start: startDate.getTime(),
      end: endDate.getTime()
    });

    // Group by date
    const dailyMap = new Map<string, BrowsingHistory[]>();
    history.forEach(entry => {
      const date = new Date(entry.startTime).toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, []);
      }
      dailyMap.get(date)!.push(entry);
    });

    // Calculate daily stats
    const dailyBreakdown: DailyBreakdown[] = [];
    
    // Iterate through each day in the range
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayHistory = dailyMap.get(dateStr) || [];

      const productiveMinutes = dayHistory
        .filter(h => h.wasProductive)
        .reduce((sum, h) => sum + h.duration, 0);

      const distractedMinutes = dayHistory
        .filter(h => !h.wasProductive)
        .reduce((sum, h) => sum + h.duration, 0);

      const totalMinutes = productiveMinutes + distractedMinutes;
      const productivityRate = totalMinutes > 0 ? productiveMinutes / totalMinutes : 0;

      const interventionsCompleted = dayHistory.filter(h => h.interventionCompleted).length;

      // For longest streak, we'd need to track it per day (simplified here)
      const longestStreak = 0; // Would need historical streak data

      dailyBreakdown.push({
        date: dateStr,
        productiveMinutes,
        distractedMinutes,
        totalMinutes,
        productivityRate,
        longestStreak,
        interventionsCompleted
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dailyBreakdown;
  }

  /**
   * Get site statistics
   */
  public async getSiteStatistics(period: TimePeriod = 'week'): Promise<{
    productive: Array<{ url: string; minutes: number; visits: number }>;
    distraction: Array<{ url: string; minutes: number; visits: number }>;
  }> {
    const { startDate, endDate } = this.getDateRange(period);
    const history = await storageManager.getHistory({
      start: startDate.getTime(),
      end: endDate.getTime()
    });

    const productiveSites = new Map<string, { minutes: number; visits: number }>();
    const distractionSites = new Map<string, { minutes: number; visits: number }>();

    history.forEach(entry => {
      const map = entry.wasProductive ? productiveSites : distractionSites;
      const current = map.get(entry.url) || { minutes: 0, visits: 0 };
      map.set(entry.url, {
        minutes: current.minutes + entry.duration,
        visits: current.visits + 1
      });
    });

    const toArray = (map: Map<string, { minutes: number; visits: number }>) =>
      Array.from(map.entries())
        .map(([url, data]) => ({ url, ...data }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 10);

    return {
      productive: toArray(productiveSites),
      distraction: toArray(distractionSites)
    };
  }

  /**
   * Calculate statistics from history
   */
  private calculateStatistics(
    history: BrowsingHistory[],
    period: TimePeriod,
    startDate: Date,
    endDate: Date
  ): StatisticsSummary {
    const productiveMinutes = history
      .filter(h => h.wasProductive)
      .reduce((sum, h) => sum + h.duration, 0);

    const distractedMinutes = history
      .filter(h => !h.wasProductive)
      .reduce((sum, h) => sum + h.duration, 0);

    const neutralMinutes = history
      .filter(h => h.classification.category === 'neutral')
      .reduce((sum, h) => sum + h.duration, 0);

    const totalMinutes = productiveMinutes + distractedMinutes + neutralMinutes;
    const productivityRate = totalMinutes > 0 ? productiveMinutes / totalMinutes : 0;

    const interventionsTriggered = history.filter(h => h.interventionTriggered).length;
    const interventionsCompleted = history.filter(h => h.interventionCompleted).length;
    const completionRate = interventionsTriggered > 0 
      ? interventionsCompleted / interventionsTriggered 
      : 0;

    // Calculate longest streak (simplified - would need historical data)
    const longestStreak = 0;

    // Calculate average session duration
    const averageSessionDuration = history.length > 0
      ? history.reduce((sum, h) => sum + h.duration, 0) / history.length
      : 0;

    // Get unique sites
    const sitesVisited = new Set(history.map(h => h.url)).size;

    // Get top sites
    const siteMinutes = new Map<string, number>();
    history.forEach(h => {
      const current = siteMinutes.get(h.url) || 0;
      siteMinutes.set(h.url, current + h.duration);
    });

    const productiveSites = history.filter(h => h.wasProductive);
    const distractionSites = history.filter(h => !h.wasProductive);

    const getTopSites = (sites: BrowsingHistory[]) => {
      const siteMap = new Map<string, number>();
      sites.forEach(h => {
        const current = siteMap.get(h.url) || 0;
        siteMap.set(h.url, current + h.duration);
      });

      return Array.from(siteMap.entries())
        .map(([url, minutes]) => ({ url, minutes }))
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 5);
    };

    return {
      period,
      startDate,
      endDate,
      totalMinutes,
      productiveMinutes,
      distractedMinutes,
      neutralMinutes,
      productivityRate,
      interventionsTriggered,
      interventionsCompleted,
      completionRate,
      longestStreak,
      averageSessionDuration,
      sitesVisited,
      topProductiveSites: getTopSites(productiveSites),
      topDistractionSites: getTopSites(distractionSites)
    };
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
        startDate.setFullYear(2020, 0, 1); // Start from 2020
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Export statistics as JSON
   */
  public async exportStatistics(period: TimePeriod = 'all'): Promise<string> {
    const stats = await this.getStatistics(period);
    const hourly = await this.getHourlyBreakdown(period);
    const daily = await this.getDailyBreakdown(period);
    const sites = await this.getSiteStatistics(period);

    return JSON.stringify({
      summary: stats,
      hourlyBreakdown: hourly,
      dailyBreakdown: daily,
      siteStatistics: sites,
      exportedAt: new Date().toISOString()
    }, null, 2);
  }
}

// Export singleton instance
export const analyticsEngine = new AnalyticsEngine();

/**
 * Notification Manager handles Chrome notifications
 */
export class NotificationManager {
  /**
   * Show personal best notification
   */
  public async showPersonalBest(streakValue: number): Promise<void> {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🎉 New Personal Best!',
        message: `Amazing! You've reached a ${streakValue}-minute focus streak!`,
        priority: 2
      });

      console.log(`Personal best notification shown: ${streakValue}`);
    } catch (error) {
      console.error('Failed to show personal best notification:', error);
    }
  }

  /**
   * Show milestone notification
   */
  public async showMilestone(streakValue: number): Promise<void> {
    try {
      const message = this.getMilestoneMessage(streakValue);

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '🏆 Milestone Reached!',
        message,
        priority: 2
      });

      console.log(`Milestone notification shown: ${streakValue}`);
    } catch (error) {
      console.error('Failed to show milestone notification:', error);
    }
  }

  /**
   * Get milestone message
   */
  private getMilestoneMessage(streakValue: number): string {
    const messages: Record<number, string> = {
      5: 'Great start! 5 minutes of focused attention.',
      10: 'You\'re building momentum! 10 minutes strong.',
      25: 'Impressive focus! 25 minutes of productivity.',
      50: 'You\'re on fire! 50 minutes of deep work.',
      100: 'Legendary! 100 minutes of uninterrupted focus.',
      250: 'Unstoppable! 250 minutes of pure concentration.',
      500: 'Master of Focus! 500 minutes achieved.',
      1000: 'Focus Champion! 1000 minutes - incredible!'
    };

    return messages[streakValue] || `${streakValue} minutes of focused attention!`;
  }

  /**
   * Show streak broken notification
   */
  public async showStreakBroken(brokenStreakValue: number): Promise<void> {
    if (brokenStreakValue < 5) {
      return; // Don't notify for very short streaks
    }

    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '💔 Streak Ended',
        message: `Your ${brokenStreakValue}-minute streak has ended. Ready to start a new one?`,
        priority: 1
      });

      console.log(`Streak broken notification shown: ${brokenStreakValue}`);
    } catch (error) {
      console.error('Failed to show streak broken notification:', error);
    }
  }

  /**
   * Show encouragement notification
   */
  public async showEncouragement(currentStreak: number, longestStreak: number): Promise<void> {
    if (currentStreak === 0) {
      return;
    }

    try {
      const remaining = longestStreak - currentStreak;
      let message: string;

      if (remaining <= 0) {
        message = `You're at your personal best! Keep going!`;
      } else if (remaining <= 5) {
        message = `Just ${remaining} more minutes to beat your record!`;
      } else {
        message = `You're doing great! ${currentStreak} minutes and counting.`;
      }

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '💪 Keep Going!',
        message,
        priority: 0
      });

      console.log('Encouragement notification shown');
    } catch (error) {
      console.error('Failed to show encouragement notification:', error);
    }
  }

  /**
   * Show daily summary notification
   */
  public async showDailySummary(stats: {
    longestStreak: number;
    totalProductiveMinutes: number;
    interventionsCompleted: number;
  }): Promise<void> {
    try {
      const message = `Today's Focus:\n` +
        `🔥 Longest streak: ${stats.longestStreak} min\n` +
        `✅ Productive time: ${stats.totalProductiveMinutes} min\n` +
        `🎯 Challenges completed: ${stats.interventionsCompleted}`;

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '📊 Daily Summary',
        message,
        priority: 1
      });

      console.log('Daily summary notification shown');
    } catch (error) {
      console.error('Failed to show daily summary notification:', error);
    }
  }

  /**
   * Show whitelist suggestion notification
   */
  public async showWhitelistSuggestion(urls: string[]): Promise<void> {
    try {
      const message = `You've dismissed interventions frequently on:\n${urls.slice(0, 2).join('\n')}\n\nConsider adding to whitelist?`;

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '💡 Suggestion',
        message,
        priority: 1
      });

      console.log('Whitelist suggestion notification shown');
    } catch (error) {
      console.error('Failed to show whitelist suggestion notification:', error);
    }
  }

  /**
   * Show level up notification
   */
  public async showLevelUp(newLevel: number, pointsToNext: number): Promise<void> {
    try {
      const message = `You've reached level ${newLevel}! ${pointsToNext} points to level ${newLevel + 1}.`;

      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: '⭐ Level Up!',
        message,
        priority: 2
      });

      console.log(`Level up notification shown: ${newLevel}`);
    } catch (error) {
      console.error('Failed to show level up notification:', error);
    }
  }

  /**
   * Show achievement unlocked notification
   */
  public async showAchievementUnlocked(title: string, description: string, icon: string): Promise<void> {
    try {
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `${icon} Achievement Unlocked!`,
        message: `${title}\n${description}`,
        priority: 2
      });

      console.log(`Achievement unlocked notification shown: ${title}`);
    } catch (error) {
      console.error('Failed to show achievement unlocked notification:', error);
    }
  }
}

// Export singleton instance
export const notificationManager = new NotificationManager();

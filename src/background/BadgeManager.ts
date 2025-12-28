import { StreakData } from '../types';

/**
 * Badge Manager handles extension icon badge updates
 */
export class BadgeManager {
  /**
   * Update badge with current streak
   */
  public async updateStreakBadge(streak: StreakData): Promise<void> {
    try {
      const text = streak.current > 0 ? streak.current.toString() : '';
      const color = this.getColorForStreak(streak.current);

      await chrome.action.setBadgeText({ text });
      await chrome.action.setBadgeBackgroundColor({ color });

      // Update title (tooltip)
      const title = this.getTitleForStreak(streak);
      await chrome.action.setTitle({ title });
    } catch (error) {
      console.error('Failed to update badge:', error);
    }
  }

  /**
   * Get badge color based on streak value
   */
  private getColorForStreak(streakValue: number): string {
    if (streakValue === 0) {
      return '#999999'; // Gray for no streak
    } else if (streakValue < 5) {
      return '#4CAF50'; // Green for starting
    } else if (streakValue < 10) {
      return '#2196F3'; // Blue for building
    } else if (streakValue < 25) {
      return '#9C27B0'; // Purple for strong
    } else if (streakValue < 50) {
      return '#FF9800'; // Orange for impressive
    } else {
      return '#F44336'; // Red for legendary
    }
  }

  /**
   * Get tooltip title based on streak
   */
  private getTitleForStreak(streak: StreakData): string {
    if (streak.current === 0) {
      return `Digital Attention Rescue\nLongest streak: ${streak.longest}`;
    }

    const level = this.getStreakLevel(streak.current);
    return `Digital Attention Rescue\n🔥 ${level} Streak: ${streak.current}\n🏆 Best: ${streak.longest}\n✨ Multiplier: ${streak.multiplier.toFixed(1)}x`;
  }

  /**
   * Get streak level name
   */
  private getStreakLevel(streakValue: number): string {
    if (streakValue < 5) return 'Starting';
    if (streakValue < 10) return 'Building';
    if (streakValue < 25) return 'Strong';
    if (streakValue < 50) return 'Impressive';
    if (streakValue < 100) return 'Amazing';
    return 'Legendary';
  }

  /**
   * Show notification badge (for alerts)
   */
  public async showNotification(message: string): Promise<void> {
    try {
      await chrome.action.setBadgeText({ text: '!' });
      await chrome.action.setBadgeBackgroundColor({ color: '#FF5722' });
      await chrome.action.setTitle({ title: `Digital Attention Rescue\n${message}` });

      // Reset after 5 seconds
      setTimeout(async () => {
        await chrome.action.setBadgeText({ text: '' });
      }, 5000);
    } catch (error) {
      console.error('Failed to show notification badge:', error);
    }
  }

  /**
   * Clear badge
   */
  public async clearBadge(): Promise<void> {
    try {
      await chrome.action.setBadgeText({ text: '' });
      await chrome.action.setTitle({ title: 'Digital Attention Rescue' });
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  }

  /**
   * Animate badge for milestone
   */
  public async animateMilestone(streakValue: number): Promise<void> {
    const colors = ['#FF5722', '#FF9800', '#FFC107', '#FFEB3B'];
    let index = 0;

    const interval = setInterval(async () => {
      try {
        await chrome.action.setBadgeBackgroundColor({ color: colors[index % colors.length] });
        index++;

        if (index >= 8) {
          clearInterval(interval);
          // Reset to normal color
          const normalColor = this.getColorForStreak(streakValue);
          await chrome.action.setBadgeBackgroundColor({ color: normalColor });
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 200);
  }
}

// Export singleton instance
export const badgeManager = new BadgeManager();

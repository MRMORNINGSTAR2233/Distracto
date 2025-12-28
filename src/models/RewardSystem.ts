import { UserProgress, Achievement, StreakData } from '../types';
import { storageManager } from '../storage/StorageManager';
import { notificationManager } from '../background/NotificationManager';

/**
 * Point calculation for different activities
 */
const POINT_VALUES = {
  INTERVENTION_COMPLETED: 10,
  PRODUCTIVE_SESSION_5MIN: 5,
  PRODUCTIVE_SESSION_15MIN: 15,
  PRODUCTIVE_SESSION_30MIN: 30,
  PRODUCTIVE_SESSION_60MIN: 60,
  STREAK_MILESTONE: 50,
  PERSONAL_BEST: 100,
  DAILY_GOAL_MET: 25
};

/**
 * Level thresholds (points needed for each level)
 */
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  4000,   // Level 7
  8000,   // Level 8
  15000,  // Level 9
  30000   // Level 10
];

/**
 * Achievement definitions
 */
const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_intervention', title: 'First Step', description: 'Complete your first intervention', icon: '🎯' },
  { id: 'streak_5', title: 'Getting Started', description: 'Reach a 5-minute streak', icon: '🔥' },
  { id: 'streak_10', title: 'Building Momentum', description: 'Reach a 10-minute streak', icon: '💪' },
  { id: 'streak_25', title: 'Focused Mind', description: 'Reach a 25-minute streak', icon: '🧠' },
  { id: 'streak_50', title: 'Deep Work', description: 'Reach a 50-minute streak', icon: '⚡' },
  { id: 'streak_100', title: 'Flow State', description: 'Reach a 100-minute streak', icon: '🌊' },
  { id: 'level_5', title: 'Rising Star', description: 'Reach level 5', icon: '⭐' },
  { id: 'level_10', title: 'Focus Master', description: 'Reach level 10', icon: '👑' },
  { id: 'interventions_10', title: 'Committed', description: 'Complete 10 interventions', icon: '✅' },
  { id: 'interventions_50', title: 'Dedicated', description: 'Complete 50 interventions', icon: '🎖️' },
  { id: 'interventions_100', title: 'Unstoppable', description: 'Complete 100 interventions', icon: '🏆' },
  { id: 'week_streak', title: 'Week Warrior', description: 'Maintain focus for 7 days', icon: '📅' },
  { id: 'productive_1000', title: 'Productivity Pro', description: 'Accumulate 1000 productive minutes', icon: '⏱️' }
];

/**
 * Reward System manages points, levels, and achievements
 */
export class RewardSystem {
  private userProgress: UserProgress | null = null;
  private totalInterventions: number = 0;
  private totalProductiveMinutes: number = 0;

  constructor() {
    this.initialize();
  }

  /**
   * Initialize reward system
   */
  private async initialize(): Promise<void> {
    const stored = await this.loadProgress();
    this.userProgress = stored || {
      level: 1,
      totalPoints: 0,
      pointsToNextLevel: LEVEL_THRESHOLDS[1],
      achievements: []
    };
  }

  /**
   * Calculate points for productive session
   */
  public calculateSessionPoints(durationMinutes: number, streak: StreakData): number {
    let basePoints = 0;

    // Base points by duration
    if (durationMinutes >= 60) {
      basePoints = POINT_VALUES.PRODUCTIVE_SESSION_60MIN;
    } else if (durationMinutes >= 30) {
      basePoints = POINT_VALUES.PRODUCTIVE_SESSION_30MIN;
    } else if (durationMinutes >= 15) {
      basePoints = POINT_VALUES.PRODUCTIVE_SESSION_15MIN;
    } else if (durationMinutes >= 5) {
      basePoints = POINT_VALUES.PRODUCTIVE_SESSION_5MIN;
    }

    // Apply streak multiplier
    const points = Math.floor(basePoints * streak.multiplier);

    return points;
  }

  /**
   * Award points for productive session
   */
  public async awardProductiveSession(durationMinutes: number): Promise<number> {
    if (!this.userProgress) await this.initialize();

    const streak = await storageManager.getCurrentStreak();
    const points = this.calculateSessionPoints(durationMinutes, streak);
    
    if (points > 0) {
      await this.addPoints(points);
      this.totalProductiveMinutes += durationMinutes;
      
      // Check for productivity achievements
      await this.checkProductivityAchievements();
      
      console.log(`Awarded ${points} points for ${durationMinutes} min productive session`);
    }

    return points;
  }

  /**
   * Award points for intervention completion
   */
  public async awardInterventionPoints(): Promise<number> {
    if (!this.userProgress) await this.initialize();

    const points = POINT_VALUES.INTERVENTION_COMPLETED;
    await this.addPoints(points);
    this.totalInterventions++;

    // Check for intervention achievements
    await this.checkInterventionAchievements();

    return points;
  }

  /**
   * Award points for streak milestone
   */
  public async awardStreakMilestone(streakValue: number): Promise<number> {
    if (!this.userProgress) await this.initialize();

    const points = POINT_VALUES.STREAK_MILESTONE;
    await this.addPoints(points);

    // Check for streak achievements
    await this.checkStreakAchievements(streakValue);

    return points;
  }

  /**
   * Award points for personal best
   */
  public async awardPersonalBest(): Promise<number> {
    if (!this.userProgress) await this.initialize();

    const points = POINT_VALUES.PERSONAL_BEST;
    await this.addPoints(points);

    return points;
  }

  /**
   * Award points for daily goal
   */
  public async awardDailyGoal(): Promise<number> {
    if (!this.userProgress) await this.initialize();

    const points = POINT_VALUES.DAILY_GOAL_MET;
    await this.addPoints(points);

    return points;
  }

  /**
   * Add points and check for level up
   */
  private async addPoints(points: number): Promise<void> {
    if (!this.userProgress) return;

    this.userProgress.totalPoints += points;

    // Check for level up
    const newLevel = this.calculateLevel(this.userProgress.totalPoints);
    if (newLevel > this.userProgress.level) {
      const oldLevel = this.userProgress.level;
      this.userProgress.level = newLevel;
      await this.unlockLevelAchievement(newLevel);
      
      // Update points to next level
      this.userProgress.pointsToNextLevel = this.getPointsToNextLevel(
        this.userProgress.totalPoints,
        this.userProgress.level
      );
      
      // Show level up notification
      await notificationManager.showLevelUp(newLevel, this.userProgress.pointsToNextLevel);
      console.log(`Level up! ${oldLevel} → ${newLevel}`);
    } else {
      // Update points to next level
      this.userProgress.pointsToNextLevel = this.getPointsToNextLevel(
        this.userProgress.totalPoints,
        this.userProgress.level
      );
    }

    await this.saveProgress();
  }

  /**
   * Calculate level from total points
   */
  private calculateLevel(totalPoints: number): number {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (totalPoints >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1;
  }

  /**
   * Get points needed for next level
   */
  private getPointsToNextLevel(totalPoints: number, currentLevel: number): number {
    if (currentLevel >= LEVEL_THRESHOLDS.length) {
      return 0; // Max level reached
    }
    return LEVEL_THRESHOLDS[currentLevel] - totalPoints;
  }

  /**
   * Check and unlock intervention achievements
   */
  private async checkInterventionAchievements(): Promise<void> {
    const milestones = [
      { count: 1, id: 'first_intervention' },
      { count: 10, id: 'interventions_10' },
      { count: 50, id: 'interventions_50' },
      { count: 100, id: 'interventions_100' }
    ];

    for (const milestone of milestones) {
      if (this.totalInterventions === milestone.count) {
        await this.unlockAchievement(milestone.id);
      }
    }
  }

  /**
   * Check and unlock streak achievements
   */
  private async checkStreakAchievements(streakValue: number): Promise<void> {
    const milestones = [
      { value: 5, id: 'streak_5' },
      { value: 10, id: 'streak_10' },
      { value: 25, id: 'streak_25' },
      { value: 50, id: 'streak_50' },
      { value: 100, id: 'streak_100' }
    ];

    for (const milestone of milestones) {
      if (streakValue === milestone.value) {
        await this.unlockAchievement(milestone.id);
      }
    }
  }

  /**
   * Unlock level achievement
   */
  private async unlockLevelAchievement(level: number): Promise<void> {
    if (level === 5) {
      await this.unlockAchievement('level_5');
    } else if (level === 10) {
      await this.unlockAchievement('level_10');
    }
  }

  /**
   * Check and unlock productivity achievements
   */
  private async checkProductivityAchievements(): Promise<void> {
    if (this.totalProductiveMinutes >= 1000) {
      await this.unlockAchievement('productive_1000');
    }
  }

  /**
   * Unlock achievement
   */
  private async unlockAchievement(achievementId: string): Promise<void> {
    if (!this.userProgress) return;

    // Check if already unlocked
    if (this.userProgress.achievements.some(a => a.id === achievementId)) {
      return;
    }

    // Find achievement definition
    const achievement = ACHIEVEMENTS.find(a => a.id === achievementId);
    if (!achievement) return;

    // Unlock it
    const unlockedAchievement = {
      ...achievement,
      unlockedAt: Date.now()
    };

    this.userProgress.achievements.push(unlockedAchievement);
    await this.saveProgress();

    // Show achievement notification
    await notificationManager.showAchievementUnlocked(
      achievement.title,
      achievement.description,
      achievement.icon
    );

    console.log(`Achievement unlocked: ${achievement.title}`);
  }

  /**
   * Get current user progress
   */
  public async getUserProgress(): Promise<UserProgress> {
    if (!this.userProgress) await this.initialize();
    return { ...this.userProgress! };
  }

  /**
   * Get all available achievements
   */
  public getAllAchievements(): Achievement[] {
    return [...ACHIEVEMENTS];
  }

  /**
   * Get unlocked achievements
   */
  public async getUnlockedAchievements(): Promise<Achievement[]> {
    if (!this.userProgress) await this.initialize();
    return [...this.userProgress!.achievements];
  }

  /**
   * Get locked achievements
   */
  public async getLockedAchievements(): Promise<Achievement[]> {
    if (!this.userProgress) await this.initialize();
    const unlockedIds = this.userProgress!.achievements.map(a => a.id);
    return ACHIEVEMENTS.filter(a => !unlockedIds.includes(a.id));
  }

  /**
   * Save progress to storage
   */
  private async saveProgress(): Promise<void> {
    if (!this.userProgress) return;

    try {
      await chrome.storage.local.set({
        dar_user_progress: this.userProgress,
        dar_total_interventions: this.totalInterventions,
        dar_total_productive_minutes: this.totalProductiveMinutes
      });
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  /**
   * Load progress from storage
   */
  private async loadProgress(): Promise<UserProgress | null> {
    try {
      const result = await chrome.storage.local.get([
        'dar_user_progress',
        'dar_total_interventions',
        'dar_total_productive_minutes'
      ]);

      this.totalInterventions = result.dar_total_interventions || 0;
      this.totalProductiveMinutes = result.dar_total_productive_minutes || 0;

      return result.dar_user_progress || null;
    } catch (error) {
      console.error('Failed to load progress:', error);
      return null;
    }
  }

  /**
   * Reset progress (for testing)
   */
  public async reset(): Promise<void> {
    this.userProgress = {
      level: 1,
      totalPoints: 0,
      pointsToNextLevel: LEVEL_THRESHOLDS[1],
      achievements: []
    };
    this.totalInterventions = 0;
    this.totalProductiveMinutes = 0;
    await this.saveProgress();
  }
}

// Export singleton instance
export const rewardSystem = new RewardSystem();

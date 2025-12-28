import { StreakData } from '../types';
import { storageManager } from '../storage/StorageManager';

/**
 * Streak state
 */
export enum StreakState {
  INACTIVE = 'inactive',
  ACTIVE = 'active',
  BROKEN = 'broken'
}

/**
 * Streak event
 */
export interface StreakEvent {
  type: 'start' | 'increment' | 'break' | 'milestone';
  timestamp: number;
  streakValue: number;
  isPersonalBest?: boolean;
}

/**
 * Streak Manager handles attention streak tracking and state management
 */
export class StreakManager {
  private currentState: StreakState = StreakState.INACTIVE;
  private streakData: StreakData | null = null;
  private listeners: Array<(event: StreakEvent) => void> = [];
  private lastActivityTime: number = Date.now();
  private inactivityThreshold: number = 30 * 60 * 1000; // 30 minutes

  constructor() {
    this.initialize();
  }

  /**
   * Initialize streak manager
   */
  private async initialize(): Promise<void> {
    this.streakData = await storageManager.getCurrentStreak();
    
    // Check if streak should be active based on last update
    const timeSinceUpdate = Date.now() - this.streakData.lastUpdate;
    if (timeSinceUpdate < this.inactivityThreshold && this.streakData.current > 0) {
      this.currentState = StreakState.ACTIVE;
    }

    console.log('Streak Manager initialized:', this.streakData);
  }

  /**
   * Start a new streak
   */
  public async startStreak(): Promise<void> {
    if (this.currentState === StreakState.ACTIVE) {
      return; // Already active
    }

    if (!this.streakData) {
      await this.initialize();
    }

    this.streakData!.current = 1;
    this.streakData!.lastUpdate = Date.now();
    this.streakData!.multiplier = 1.0;
    this.currentState = StreakState.ACTIVE;
    this.lastActivityTime = Date.now();

    await this.saveStreak();

    this.emitEvent({
      type: 'start',
      timestamp: Date.now(),
      streakValue: 1
    });

    console.log('Streak started');
  }

  /**
   * Increment the current streak
   */
  public async incrementStreak(): Promise<void> {
    if (!this.streakData) {
      await this.initialize();
    }

    if (this.currentState !== StreakState.ACTIVE) {
      await this.startStreak();
      return;
    }

    this.streakData!.current++;
    this.streakData!.lastUpdate = Date.now();
    this.lastActivityTime = Date.now();

    // Update multiplier based on streak length
    this.streakData!.multiplier = this.calculateMultiplier(this.streakData!.current);

    // Check for personal best
    let isPersonalBest = false;
    if (this.streakData!.current > this.streakData!.longest) {
      this.streakData!.longest = this.streakData!.current;
      isPersonalBest = true;
    }

    await this.saveStreak();

    this.emitEvent({
      type: 'increment',
      timestamp: Date.now(),
      streakValue: this.streakData!.current,
      isPersonalBest
    });

    // Check for milestones
    if (this.isMilestone(this.streakData!.current)) {
      this.emitEvent({
        type: 'milestone',
        timestamp: Date.now(),
        streakValue: this.streakData!.current
      });
    }

    console.log(`Streak incremented to ${this.streakData!.current}`);
  }

  /**
   * Break the current streak
   */
  public async breakStreak(): Promise<void> {
    if (!this.streakData || this.currentState !== StreakState.ACTIVE) {
      return;
    }

    const brokenStreakValue = this.streakData.current;

    this.streakData.current = 0;
    this.streakData.lastUpdate = Date.now();
    this.streakData.multiplier = 1.0;
    this.currentState = StreakState.BROKEN;

    await this.saveStreak();

    this.emitEvent({
      type: 'break',
      timestamp: Date.now(),
      streakValue: brokenStreakValue
    });

    console.log(`Streak broken at ${brokenStreakValue}`);
  }

  /**
   * Record productive activity (maintains streak)
   */
  public async recordProductiveActivity(): Promise<void> {
    this.lastActivityTime = Date.now();

    if (this.currentState === StreakState.INACTIVE) {
      await this.startStreak();
    } else if (this.currentState === StreakState.ACTIVE) {
      // Check if enough time has passed to increment
      const timeSinceLastUpdate = Date.now() - this.streakData!.lastUpdate;
      const incrementThreshold = 5 * 60 * 1000; // 5 minutes

      if (timeSinceLastUpdate >= incrementThreshold) {
        await this.incrementStreak();
      }
    } else if (this.currentState === StreakState.BROKEN) {
      // Start new streak after break
      await this.startStreak();
    }
  }

  /**
   * Record distraction (breaks streak)
   */
  public async recordDistraction(): Promise<void> {
    if (this.currentState === StreakState.ACTIVE) {
      await this.breakStreak();
    }
  }

  /**
   * Check for inactivity and break streak if needed
   */
  public async checkInactivity(): Promise<void> {
    if (this.currentState !== StreakState.ACTIVE) {
      return;
    }

    const timeSinceActivity = Date.now() - this.lastActivityTime;
    if (timeSinceActivity >= this.inactivityThreshold) {
      await this.breakStreak();
      console.log('Streak broken due to inactivity');
    }
  }

  /**
   * Calculate multiplier based on streak length
   */
  private calculateMultiplier(streakValue: number): number {
    if (streakValue < 5) return 1.0;
    if (streakValue < 10) return 1.2;
    if (streakValue < 20) return 1.5;
    if (streakValue < 50) return 2.0;
    return 2.5;
  }

  /**
   * Check if streak value is a milestone
   */
  private isMilestone(value: number): boolean {
    const milestones = [5, 10, 25, 50, 100, 250, 500, 1000];
    return milestones.includes(value);
  }

  /**
   * Get current streak data
   */
  public async getCurrentStreak(): Promise<StreakData> {
    if (!this.streakData) {
      await this.initialize();
    }
    return { ...this.streakData! };
  }

  /**
   * Get current state
   */
  public getState(): StreakState {
    return this.currentState;
  }

  /**
   * Save streak to storage
   */
  private async saveStreak(): Promise<void> {
    if (this.streakData) {
      await storageManager.saveStreak(this.streakData);
    }
  }

  /**
   * Add event listener
   */
  public addEventListener(listener: (event: StreakEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  public removeEventListener(listener: (event: StreakEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index >= 0) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: StreakEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in streak event listener:', error);
      }
    }
  }

  /**
   * Get streak statistics
   */
  public async getStatistics(): Promise<{
    current: number;
    longest: number;
    multiplier: number;
    state: StreakState;
    timeSinceLastActivity: number;
    nextMilestone: number | null;
  }> {
    if (!this.streakData) {
      await this.initialize();
    }

    const milestones = [5, 10, 25, 50, 100, 250, 500, 1000];
    const nextMilestone = milestones.find(m => m > this.streakData!.current) || null;

    return {
      current: this.streakData!.current,
      longest: this.streakData!.longest,
      multiplier: this.streakData!.multiplier,
      state: this.currentState,
      timeSinceLastActivity: Date.now() - this.lastActivityTime,
      nextMilestone
    };
  }

  /**
   * Reset streak (for testing or user request)
   */
  public async reset(): Promise<void> {
    this.streakData = {
      current: 0,
      longest: 0,
      lastUpdate: Date.now(),
      multiplier: 1.0
    };
    this.currentState = StreakState.INACTIVE;
    this.lastActivityTime = Date.now();

    await this.saveStreak();
    console.log('Streak reset');
  }
}

// Export singleton instance
export const streakManager = new StreakManager();

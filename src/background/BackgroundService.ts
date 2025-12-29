import { ActivityEvent, BrowsingContext } from '../types';
import { storageManager } from '../storage/StorageManager';
import { validateActivityEvent } from '../types/validators';
import { distractionPredictor } from '../models/DistractionPredictor';
import { challengeGenerator } from '../models/ChallengeGenerator';
import { dismissalAdaptation } from '../models/DismissalAdaptation';
import { feedbackService, FeedbackType } from '../models/FeedbackService';
import { streakManager } from '../models/StreakManager';
import { badgeManager } from './BadgeManager';
import { notificationManager } from './NotificationManager';
import { rewardSystem } from '../models/RewardSystem';
import { activityDetector } from '../models/ActivityDetector';
import { analyticsEngine } from '../models/AnalyticsEngine';
import { insightsEngine } from '../models/InsightsEngine';

/**
 * Message types for communication between content scripts and background
 */
export enum MessageType {
  ACTIVITY_EVENT = 'ACTIVITY_EVENT',
  GET_SETTINGS = 'GET_SETTINGS',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  GET_STREAK = 'GET_STREAK',
  GET_STATISTICS = 'GET_STATISTICS',
  CLASSIFY_SITE = 'CLASSIFY_SITE',
  TRIGGER_INTERVENTION = 'TRIGGER_INTERVENTION',
  INTERVENTION_RESPONSE = 'INTERVENTION_RESPONSE',
  GET_USER_PROGRESS = 'GET_USER_PROGRESS',
  GET_ACHIEVEMENTS = 'GET_ACHIEVEMENTS',
  PAUSE_INTERVENTIONS = 'PAUSE_INTERVENTIONS',
  RESUME_INTERVENTIONS = 'RESUME_INTERVENTIONS',
  GET_PAUSE_STATUS = 'GET_PAUSE_STATUS',
  GET_ANALYTICS = 'GET_ANALYTICS',
  GET_INSIGHTS = 'GET_INSIGHTS',
  GET_DAILY_STATS = 'GET_DAILY_STATS',
  EXPORT_DATA = 'EXPORT_DATA',
  DELETE_ALL_DATA = 'DELETE_ALL_DATA',
  IMPORT_DATA = 'IMPORT_DATA'
}

/**
 * Message structure for communication
 */
export interface Message {
  type: MessageType;
  payload?: any;
}

/**
 * Session state tracking
 */
interface SessionState {
  startTime: number;
  lastActivityTime: number;
  currentUrl: string | null;
  isActive: boolean;
  activityCount: number;
}

/**
 * Background Service manages the extension's core logic
 */
export class BackgroundService {
  private sessionState: SessionState;
  private activityQueue: ActivityEvent[];
  private processingQueue: boolean;

  constructor() {
    this.sessionState = {
      startTime: Date.now(),
      lastActivityTime: Date.now(),
      currentUrl: null,
      isActive: true,
      activityCount: 0
    };
    this.activityQueue = [];
    this.processingQueue = false;

    this.initialize();
  }

  /**
   * Initialize the background service
   */
  private initialize(): void {
    console.log('Digital Attention Rescue - Background Service initialized');

    // Set up message listeners
    this.setupMessageListeners();

    // Set up alarm for periodic tasks
    this.setupAlarms();

    // Initialize session
    this.initializeSession();
  }

  /**
   * Set up message listeners for communication with content scripts and popup
   */
  private setupMessageListeners(): void {
    chrome.runtime.onMessage.addListener(
      (message: Message, sender, sendResponse) => {
        this.handleMessage(message, sender)
          .then(response => sendResponse({ success: true, data: response }))
          .catch(error => sendResponse({ success: false, error: error.message }));
        
        // Return true to indicate async response
        return true;
      }
    );
  }

  /**
   * Handle incoming messages
   */
  private async handleMessage(message: Message, sender: chrome.runtime.MessageSender): Promise<any> {
    switch (message.type) {
      case MessageType.ACTIVITY_EVENT:
        return this.handleActivityEvent(message.payload as ActivityEvent, sender.tab?.id);

      case MessageType.GET_SETTINGS:
        return storageManager.getSettings();

      case MessageType.UPDATE_SETTINGS:
        return storageManager.saveSettings(message.payload);

      case MessageType.GET_STREAK:
        return storageManager.getCurrentStreak();

      case MessageType.GET_STATISTICS:
        return this.getStatistics(message.payload);

      case MessageType.CLASSIFY_SITE:
        return this.classifySite(message.payload.url);

      case MessageType.INTERVENTION_RESPONSE:
        return this.handleInterventionResponse(message.payload);

      case MessageType.GET_USER_PROGRESS:
        return rewardSystem.getUserProgress();

      case MessageType.GET_ACHIEVEMENTS:
        return {
          unlocked: await rewardSystem.getUnlockedAchievements(),
          locked: await rewardSystem.getLockedAchievements()
        };

      case MessageType.PAUSE_INTERVENTIONS:
        activityDetector.pause(message.payload?.durationMinutes || 60);
        return activityDetector.getPauseStatus();

      case MessageType.RESUME_INTERVENTIONS:
        activityDetector.resume();
        return activityDetector.getPauseStatus();

      case MessageType.GET_PAUSE_STATUS:
        return activityDetector.getPauseStatus();

      case MessageType.GET_ANALYTICS:
        return analyticsEngine.getStatistics(message.payload?.period || 'today');

      case MessageType.GET_INSIGHTS:
        return insightsEngine.generateInsights(message.payload?.period || 'week');

      case MessageType.GET_DAILY_STATS:
        return analyticsEngine.getDailyStatistics(message.payload?.date ? new Date(message.payload.date) : new Date());

      case MessageType.EXPORT_DATA:
        return storageManager.exportData();

      case MessageType.DELETE_ALL_DATA:
        await storageManager.deleteAllData();
        return { success: true };

      case MessageType.IMPORT_DATA:
        return this.handleImportData(message.payload);

      default:
        throw new Error(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle activity event from content script
   */
  private async handleActivityEvent(event: ActivityEvent, tabId?: number): Promise<void> {
    // Validate the event
    const validation = validateActivityEvent(event);
    if (!validation.valid) {
      console.error('Invalid activity event:', validation.errors);
      throw new Error(`Invalid activity event: ${validation.errors.join(', ')}`);
    }

    // Add to queue
    this.activityQueue.push(event);

    // Update session state
    this.updateSessionState(event);

    // Process queue
    await this.processActivityQueue();

    // Check if intervention is needed (only for navigation events)
    if (event.eventType === 'navigation' && tabId) {
      await this.checkForIntervention(event.context, tabId);
    }
  }

  /**
   * Update session state based on activity
   */
  private updateSessionState(event: ActivityEvent): void {
    this.sessionState.lastActivityTime = event.timestamp;
    this.sessionState.activityCount++;

    if (event.eventType === 'navigation') {
      this.sessionState.currentUrl = event.url;
    }

    // Mark session as active
    this.sessionState.isActive = true;
  }

  /**
   * Process queued activity events
   */
  private async processActivityQueue(): Promise<void> {
    // Prevent concurrent processing
    if (this.processingQueue || this.activityQueue.length === 0) {
      return;
    }

    this.processingQueue = true;

    try {
      // Process events in batches
      const batchSize = 10;
      while (this.activityQueue.length > 0) {
        const batch = this.activityQueue.splice(0, batchSize);
        
        for (const event of batch) {
          try {
            await storageManager.saveActivity(event);
          } catch (error) {
            console.error('Failed to save activity:', error);
            // Re-queue failed events
            this.activityQueue.unshift(event);
            break;
          }
        }
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Set up periodic alarms
   */
  private setupAlarms(): void {
    // Check for inactive sessions every 5 minutes
    chrome.alarms.create('checkInactivity', { periodInMinutes: 5 });

    // Prune old data daily
    chrome.alarms.create('pruneData', { periodInMinutes: 24 * 60 });

    // Listen for alarms
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });
  }

  /**
   * Handle alarm events
   */
  private async handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
    switch (alarm.name) {
      case 'checkInactivity':
        await this.checkInactivity();
        await streakManager.checkInactivity();
        break;

      case 'pruneData':
        await this.pruneOldData();
        break;
    }
  }

  /**
   * Check for inactive sessions
   */
  private async checkInactivity(): Promise<void> {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    if (now - this.sessionState.lastActivityTime > inactiveThreshold) {
      this.sessionState.isActive = false;
      console.log('Session marked as inactive');
    }
  }

  /**
   * Prune old data from storage
   */
  private async pruneOldData(): Promise<void> {
    try {
      await storageManager.pruneOldData();
      console.log('Old data pruned successfully');
    } catch (error) {
      console.error('Failed to prune old data:', error);
    }
  }

  /**
   * Initialize session on startup
   */
  private async initializeSession(): Promise<void> {
    try {
      // Load settings
      const settings = await storageManager.getSettings();
      console.log('Settings loaded:', settings);

      // Load current streak
      const streak = await storageManager.getCurrentStreak();
      console.log('Current streak:', streak.current);

      // Update badge with streak
      await badgeManager.updateStreakBadge(streak);

      // Set up streak event listeners
      streakManager.addEventListener(async (event) => {
        const currentStreak = await streakManager.getCurrentStreak();
        await badgeManager.updateStreakBadge(currentStreak);

        if (event.type === 'milestone') {
          await notificationManager.showMilestone(event.streakValue);
          await badgeManager.animateMilestone(event.streakValue);
          // Award points for streak milestone
          await rewardSystem.awardStreakMilestone(event.streakValue);
        } else if (event.isPersonalBest) {
          await notificationManager.showPersonalBest(event.streakValue);
          // Award points for personal best
          await rewardSystem.awardPersonalBest();
        } else if (event.type === 'break') {
          await notificationManager.showStreakBroken(event.streakValue);
        }
      });

      // Check storage usage
      const storageInfo = await storageManager.getStorageInfo();
      const usagePercent = (storageInfo.bytesInUse / storageInfo.quota) * 100;
      console.log(`Storage usage: ${usagePercent.toFixed(2)}%`);

      // Warn if storage is getting full
      if (usagePercent > 80) {
        console.warn('Storage usage is above 80%, consider pruning data');
        await this.pruneOldData();
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  /**
   * Get statistics for a time range
   */
  private async getStatistics(timeRange?: { start: number; end: number }): Promise<any> {
    const range = timeRange || {
      start: Date.now() - (24 * 60 * 60 * 1000), // Last 24 hours
      end: Date.now()
    };

    const history = await storageManager.getHistory(range);

    const productiveMinutes = history
      .filter(h => h.wasProductive)
      .reduce((sum, h) => sum + h.duration, 0);

    const distractedMinutes = history
      .filter(h => !h.wasProductive)
      .reduce((sum, h) => sum + h.duration, 0);

    const interventionsTriggered = history.filter(h => h.interventionTriggered).length;
    const interventionsCompleted = history.filter(h => h.interventionCompleted).length;

    return {
      productiveMinutes,
      distractedMinutes,
      interventionsTriggered,
      interventionsCompleted,
      totalSites: history.length
    };
  }

  /**
   * Classify a site
   */
  private async classifySite(url: string): Promise<any> {
    // Check if we have a stored classification
    const classification = await storageManager.getSiteClassification(url);
    
    if (classification) {
      return classification;
    }

    // Return a default classification for now
    // This will be enhanced with AI model in later tasks
    return {
      url,
      category: 'neutral',
      confidence: 0.5,
      source: 'default',
      lastUpdated: Date.now()
    };
  }

  /**
   * Get current session state
   */
  public getSessionState(): SessionState {
    return { ...this.sessionState };
  }

  /**
   * Get session duration in minutes
   */
  public getSessionDuration(): number {
    return Math.floor((Date.now() - this.sessionState.startTime) / (60 * 1000));
  }

  /**
   * Check if session is active
   */
  public isSessionActive(): boolean {
    return this.sessionState.isActive;
  }

  /**
   * Check if intervention is needed for current context
   */
  private async checkForIntervention(context: BrowsingContext, tabId: number): Promise<void> {
    try {
      // Evaluate distraction
      const assessment = await distractionPredictor.evaluateDistraction(context);

      if (assessment.isDistraction && assessment.suggestedChallenge) {
        // Record intervention
        distractionPredictor.recordIntervention(context.url);

        // Send intervention to content script
        await chrome.tabs.sendMessage(tabId, {
          type: MessageType.TRIGGER_INTERVENTION,
          payload: {
            challenge: assessment.suggestedChallenge,
            reason: assessment.reason
          }
        });

        console.log(`Intervention triggered for ${context.url}: ${assessment.reason}`);
      }
    } catch (error) {
      console.error('Failed to check for intervention:', error);
    }
  }

  /**
   * Handle intervention response from user
   */
  private async handleInterventionResponse(response: any): Promise<void> {
    const { interventionResponse, url, context } = response;

    if (interventionResponse.completed) {
      // User completed the challenge
      distractionPredictor.recordCompletion(url);
      challengeGenerator.adjustDifficulty(true);
      dismissalAdaptation.recordCompletion(url);
      
      // Record productive activity for streak
      await streakManager.recordProductiveActivity();
      
      // Award points for intervention completion
      const pointsAwarded = await rewardSystem.awardInterventionPoints();
      console.log(`Awarded ${pointsAwarded} points for intervention completion`);
      
      // Provide feedback to learning system
      await feedbackService.processFeedback({
        type: FeedbackType.INTERVENTION_COMPLETED,
        url,
        timestamp: Date.now(),
        context
      });
      
      console.log('Intervention completed successfully');
    } else if (interventionResponse.dismissed) {
      // User dismissed the challenge
      distractionPredictor.recordDismissal(url);
      challengeGenerator.adjustDifficulty(false);
      dismissalAdaptation.recordDismissal(url, context);
      
      // Record distraction for streak
      await streakManager.recordDistraction();
      
      // Provide feedback to learning system
      await feedbackService.processFeedback({
        type: FeedbackType.INTERVENTION_DISMISSED,
        url,
        timestamp: Date.now(),
        context,
        metadata: {
          dismissalCount: dismissalAdaptation.getDismissalCount(url)
        }
      });
      
      console.log(`Intervention dismissed (${dismissalAdaptation.getDismissalCount(url)} times for this URL)`);
      
      // Check if we should suggest whitelist
      if (dismissalAdaptation.isHighDismissalRate()) {
        const suggestions = await dismissalAdaptation.suggestWhitelistAdditions();
        if (suggestions.length > 0) {
          console.log('Consider whitelisting:', suggestions);
          await notificationManager.showWhitelistSuggestion(suggestions);
        }
      }
    }
  }

  /**
   * Handle data import
   */
  private async handleImportData(data: any): Promise<{ success: boolean; message: string }> {
    try {
      // Validate import data structure
      if (!data || typeof data !== 'object') {
        return { success: false, message: 'Invalid import data format' };
      }

      // Import settings if present
      if (data.settings) {
        await storageManager.saveSettings(data.settings);
      }

      // Import streak if present
      if (data.streak) {
        await storageManager.saveStreak(data.streak);
      }

      // Import classifications if present
      if (data.classifications && typeof data.classifications === 'object') {
        for (const [url, classification] of Object.entries(data.classifications)) {
          await storageManager.saveSiteClassification(url, classification as any);
        }
      }

      console.log('Data imported successfully');
      return { success: true, message: 'Data imported successfully' };
    } catch (error) {
      console.error('Failed to import data:', error);
      return { success: false, message: 'Failed to import data' };
    }
  }
}

// Create singleton instance
export const backgroundService = new BackgroundService();

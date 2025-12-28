import { BrowsingContext, BrowsingHistory } from '../types';
import { aiModelEngine, UserFeedback } from './AIModelEngine';
import { classificationManager } from './ClassificationManager';
import { storageManager } from '../storage/StorageManager';

/**
 * Feedback type for user interactions
 */
export enum FeedbackType {
  MANUAL_CLASSIFICATION = 'manual_classification',
  INTERVENTION_COMPLETED = 'intervention_completed',
  INTERVENTION_DISMISSED = 'intervention_dismissed',
  SESSION_PRODUCTIVE = 'session_productive',
  SESSION_DISTRACTED = 'session_distracted'
}

/**
 * Feedback event
 */
export interface FeedbackEvent {
  type: FeedbackType;
  url: string;
  timestamp: number;
  context: BrowsingContext;
  metadata?: any;
}

/**
 * Feedback Service manages learning from user behavior
 */
export class FeedbackService {
  /**
   * Process user feedback and update models
   */
  public async processFeedback(event: FeedbackEvent): Promise<void> {
    console.log(`Processing feedback: ${event.type} for ${event.url}`);

    switch (event.type) {
      case FeedbackType.MANUAL_CLASSIFICATION:
        await this.handleManualClassification(event);
        break;

      case FeedbackType.INTERVENTION_COMPLETED:
        await this.handleInterventionCompleted(event);
        break;

      case FeedbackType.INTERVENTION_DISMISSED:
        await this.handleInterventionDismissed(event);
        break;

      case FeedbackType.SESSION_PRODUCTIVE:
        await this.handleProductiveSession(event);
        break;

      case FeedbackType.SESSION_DISTRACTED:
        await this.handleDistractedSession(event);
        break;
    }
  }

  /**
   * Handle manual site classification by user
   */
  private async handleManualClassification(event: FeedbackEvent): Promise<void> {
    const { category, applyToDomain } = event.metadata || {};

    if (!category) {
      console.error('Manual classification missing category');
      return;
    }

    // Save user classification
    if (applyToDomain) {
      await classificationManager.saveDomainClassification(event.url, category);
    } else {
      await classificationManager.saveUserClassification(event.url, category);
    }

    // Provide feedback to AI model
    const wasDistraction = category === 'distraction';
    const feedback: UserFeedback = {
      url: event.url,
      wasDistraction,
      timestamp: event.timestamp,
      context: event.context
    };

    aiModelEngine.updateWithFeedback(feedback);
  }

  /**
   * Handle intervention completion (user acknowledged distraction)
   */
  private async handleInterventionCompleted(event: FeedbackEvent): Promise<void> {
    // User completed intervention = confirmed distraction
    const feedback: UserFeedback = {
      url: event.url,
      wasDistraction: true,
      timestamp: event.timestamp,
      context: event.context
    };

    aiModelEngine.updateWithFeedback(feedback);

    // Update classification
    await classificationManager.updateFromBehavior(event.url, false, event.context);
  }

  /**
   * Handle intervention dismissal (user rejected distraction label)
   */
  private async handleInterventionDismissed(event: FeedbackEvent): Promise<void> {
    // User dismissed intervention = possibly not a distraction
    // Weight this feedback less heavily (50% confidence)
    const dismissalCount = event.metadata?.dismissalCount || 1;

    // If user repeatedly dismisses, it's likely productive
    if (dismissalCount >= 3) {
      const feedback: UserFeedback = {
        url: event.url,
        wasDistraction: false,
        timestamp: event.timestamp,
        context: event.context
      };

      aiModelEngine.updateWithFeedback(feedback);
      await classificationManager.updateFromBehavior(event.url, true, event.context);
    }
  }

  /**
   * Handle productive session feedback
   */
  private async handleProductiveSession(event: FeedbackEvent): Promise<void> {
    const feedback: UserFeedback = {
      url: event.url,
      wasDistraction: false,
      timestamp: event.timestamp,
      context: event.context
    };

    aiModelEngine.updateWithFeedback(feedback);
    await classificationManager.updateFromBehavior(event.url, true, event.context);
  }

  /**
   * Handle distracted session feedback
   */
  private async handleDistractedSession(event: FeedbackEvent): Promise<void> {
    const feedback: UserFeedback = {
      url: event.url,
      wasDistraction: true,
      timestamp: event.timestamp,
      context: event.context
    };

    aiModelEngine.updateWithFeedback(feedback);
    await classificationManager.updateFromBehavior(event.url, false, event.context);
  }

  /**
   * Learn from browsing history
   */
  public async learnFromHistory(timeRange: { start: number; end: number }): Promise<void> {
    const history = await storageManager.getHistory(timeRange);

    console.log(`Learning from ${history.length} history entries`);

    for (const entry of history) {
      // Skip entries without clear productivity signal
      if (entry.interventionTriggered === false && entry.wasProductive === false) {
        continue;
      }

      const feedback: UserFeedback = {
        url: entry.url,
        wasDistraction: !entry.wasProductive,
        timestamp: entry.startTime,
        context: {
          url: entry.url,
          title: entry.title,
          timestamp: entry.startTime,
          timeOfDay: new Date(entry.startTime).getHours(),
          dayOfWeek: new Date(entry.startTime).getDay(),
          recentHistory: [],
          sessionDuration: entry.duration,
          lastProductiveActivity: 0
        }
      };

      aiModelEngine.updateWithFeedback(feedback);
    }

    console.log('History learning complete');
  }

  /**
   * Batch process multiple feedback events
   */
  public async batchProcess(events: FeedbackEvent[]): Promise<void> {
    console.log(`Batch processing ${events.length} feedback events`);

    for (const event of events) {
      try {
        await this.processFeedback(event);
      } catch (error) {
        console.error(`Failed to process feedback event:`, error);
      }
    }
  }

  /**
   * Get feedback statistics
   */
  public getFeedbackStats(): {
    totalFeedback: number;
    distractionFeedback: number;
    productiveFeedback: number;
  } {
    const history = aiModelEngine.getFeedbackHistory();

    return {
      totalFeedback: history.length,
      distractionFeedback: history.filter(f => f.wasDistraction).length,
      productiveFeedback: history.filter(f => !f.wasDistraction).length
    };
  }

  /**
   * Export feedback history
   */
  public exportFeedback(): UserFeedback[] {
    return aiModelEngine.getFeedbackHistory();
  }

  /**
   * Import feedback history for training
   */
  public async importFeedback(feedback: UserFeedback[]): Promise<void> {
    await aiModelEngine.train(feedback);
    console.log(`Imported and trained on ${feedback.length} feedback items`);
  }
}

// Export singleton instance
export const feedbackService = new FeedbackService();

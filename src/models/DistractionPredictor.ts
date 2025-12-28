import { BrowsingContext, DistractionAssessment, MicroChallenge, UserSettings } from '../types';
import { aiModelEngine } from './AIModelEngine';
import { classificationManager } from './ClassificationManager';
import { settingsManager } from './SettingsManager';
import { challengeGenerator } from './ChallengeGenerator';
import { activityDetector } from './ActivityDetector';
import { isWorkHours, isLateNight, detectRabbitHole } from '../utils/contextExtractor';

/**
 * Distraction threshold configuration
 */
interface ThresholdConfig {
  aggressive: number;
  moderate: number;
  minimal: number;
}

const DISTRACTION_THRESHOLDS: ThresholdConfig = {
  aggressive: 0.4,  // Trigger at 40% confidence
  moderate: 0.6,    // Trigger at 60% confidence
  minimal: 0.8      // Trigger at 80% confidence
};

/**
 * Distraction Predictor evaluates browsing and determines intervention needs
 */
export class DistractionPredictor {
  private lastInterventionTime: number = 0;
  private interventionCooldown: number = 5 * 60 * 1000; // 5 minutes
  private consecutiveDismissals: Map<string, number> = new Map();

  /**
   * Evaluate if current browsing is a distraction
   */
  public async evaluateDistraction(context: BrowsingContext): Promise<DistractionAssessment> {
    // Check if interventions should be paused (video calls, presentations, manual pause)
    if (activityDetector.shouldPauseInterventions(context.url)) {
      const status = activityDetector.getPauseStatus();
      return {
        isDistraction: false,
        confidence: 0,
        reason: status.reason
      };
    }

    // Get user settings
    const settings = await settingsManager.getSettings();

    // Check if we're in quiet hours
    if (await settingsManager.isInQuietHours()) {
      return {
        isDistraction: false,
        confidence: 0,
        reason: 'Quiet hours - interventions disabled'
      };
    }

    // Check if site is whitelisted
    if (await settingsManager.isWhitelisted(context.url)) {
      return {
        isDistraction: false,
        confidence: 0,
        reason: 'Site is whitelisted'
      };
    }

    // Check if we're in learning mode
    if (settings.learningMode) {
      return {
        isDistraction: false,
        confidence: 0,
        reason: 'Learning mode - observing behavior'
      };
    }

    // Check intervention cooldown
    if (this.isInCooldown()) {
      return {
        isDistraction: false,
        confidence: 0,
        reason: 'Intervention cooldown active'
      };
    }

    // Get AI prediction
    const prediction = aiModelEngine.predict(context);

    // Get site classification
    const classification = await classificationManager.getClassification(context.url, context);

    // Calculate combined distraction score
    const distractionScore = this.calculateDistractionScore(
      prediction.confidence,
      classification,
      context
    );

    // Get threshold based on user settings
    const threshold = DISTRACTION_THRESHOLDS[settings.interventionFrequency];

    // Determine if intervention is needed
    const isDistraction = distractionScore >= threshold;

    // Generate reason
    const reason = this.generateReason(prediction, classification, context, distractionScore);

    // Generate suggested challenge if distraction detected
    let suggestedChallenge: MicroChallenge | undefined;
    if (isDistraction) {
      // Use ChallengeGenerator with preferred challenges
      suggestedChallenge = challengeGenerator.generateChallenge(context, settings.preferredChallenges);
    }

    return {
      isDistraction,
      confidence: distractionScore,
      reason,
      suggestedChallenge
    };
  }

  /**
   * Calculate combined distraction score from multiple signals
   */
  private calculateDistractionScore(
    aiConfidence: number,
    classification: any,
    context: BrowsingContext
  ): number {
    let score = 0;
    let weight = 0;

    // AI model prediction (weight: 0.4)
    score += aiConfidence * 0.4;
    weight += 0.4;

    // Site classification (weight: 0.3)
    if (classification.category === 'distraction') {
      score += classification.confidence * 0.3;
    } else if (classification.category === 'productive') {
      score += (1 - classification.confidence) * 0.3;
    } else {
      score += 0.5 * 0.3; // Neutral
    }
    weight += 0.3;

    // Contextual factors (weight: 0.3)
    let contextScore = 0;

    // Rabbit hole detection
    if (detectRabbitHole(context.recentHistory, context.sessionDuration)) {
      contextScore += 0.4;
    }

    // Late night browsing
    if (isLateNight(context.timestamp)) {
      contextScore += 0.3;
    }

    // Long session without productivity
    if (context.sessionDuration > 60 && context.lastProductiveActivity > 30) {
      contextScore += 0.3;
    }

    score += contextScore * 0.3;
    weight += 0.3;

    // Normalize
    return weight > 0 ? score / weight : 0;
  }

  /**
   * Generate human-readable reason for assessment
   */
  private generateReason(
    prediction: any,
    classification: any,
    context: BrowsingContext,
    score: number
  ): string {
    const reasons: string[] = [];

    if (classification.category === 'distraction') {
      reasons.push(`Site classified as distraction (${Math.round(classification.confidence * 100)}% confidence)`);
    }

    if (detectRabbitHole(context.recentHistory, context.sessionDuration)) {
      reasons.push('Rapid navigation pattern detected');
    }

    if (isLateNight(context.timestamp)) {
      reasons.push('Late night browsing');
    }

    if (context.sessionDuration > 60 && context.lastProductiveActivity > 30) {
      reasons.push('Extended session without productive activity');
    }

    if (prediction.confidence > 0.7) {
      reasons.push('AI model high confidence distraction');
    }

    if (reasons.length === 0) {
      return `Distraction score: ${Math.round(score * 100)}%`;
    }

    return reasons.join('; ');
  }

  /**
   * Check if intervention is in cooldown period
   */
  private isInCooldown(): boolean {
    const now = Date.now();
    return (now - this.lastInterventionTime) < this.interventionCooldown;
  }

  /**
   * Record intervention trigger
   */
  public recordIntervention(url: string): void {
    this.lastInterventionTime = Date.now();
  }

  /**
   * Record intervention dismissal
   */
  public recordDismissal(url: string): void {
    const count = this.consecutiveDismissals.get(url) || 0;
    this.consecutiveDismissals.set(url, count + 1);

    // If user dismisses 3+ times, increase cooldown
    if (count >= 2) {
      this.interventionCooldown = 15 * 60 * 1000; // 15 minutes
      console.log('Increased intervention cooldown due to repeated dismissals');
    }
  }

  /**
   * Record intervention completion
   */
  public recordCompletion(url: string): void {
    // Reset dismissal count on completion
    this.consecutiveDismissals.delete(url);
    
    // Reset cooldown to normal
    this.interventionCooldown = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get consecutive dismissal count for URL
   */
  public getDismissalCount(url: string): number {
    return this.consecutiveDismissals.get(url) || 0;
  }

  /**
   * Reset cooldown and dismissal tracking
   */
  public reset(): void {
    this.lastInterventionTime = 0;
    this.interventionCooldown = 5 * 60 * 1000;
    this.consecutiveDismissals.clear();
  }

  /**
   * Get predictor statistics
   */
  public getStatistics(): {
    lastInterventionTime: number;
    cooldownRemaining: number;
    totalDismissals: number;
  } {
    const now = Date.now();
    const cooldownRemaining = Math.max(0, this.interventionCooldown - (now - this.lastInterventionTime));
    
    let totalDismissals = 0;
    this.consecutiveDismissals.forEach(count => {
      totalDismissals += count;
    });

    return {
      lastInterventionTime: this.lastInterventionTime,
      cooldownRemaining,
      totalDismissals
    };
  }
}

// Export singleton instance
export const distractionPredictor = new DistractionPredictor();

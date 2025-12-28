import { BrowsingContext, FeatureVector, Prediction, SiteClassification } from '../types';
import { 
  categorizeUrl, 
  isWorkHours, 
  isLateNight,
  analyzeNavigationPattern,
  detectRabbitHole 
} from '../utils/contextExtractor';

/**
 * User feedback for model training
 */
export interface UserFeedback {
  url: string;
  wasDistraction: boolean;
  timestamp: number;
  context: BrowsingContext;
}

/**
 * AI Model Engine for learning browsing patterns and predicting distractions
 */
export class AIModelEngine {
  private feedbackHistory: UserFeedback[] = [];
  private modelWeights: Map<string, number> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.initializeModel();
  }

  /**
   * Initialize the model with default weights
   */
  private initializeModel(): void {
    // Initialize default feature weights
    // These will be adjusted based on user feedback
    this.modelWeights.set('late_night', 0.3);
    this.modelWeights.set('work_hours', -0.2);
    this.modelWeights.set('social_media', 0.4);
    this.modelWeights.set('video_streaming', 0.5);
    this.modelWeights.set('news', 0.2);
    this.modelWeights.set('productivity', -0.5);
    this.modelWeights.set('domain_hopping', 0.3);
    this.modelWeights.set('rabbit_hole', 0.6);
    this.modelWeights.set('long_session', 0.2);
    this.modelWeights.set('recent_distraction', 0.4);

    this.initialized = true;
    console.log('AI Model Engine initialized with default weights');
  }

  /**
   * Extract features from browsing context
   */
  public extractFeatures(context: BrowsingContext): FeatureVector {
    const category = categorizeUrl(context.url);
    const navigationPattern = analyzeNavigationPattern(context.recentHistory);

    return {
      timeOfDay: context.timeOfDay,
      dayOfWeek: context.dayOfWeek,
      recentProductiveMinutes: context.lastProductiveActivity,
      siteCategory: category,
      navigationPattern: navigationPattern,
      sessionDuration: context.sessionDuration
    };
  }

  /**
   * Predict if current browsing is a distraction
   */
  public predict(context: BrowsingContext): Prediction {
    const features = this.extractFeatures(context);
    
    // Calculate distraction score based on features
    let score = 0;
    let featureCount = 0;

    // Time-based features
    if (isLateNight(context.timestamp)) {
      score += this.modelWeights.get('late_night') || 0;
      featureCount++;
    }

    if (isWorkHours(context.timestamp)) {
      score += this.modelWeights.get('work_hours') || 0;
      featureCount++;
    }

    // Category-based features
    const categoryWeight = this.modelWeights.get(features.siteCategory) || 0;
    score += categoryWeight;
    featureCount++;

    // Navigation pattern features
    if (features.navigationPattern === 'domain-hopping') {
      score += this.modelWeights.get('domain_hopping') || 0;
      featureCount++;
    }

    // Rabbit hole detection
    if (detectRabbitHole(context.recentHistory, context.sessionDuration)) {
      score += this.modelWeights.get('rabbit_hole') || 0;
      featureCount++;
    }

    // Long session without productivity
    if (context.sessionDuration > 60 && context.lastProductiveActivity > 30) {
      score += this.modelWeights.get('long_session') || 0;
      featureCount++;
    }

    // Recent distraction pattern
    if (context.lastProductiveActivity > 15) {
      score += this.modelWeights.get('recent_distraction') || 0;
      featureCount++;
    }

    // Normalize score to 0-1 range (confidence)
    const normalizedScore = this.sigmoid(score);
    
    // Threshold for distraction classification
    const threshold = 0.5;
    const isDistraction = normalizedScore > threshold;

    return {
      isDistraction,
      confidence: normalizedScore,
      features
    };
  }

  /**
   * Update model with user feedback
   */
  public updateWithFeedback(feedback: UserFeedback): void {
    // Store feedback
    this.feedbackHistory.push(feedback);

    // Keep only recent feedback (last 100 items)
    if (this.feedbackHistory.length > 100) {
      this.feedbackHistory.shift();
    }

    // Extract features from feedback context
    const features = this.extractFeatures(feedback.context);
    const category = features.siteCategory;

    // Adjust weights based on feedback
    const learningRate = 0.1;
    const adjustment = feedback.wasDistraction ? learningRate : -learningRate;

    // Update category weight
    const currentWeight = this.modelWeights.get(category) || 0;
    this.modelWeights.set(category, currentWeight + adjustment);

    // Update time-based weights
    if (isLateNight(feedback.timestamp)) {
      const lateNightWeight = this.modelWeights.get('late_night') || 0;
      this.modelWeights.set('late_night', lateNightWeight + adjustment);
    }

    if (isWorkHours(feedback.timestamp)) {
      const workHoursWeight = this.modelWeights.get('work_hours') || 0;
      this.modelWeights.set('work_hours', workHoursWeight + adjustment);
    }

    // Update navigation pattern weights
    if (features.navigationPattern === 'domain-hopping') {
      const hoppingWeight = this.modelWeights.get('domain_hopping') || 0;
      this.modelWeights.set('domain_hopping', hoppingWeight + adjustment);
    }

    console.log(`Model updated with feedback for ${feedback.url}: ${feedback.wasDistraction ? 'distraction' : 'productive'}`);
  }

  /**
   * Classify a site based on patterns
   */
  public classifySite(url: string, context: BrowsingContext): SiteClassification {
    const prediction = this.predict(context);
    const category = prediction.isDistraction ? 'distraction' : 'productive';

    return {
      url,
      category,
      confidence: prediction.confidence,
      source: 'ai',
      lastUpdated: Date.now()
    };
  }

  /**
   * Train model on historical data (batch training)
   */
  public async train(feedbackData: UserFeedback[]): Promise<void> {
    console.log(`Training model on ${feedbackData.length} feedback items`);

    for (const feedback of feedbackData) {
      this.updateWithFeedback(feedback);
    }

    console.log('Model training complete');
  }

  /**
   * Get model weights (for debugging/export)
   */
  public getWeights(): Map<string, number> {
    return new Map(this.modelWeights);
  }

  /**
   * Set model weights (for import/restore)
   */
  public setWeights(weights: Map<string, number>): void {
    this.modelWeights = new Map(weights);
  }

  /**
   * Reset model to default weights
   */
  public reset(): void {
    this.modelWeights.clear();
    this.feedbackHistory = [];
    this.initializeModel();
    console.log('Model reset to default weights');
  }

  /**
   * Get feedback history
   */
  public getFeedbackHistory(): UserFeedback[] {
    return [...this.feedbackHistory];
  }

  /**
   * Sigmoid activation function for normalization
   */
  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-x));
  }

  /**
   * Check if model is initialized
   */
  public isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get model statistics
   */
  public getStatistics(): {
    feedbackCount: number;
    weightCount: number;
    averageConfidence: number;
  } {
    // Calculate average confidence from recent predictions
    const recentPredictions = this.feedbackHistory.slice(-20);
    const avgConfidence = recentPredictions.length > 0
      ? recentPredictions.reduce((sum, fb) => {
          const pred = this.predict(fb.context);
          return sum + pred.confidence;
        }, 0) / recentPredictions.length
      : 0.5;

    return {
      feedbackCount: this.feedbackHistory.length,
      weightCount: this.modelWeights.size,
      averageConfidence: avgConfidence
    };
  }
}

// Export singleton instance
export const aiModelEngine = new AIModelEngine();

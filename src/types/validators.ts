import {
  ActivityEvent,
  BrowsingContext,
  BrowsingHistory,
  SiteClassification,
  UserSettings,
  StreakData,
  MicroChallenge,
  InterventionResponse,
  TimeRange,
  ChallengeType,
  FeatureVector,
  Prediction,
  DistractionAssessment
} from './index';

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate timestamp (must be positive and not in far future)
 */
export function isValidTimestamp(timestamp: number): boolean {
  const now = Date.now();
  const oneYearFromNow = now + (365 * 24 * 60 * 60 * 1000);
  return timestamp > 0 && timestamp <= oneYearFromNow;
}

/**
 * Validate hour (0-23)
 */
export function isValidHour(hour: number): boolean {
  return Number.isInteger(hour) && hour >= 0 && hour <= 23;
}

/**
 * Validate day of week (0-6)
 */
export function isValidDayOfWeek(day: number): boolean {
  return Number.isInteger(day) && day >= 0 && day <= 6;
}

/**
 * Validate confidence score (0-1)
 */
export function isValidConfidence(confidence: number): boolean {
  return confidence >= 0 && confidence <= 1;
}

/**
 * Validate BrowsingContext
 */
export function validateBrowsingContext(context: BrowsingContext): ValidationResult {
  const errors: string[] = [];

  if (!isValidUrl(context.url)) {
    errors.push('Invalid URL');
  }

  if (!context.title || context.title.trim().length === 0) {
    errors.push('Title cannot be empty');
  }

  if (!isValidTimestamp(context.timestamp)) {
    errors.push('Invalid timestamp');
  }

  if (!isValidHour(context.timeOfDay)) {
    errors.push('Invalid time of day (must be 0-23)');
  }

  if (!isValidDayOfWeek(context.dayOfWeek)) {
    errors.push('Invalid day of week (must be 0-6)');
  }

  if (!Array.isArray(context.recentHistory)) {
    errors.push('Recent history must be an array');
  } else {
    context.recentHistory.forEach((url, index) => {
      if (!isValidUrl(url)) {
        errors.push(`Invalid URL in recent history at index ${index}`);
      }
    });
  }

  if (context.sessionDuration < 0) {
    errors.push('Session duration cannot be negative');
  }

  if (context.lastProductiveActivity < 0) {
    errors.push('Last productive activity cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate ActivityEvent
 */
export function validateActivityEvent(event: ActivityEvent): ValidationResult {
  const errors: string[] = [];

  if (!isValidUrl(event.url)) {
    errors.push('Invalid URL');
  }

  if (!isValidTimestamp(event.timestamp)) {
    errors.push('Invalid timestamp');
  }

  const validEventTypes = ['navigation', 'focus', 'blur', 'scroll', 'click'];
  if (!validEventTypes.includes(event.eventType)) {
    errors.push(`Invalid event type (must be one of: ${validEventTypes.join(', ')})`);
  }

  if (event.duration !== undefined && event.duration < 0) {
    errors.push('Duration cannot be negative');
  }

  const contextValidation = validateBrowsingContext(event.context);
  if (!contextValidation.valid) {
    errors.push(...contextValidation.errors.map(e => `Context: ${e}`));
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate SiteClassification
 */
export function validateSiteClassification(classification: SiteClassification): ValidationResult {
  const errors: string[] = [];

  if (!isValidUrl(classification.url)) {
    errors.push('Invalid URL');
  }

  const validCategories = ['productive', 'distraction', 'neutral', 'custom'];
  if (!validCategories.includes(classification.category)) {
    errors.push(`Invalid category (must be one of: ${validCategories.join(', ')})`);
  }

  if (!isValidConfidence(classification.confidence)) {
    errors.push('Confidence must be between 0 and 1');
  }

  const validSources = ['user', 'ai', 'default'];
  if (!validSources.includes(classification.source)) {
    errors.push(`Invalid source (must be one of: ${validSources.join(', ')})`);
  }

  if (classification.category === 'custom' && !classification.customLabel) {
    errors.push('Custom category requires a custom label');
  }

  if (!isValidTimestamp(classification.lastUpdated)) {
    errors.push('Invalid last updated timestamp');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate TimeRange
 */
export function validateTimeRange(range: TimeRange): ValidationResult {
  const errors: string[] = [];

  if (!isValidHour(range.start)) {
    errors.push('Invalid start hour (must be 0-23)');
  }

  if (!isValidHour(range.end)) {
    errors.push('Invalid end hour (must be 0-23)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate UserSettings
 */
export function validateUserSettings(settings: UserSettings): ValidationResult {
  const errors: string[] = [];

  const validFrequencies = ['aggressive', 'moderate', 'minimal'];
  if (!validFrequencies.includes(settings.interventionFrequency)) {
    errors.push(`Invalid intervention frequency (must be one of: ${validFrequencies.join(', ')})`);
  }

  if (!Array.isArray(settings.quietHours)) {
    errors.push('Quiet hours must be an array');
  } else {
    settings.quietHours.forEach((range, index) => {
      const rangeValidation = validateTimeRange(range);
      if (!rangeValidation.valid) {
        errors.push(...rangeValidation.errors.map(e => `Quiet hours[${index}]: ${e}`));
      }
    });
  }

  if (!Array.isArray(settings.whitelistedSites)) {
    errors.push('Whitelisted sites must be an array');
  } else {
    settings.whitelistedSites.forEach((url, index) => {
      if (!isValidUrl(url)) {
        errors.push(`Invalid URL in whitelisted sites at index ${index}`);
      }
    });
  }

  const validChallengeTypes: ChallengeType[] = ['reflection', 'intention', 'quick-task', 'breathing'];
  if (!Array.isArray(settings.preferredChallenges)) {
    errors.push('Preferred challenges must be an array');
  } else {
    settings.preferredChallenges.forEach((type, index) => {
      if (!validChallengeTypes.includes(type)) {
        errors.push(`Invalid challenge type at index ${index} (must be one of: ${validChallengeTypes.join(', ')})`);
      }
    });
  }

  if (typeof settings.learningMode !== 'boolean') {
    errors.push('Learning mode must be a boolean');
  }

  if (typeof settings.notificationsEnabled !== 'boolean') {
    errors.push('Notifications enabled must be a boolean');
  }

  if (!Number.isInteger(settings.streakGoal) || settings.streakGoal < 1) {
    errors.push('Streak goal must be a positive integer');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate StreakData
 */
export function validateStreakData(streak: StreakData): ValidationResult {
  const errors: string[] = [];

  if (!Number.isInteger(streak.current) || streak.current < 0) {
    errors.push('Current streak must be a non-negative integer');
  }

  if (!Number.isInteger(streak.longest) || streak.longest < 0) {
    errors.push('Longest streak must be a non-negative integer');
  }

  if (streak.current > streak.longest) {
    errors.push('Current streak cannot exceed longest streak');
  }

  if (!isValidTimestamp(streak.lastUpdate)) {
    errors.push('Invalid last update timestamp');
  }

  if (streak.multiplier < 1.0) {
    errors.push('Multiplier must be at least 1.0');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate MicroChallenge
 */
export function validateMicroChallenge(challenge: MicroChallenge): ValidationResult {
  const errors: string[] = [];

  if (!challenge.id || challenge.id.trim().length === 0) {
    errors.push('Challenge ID cannot be empty');
  }

  const validTypes: ChallengeType[] = ['reflection', 'intention', 'quick-task', 'breathing'];
  if (!validTypes.includes(challenge.type)) {
    errors.push(`Invalid challenge type (must be one of: ${validTypes.join(', ')})`);
  }

  if (!challenge.prompt || challenge.prompt.trim().length === 0) {
    errors.push('Challenge prompt cannot be empty');
  }

  if (challenge.options !== undefined) {
    if (!Array.isArray(challenge.options)) {
      errors.push('Challenge options must be an array');
    } else if (challenge.options.length === 0) {
      errors.push('Challenge options array cannot be empty if provided');
    }
  }

  if (!Number.isInteger(challenge.timeoutSeconds) || challenge.timeoutSeconds <= 0) {
    errors.push('Timeout must be a positive integer');
  }

  if (!Number.isInteger(challenge.difficulty) || challenge.difficulty < 1 || challenge.difficulty > 5) {
    errors.push('Difficulty must be an integer between 1 and 5');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate InterventionResponse
 */
export function validateInterventionResponse(response: InterventionResponse): ValidationResult {
  const errors: string[] = [];

  if (!response.challengeId || response.challengeId.trim().length === 0) {
    errors.push('Challenge ID cannot be empty');
  }

  if (typeof response.completed !== 'boolean') {
    errors.push('Completed must be a boolean');
  }

  if (typeof response.dismissed !== 'boolean') {
    errors.push('Dismissed must be a boolean');
  }

  if (response.completed && response.dismissed) {
    errors.push('Response cannot be both completed and dismissed');
  }

  if (response.timeSpent < 0) {
    errors.push('Time spent cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate BrowsingHistory
 */
export function validateBrowsingHistory(history: BrowsingHistory): ValidationResult {
  const errors: string[] = [];

  if (!history.id || history.id.trim().length === 0) {
    errors.push('History ID cannot be empty');
  }

  if (!isValidUrl(history.url)) {
    errors.push('Invalid URL');
  }

  if (!history.title || history.title.trim().length === 0) {
    errors.push('Title cannot be empty');
  }

  if (!isValidTimestamp(history.startTime)) {
    errors.push('Invalid start time');
  }

  if (!isValidTimestamp(history.endTime)) {
    errors.push('Invalid end time');
  }

  if (history.endTime < history.startTime) {
    errors.push('End time cannot be before start time');
  }

  if (history.duration < 0) {
    errors.push('Duration cannot be negative');
  }

  const classificationValidation = validateSiteClassification(history.classification);
  if (!classificationValidation.valid) {
    errors.push(...classificationValidation.errors.map(e => `Classification: ${e}`));
  }

  if (typeof history.wasProductive !== 'boolean') {
    errors.push('Was productive must be a boolean');
  }

  if (typeof history.interventionTriggered !== 'boolean') {
    errors.push('Intervention triggered must be a boolean');
  }

  if (typeof history.interventionCompleted !== 'boolean') {
    errors.push('Intervention completed must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate FeatureVector
 */
export function validateFeatureVector(features: FeatureVector): ValidationResult {
  const errors: string[] = [];

  if (!isValidHour(features.timeOfDay)) {
    errors.push('Invalid time of day (must be 0-23)');
  }

  if (!isValidDayOfWeek(features.dayOfWeek)) {
    errors.push('Invalid day of week (must be 0-6)');
  }

  if (features.recentProductiveMinutes < 0) {
    errors.push('Recent productive minutes cannot be negative');
  }

  if (!features.siteCategory || features.siteCategory.trim().length === 0) {
    errors.push('Site category cannot be empty');
  }

  if (!features.navigationPattern || features.navigationPattern.trim().length === 0) {
    errors.push('Navigation pattern cannot be empty');
  }

  if (features.sessionDuration < 0) {
    errors.push('Session duration cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate Prediction
 */
export function validatePrediction(prediction: Prediction): ValidationResult {
  const errors: string[] = [];

  if (typeof prediction.isDistraction !== 'boolean') {
    errors.push('Is distraction must be a boolean');
  }

  if (!isValidConfidence(prediction.confidence)) {
    errors.push('Confidence must be between 0 and 1');
  }

  const featuresValidation = validateFeatureVector(prediction.features);
  if (!featuresValidation.valid) {
    errors.push(...featuresValidation.errors.map(e => `Features: ${e}`));
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate DistractionAssessment
 */
export function validateDistractionAssessment(assessment: DistractionAssessment): ValidationResult {
  const errors: string[] = [];

  if (typeof assessment.isDistraction !== 'boolean') {
    errors.push('Is distraction must be a boolean');
  }

  if (!isValidConfidence(assessment.confidence)) {
    errors.push('Confidence must be between 0 and 1');
  }

  if (!assessment.reason || assessment.reason.trim().length === 0) {
    errors.push('Reason cannot be empty');
  }

  if (assessment.suggestedChallenge !== undefined) {
    const challengeValidation = validateMicroChallenge(assessment.suggestedChallenge);
    if (!challengeValidation.valid) {
      errors.push(...challengeValidation.errors.map(e => `Suggested challenge: ${e}`));
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Core type definitions for Digital Attention Rescue

export interface BrowsingContext {
  url: string;
  title: string;
  timestamp: number;
  timeOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  recentHistory: string[]; // Last 5 URLs
  sessionDuration: number; // Minutes in current session
  lastProductiveActivity: number; // Minutes since last productive activity
}

export interface ActivityEvent {
  url: string;
  timestamp: number;
  eventType: 'navigation' | 'focus' | 'blur' | 'scroll' | 'click';
  duration?: number;
  context: BrowsingContext;
}

export interface SiteClassification {
  url: string;
  category: 'productive' | 'distraction' | 'neutral' | 'custom';
  confidence: number;
  source: 'user' | 'ai' | 'default';
  customLabel?: string;
  lastUpdated: number;
}

export interface UserSettings {
  interventionFrequency: 'aggressive' | 'moderate' | 'minimal';
  quietHours: TimeRange[];
  whitelistedSites: string[];
  preferredChallenges: ChallengeType[];
  learningMode: boolean;
  notificationsEnabled: boolean;
  streakGoal: number;
}

export interface TimeRange {
  start: number; // Hour 0-23
  end: number; // Hour 0-23
}

export type ChallengeType = 'reflection' | 'intention' | 'quick-task' | 'breathing';

export interface MicroChallenge {
  id: string;
  type: ChallengeType;
  prompt: string;
  options?: string[];
  timeoutSeconds: number;
  difficulty: number;
}

export interface InterventionResponse {
  challengeId: string;
  completed: boolean;
  dismissed: boolean;
  response?: string;
  timeSpent: number;
}

export interface StreakData {
  current: number;
  longest: number;
  lastUpdate: number;
  multiplier: number;
}

export interface BrowsingHistory {
  id: string;
  url: string;
  title: string;
  startTime: number;
  endTime: number;
  duration: number;
  classification: SiteClassification;
  wasProductive: boolean;
  interventionTriggered: boolean;
  interventionCompleted: boolean;
}

export interface FeatureVector {
  timeOfDay: number;
  dayOfWeek: number;
  recentProductiveMinutes: number;
  siteCategory: string;
  navigationPattern: string;
  sessionDuration: number;
}

export interface Prediction {
  isDistraction: boolean;
  confidence: number;
  features: FeatureVector;
}

export interface DistractionAssessment {
  isDistraction: boolean;
  confidence: number;
  reason: string;
  suggestedChallenge?: MicroChallenge;
}

export interface UserProgress {
  level: number;
  totalPoints: number;
  pointsToNextLevel: number;
  achievements: Achievement[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

export interface DailyStatistics {
  date: Date;
  productiveMinutes: number;
  distractedMinutes: number;
  interventionsTriggered: number;
  interventionsCompleted: number;
  longestStreak: number;
  sitesVisited: number;
  topProductiveSites: string[];
  topDistractionSites: string[];
}
